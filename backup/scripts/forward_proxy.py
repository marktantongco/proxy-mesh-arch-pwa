#!/usr/bin/env python3
"""
🦉 OWL-AGENT Forward Proxy v1.0

Transparent forward proxy that OpenCode routes through via HTTP_PROXY.
Chains through UPSTREAM_PROXY (mihomo/9router on :7890) for geo-routing.

Chain:
  opencode / kiro / owl
      ↓ HTTP_PROXY=http://127.0.0.1:60000
  forward-proxy :60000  ← this server
      ↓ optional UPSTREAM_PROXY=http://127.0.0.1:7890
  mihomo / 9router (geo-routing)
      ↓
  API endpoints

Stats:  GET http://127.0.0.1:60000/_stats
Health: GET http://127.0.0.1:60000/_ping

Usage:
  # Direct (no upstream)
  python forward_proxy.py

  # Via mihomo
  UPSTREAM_PROXY=http://127.0.0.1:7890 python forward_proxy.py
"""

import asyncio
import base64
import json
import logging
import os
import signal
import ssl
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

import aiohttp
import proxy_defense_fixed_v3

# Global proxy rotator instance
rotator = proxy_defense_fixed_v3.ProxyRotator()
rotator_loaded = False
rotator_lock = asyncio.Lock()


# ── Config ──────────────────────────────────────────────────────────────────
HOST = os.environ.get("OWL_PROXY_HOST", "127.0.0.1")
PORT = int(os.environ.get("OWL_PROXY_PORT", "60000"))
UPSTREAM_PROXY = os.environ.get("UPSTREAM_PROXY", "")  # e.g. http://127.0.0.1:7890
CONNECT_TIMEOUT = int(os.environ.get("OWL_CONNECT_TIMEOUT", "15"))
MAX_BODY_BYTES = int(os.environ.get("OWL_MAX_BODY_BYTES", "10485760"))  # 10MB
PROXY_VERSION = "1.0.0"

logger = logging.getLogger("owl-forward-proxy")


@dataclass
class ProxyStats:
    requests: int = 0
    connects: int = 0
    errors: int = 0
    retries: int = 0
    bytes_proxied: int = 0
    start_time: float = field(default_factory=time.time)

    @property
    def uptime_s(self) -> float:
        return time.time() - self.start_time


stats = ProxyStats()


# ── Connection helpers ──────────────────────────────────────────────────────

async def connect_via_proxy_url(proxy_url: str, host: str, port: int) -> tuple[asyncio.StreamReader, asyncio.StreamWriter]:
    """Tunnel TCP connection through the specified proxy URL."""
    parsed = urlparse(proxy_url)
    proxy_host = parsed.hostname
    proxy_port = parsed.port or (443 if parsed.scheme == "https" else 80)
    
    up_reader, up_writer = await asyncio.wait_for(
        asyncio.open_connection(proxy_host, proxy_port),
        timeout=CONNECT_TIMEOUT,
    )
    try:
        auth_header = ""
        if parsed.username and parsed.password:
            auth = base64.b64encode(f"{parsed.username}:{parsed.password}".encode()).decode()
            auth_header = f"Proxy-Authorization: Basic {auth}\r\n"
        
        connect_req = f"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n{auth_header}\r\n"
        up_writer.write(connect_req.encode())
        await up_writer.drain()
        
        resp_line = await asyncio.wait_for(up_reader.readline(), timeout=CONNECT_TIMEOUT)
        while True:
            line = await asyncio.wait_for(up_reader.readline(), timeout=CONNECT_TIMEOUT)
            if line in (b"\r\n", b"\n", b""):
                break
                
        if "200" not in resp_line.decode():
            raise ConnectionError(f"Upstream proxy refused CONNECT: {resp_line.decode().strip()}")
            
        return up_reader, up_writer
    except Exception:
        try:
            up_writer.close()
        except Exception:
            pass
        raise

async def connect_upstream(host: str, port: int) -> tuple[asyncio.StreamReader, asyncio.StreamWriter]:
    """Open TCP connection to target, trying UPSTREAM_PROXY, rotating proxies, or direct fallback."""
    global rotator_loaded

    # Loopback and direct bypass destinations always connect directly — never route through upstream proxy
    _bypass = {"127.0.0.1", "::1", "localhost", "opencode.ai"}
    if host in _bypass or host.endswith(".nvidia.com") or host.endswith(".opencode.ai") or host.endswith(".amazonaws.com") or host.endswith(".kiro.dev"):
        return await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=CONNECT_TIMEOUT,
        )

    # 1. Try UPSTREAM_PROXY if explicitly configured
    if UPSTREAM_PROXY:
        try:
            logger.debug("Tunnel %s:%d via UPSTREAM_PROXY %s", host, port, UPSTREAM_PROXY)
            return await connect_via_proxy_url(UPSTREAM_PROXY, host, port)
        except Exception as e:
            logger.warning("UPSTREAM_PROXY connection failed: %s, falling back to direct connection", repr(e))
            return await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=CONNECT_TIMEOUT,
            )

    # 2. Try rotating proxies from rotator pool
    if not rotator_loaded:
        async with rotator_lock:
            if not rotator_loaded:
                connector = aiohttp.TCPConnector(force_close=True, limit=10)
                async with aiohttp.ClientSession(connector=connector) as session:
                    await rotator.load_all_sources(session)
                rotator_loaded = True

    tried_proxies = set()
    max_attempts = 3
    for attempt in range(max_attempts):
        proxy = await rotator.get_proxy()
        if not proxy or proxy.url in tried_proxies:
            break
        tried_proxies.add(proxy.url)
        
        try:
            logger.debug("Tunnel %s:%d via rotating proxy %s (attempt %d/%d)", host, port, proxy.url, attempt + 1, max_attempts)
            reader, writer = await connect_via_proxy_url(proxy.url, host, port)
            await rotator.mark_success(proxy)
            return reader, writer
        except Exception as e:
            await rotator.mark_banned(proxy)
            logger.warning("Rotating proxy failed (%s): %s, retrying", proxy.url, repr(e))

    # 3. Direct connection fallback
    logger.info("All proxies failed or exhausted, attempting direct connection to %s:%d...", host, port)
    return await asyncio.wait_for(
        asyncio.open_connection(host, port),
        timeout=CONNECT_TIMEOUT,
    )



async def relay(src_reader: asyncio.StreamReader, dst_writer: asyncio.StreamWriter,
                label: str = "", timeout: int = 600):
    """Bidirectional relay between two streams."""
    bytes_count = 0
    try:
        while True:
            data = await asyncio.wait_for(src_reader.read(65536), timeout=timeout)
            if not data:
                break
            dst_writer.write(data)
            await dst_writer.drain()
            bytes_count += len(data)
    except (asyncio.TimeoutError, ConnectionResetError, BrokenPipeError, OSError):
        pass
    finally:
        try:
            dst_writer.close()
        except Exception:
            pass
    return bytes_count


# ── Protocol handlers ───────────────────────────────────────────────────────

async def handle_http(reader: asyncio.StreamReader, writer: asyncio.StreamWriter,
                      method: str, url: str, headers: dict, body: bytes) -> None:
    """HTTP forward proxy — forward to target (optionally via upstream)."""
    stats.requests += 1
    logger.info("> %s %s", method, url)

    # Parse URL for host/port
    parsed = urlparse(url)
    target_host = parsed.hostname or "localhost"
    target_port = parsed.port or (443 if parsed.scheme == "https" else 80)
    path = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query

    try:
        # https:// absolute-form: use aiohttp to make the request (avoids asyncio socket reuse issues)
        if parsed.scheme == "https":
            is_bypass = target_host in {"127.0.0.1", "::1", "localhost", "opencode.ai"} or target_host.endswith(".nvidia.com") or target_host.endswith(".opencode.ai") or target_host.endswith(".amazonaws.com") or target_host.endswith(".kiro.dev")
            proxy_url = None if is_bypass else (UPSTREAM_PROXY or None)
            req_headers = {k: v for k, v in headers.items()
                           if k.lower() not in {"proxy-connection", "keep-alive", "proxy-authorization",
                                                 "proxy-authenticate", "te", "connection", "upgrade"}}
            req_headers["Host"] = f"{target_host}:{target_port}"
            connector = aiohttp.TCPConnector(ssl=ssl.create_default_context())
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.request(
                    method, url,
                    headers=req_headers,
                    data=body or None,
                    proxy=proxy_url,
                    allow_redirects=False,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    # Forward status line
                    writer.write(f"HTTP/1.1 {resp.status} {resp.reason}\r\n".encode())
                    # Forward headers (strip hop-by-hop)
                    hop_by_hop_resp = {"proxy-connection", "keep-alive", "transfer-encoding",
                                       "te", "connection", "proxy-authenticate", "upgrade"}
                    for k, v in resp.headers.items():
                        if k.lower() not in hop_by_hop_resp:
                            writer.write(f"{k}: {v}\r\n".encode())
                    writer.write(b"\r\n")
                    await writer.drain()
                    # Stream body
                    async for chunk in resp.content.iter_chunked(65536):
                        writer.write(chunk)
                        await writer.drain()
                        stats.bytes_proxied += len(chunk)
            return
        else:
            # Plain HTTP: connect via upstream proxy or direct
            target_reader, target_writer = await connect_upstream(target_host, target_port)

        # Reconstruct the request for the target
        request_line = f"{method} {path} HTTP/1.1\r\n"

        # Build headers (strip hop-by-hop)
        hop_by_hop = {"proxy-connection", "keep-alive", "transfer-encoding",
                       "te", "connection", "proxy-authorization", "upgrade",
                       "proxy-authenticate", "host"}
        header_lines = f"Host: {target_host}:{target_port}\r\n"
        for k, v in headers.items():
            if k.lower() not in hop_by_hop:
                header_lines += f"{k}: {v}\r\n"

        # Add Via header per RFC 7230 §5.7.1
        header_lines += f"Via: {PROXY_VERSION} owl-forward-proxy\r\n"

        # Send to target
        target_writer.write(request_line.encode())
        target_writer.write(header_lines.encode())
        target_writer.write(b"\r\n")
        if body:
            if len(body) > MAX_BODY_BYTES:
                raise ConnectionError(f"Request body exceeds limit ({len(body)} > {MAX_BODY_BYTES})")
            target_writer.write(body)
        await target_writer.drain()

        # Read response from target
        resp_line = await asyncio.wait_for(target_reader.readline(), timeout=30)
        if not resp_line:
            raise ConnectionError("Empty response from target")

        # Forward status line
        writer.write(resp_line)

        # Forward headers
        resp_headers = b""
        content_length = -1
        is_chunked = False
        while True:
            line = await asyncio.wait_for(target_reader.readline(), timeout=10)
            if line in (b"\r\n", b"\n", b""):
                break
            # Track content-length for body reading
            if line.lower().startswith(b"content-length:"):
                try:
                    content_length = int(line.split(b":", 1)[1].strip())
                except ValueError:
                    pass
            if line.lower().startswith(b"transfer-encoding:"):
                is_chunked = b"chunked" in line.lower()
            # Strip proxy-hop headers per RFC 7230 §6.1
            hop_by_hop_resp = {b"proxy-connection", b"keep-alive", b"transfer-encoding",
                                b"te", b"connection", b"proxy-authenticate", b"upgrade"}
            if line.lower().strip().split(b":", 1)[0].strip() in hop_by_hop_resp:
                continue
            resp_headers += line

        writer.write(resp_headers)
        writer.write(b"\r\n")
        await writer.drain()

        # Forward body based on Transfer-Encoding header, Content-Length, or read-until-close
        if content_length > 0:
            remaining = content_length
            while remaining > 0:
                chunk = await asyncio.wait_for(
                    target_reader.read(min(remaining, 65536)), timeout=30
                )
                if not chunk:
                    break
                writer.write(chunk)
                await writer.drain()
                remaining -= len(chunk)
                stats.bytes_proxied += len(chunk)
        elif is_chunked:
            # Pass through chunked encoding as-is (relay raw chunks)
            try:
                while True:
                    # Read chunk size line
                    chunk_size_line = await asyncio.wait_for(target_reader.readline(), timeout=30)
                    if not chunk_size_line:
                        break
                    writer.write(chunk_size_line)
                    try:
                        chunk_size = int(chunk_size_line.strip().split(b";")[0], 16)
                    except ValueError:
                        break
                    if chunk_size == 0:
                        # Read trailing CRLF + trailers
                        trailer = await asyncio.wait_for(target_reader.readline(), timeout=10)
                        writer.write(trailer)
                        await writer.drain()
                        break
                    # Read chunk data + trailing CRLF
                    chunk_data = await asyncio.wait_for(
                        target_reader.readexactly(chunk_size + 2), timeout=30
                    )
                    writer.write(chunk_data)
                    await writer.drain()
                    stats.bytes_proxied += len(chunk_size_line) + len(chunk_data)
            except (asyncio.IncompleteReadError, ConnectionResetError, BrokenPipeError):
                pass
        else:
            # No known length — read until connection closes
            try:
                while True:
                    chunk = await asyncio.wait_for(target_reader.read(65536), timeout=30)
                    if not chunk:
                        break
                    writer.write(chunk)
                    await writer.drain()
                    stats.bytes_proxied += len(chunk)
            except (ConnectionResetError, BrokenPipeError):
                pass

        await writer.drain()

    except Exception as e:
        stats.errors += 1
        stats.retries += 1
        logger.error("HTTP %s failed: %s", url, repr(e))
        try:
            writer.write(f"HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\nOWL-Proxy error: {repr(e)}\n".encode())
            await writer.drain()
        except Exception:
            pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def handle_connect(reader: asyncio.StreamReader, writer: asyncio.StreamWriter,
                         host_port: str) -> None:
    """HTTPS CONNECT tunnel — bi-directional relay (optionally via upstream)."""
    stats.connects += 1
    logger.info("> CONNECT %s", host_port)

    # Parse host:port
    if ":" in host_port:
        host, port_str = host_port.rsplit(":", 1)
        try:
            port = int(port_str)
        except ValueError:
            port = 443
    else:
        host = host_port
        port = 443

    try:
        # Connect to target (direct or via upstream proxy)
        target_reader, target_writer = await connect_upstream(host, port)

        # 200 Connection Established
        writer.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        await writer.drain()

        logger.info("= CONNECT %s:%d tunnel open", host, port)

        # Bidirectional relay
        bytes_up, bytes_down = await asyncio.gather(
            relay(reader, target_writer, "c2s"),
            relay(target_reader, writer, "s2c"),
        )
        stats.bytes_proxied += bytes_up + bytes_down
        logger.info("= CONNECT %s:%d tunnel closed (%d+%d bytes)", host, port, bytes_up, bytes_down)

    except Exception as e:
        stats.errors += 1
        stats.retries += 1
        logger.error("CONNECT %s:%d failed: %s", host, port, repr(e))
        try:
            writer.write(f"HTTP/1.1 502 Bad Gateway\r\n\r\nTunnel failed: {repr(e)}\r\n".encode())
            await writer.drain()
        except Exception:
            pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


# ── Management handlers ─────────────────────────────────────────────────────

async def handle_stats(writer: asyncio.StreamWriter):
    """Return proxy statistics as JSON."""
    uptime = time.time() - stats.start_time
    body = json.dumps({
        "status": "running",
        "proxy": f"http://{HOST}:{PORT}",
        "upstream_proxy": UPSTREAM_PROXY or "none",
        "requests": stats.requests,
        "connects": stats.connects,
        "errors": stats.errors,
        "retries": stats.retries,
        "bytes_proxied": stats.bytes_proxied,
        "uptime_s": round(uptime, 1),
        "uptime_str": f"{int(uptime // 3600)}h{int((uptime % 3600) // 60)}m{int(uptime % 60)}s",
    }, indent=2).encode()

    writer.write(b"HTTP/1.1 200 OK\r\n")
    writer.write(b"Content-Type: application/json\r\n")
    writer.write(f"Content-Length: {len(body)}\r\n".encode())
    writer.write(b"Access-Control-Allow-Origin: *\r\n")
    writer.write(b"\r\n")
    writer.write(body)
    await writer.drain()
    try:
        writer.close()
    except Exception:
        pass


async def handle_ping(writer: asyncio.StreamWriter):
    writer.write(b"HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\npong")
    await writer.drain()
    try:
        writer.close()
    except Exception:
        pass


async def handle_root(writer: asyncio.StreamWriter):
    """Return proxy info at /."""
    body = json.dumps({
        "service": "owl-forward-proxy",
        "version": PROXY_VERSION,
        "status": "running",
        "proxy": f"http://{HOST}:{PORT}",
        "docs": {
            "_stats": "Proxy statistics",
            "_ping": "Health check",
        },
        "upstream": UPSTREAM_PROXY or "none (direct)",
    }, indent=2).encode()
    writer.write(b"HTTP/1.1 200 OK\r\n")
    writer.write(b"Content-Type: application/json\r\n")
    writer.write(f"Content-Length: {len(body)}\r\n".encode())
    writer.write(b"\r\n")
    writer.write(body)
    await writer.drain()
    try:
        writer.close()
    except Exception:
        pass


# ── Connection router ───────────────────────────────────────────────────────

async def route_connection(client_reader: asyncio.StreamReader,
                           client_writer: asyncio.StreamWriter):
    """Read first line, dispatch to handler."""
    try:
        first_line = await asyncio.wait_for(client_reader.readline(), timeout=30)
        if not first_line:
            return

        line = first_line.decode("utf-8", errors="replace").strip()
        parts = line.split(" ", 2)
        if len(parts) < 2:
            return

        method = parts[0]
        path = parts[1]

        # Management / health endpoints
        if method == "GET":
            if path in ("/_stats", "/_ping", "/"):
                # Read remaining headers (discard)
                while True:
                    hdr = await asyncio.wait_for(client_reader.readline(), timeout=5)
                    if hdr in (b"\r\n", b"\n", b""):
                        break

                if path == "/_stats":
                    await handle_stats(client_writer)
                elif path == "/_ping":
                    await handle_ping(client_writer)
                else:
                    await handle_root(client_writer)
                return

        # Read headers
        headers = {}
        while True:
            line = await asyncio.wait_for(client_reader.readline(), timeout=10)
            if line in (b"\r\n", b"\n", b""):
                break
            decoded = line.decode("utf-8", errors="replace").strip()
            if ":" in decoded:
                k, v = decoded.split(":", 1)
                headers[k.strip().lower()] = v.strip()

        # Read body
        body = b""
        content_len = int(headers.get("content-length", 0))
        if content_len > 0:
            body = await asyncio.wait_for(client_reader.readexactly(content_len), timeout=30)

        if method == "CONNECT":
            await handle_connect(client_reader, client_writer, path)
        else:
            await handle_http(client_reader, client_writer, method, path, headers, body)

    except (asyncio.TimeoutError, ConnectionResetError, BrokenPipeError):
        pass
    except Exception as e:
        logger.warning("Route error: %s", e)
        try:
            client_writer.close()
        except Exception:
            pass


# ── Main ────────────────────────────────────────────────────────────────────

async def main():
    logging.basicConfig(
        level=os.environ.get("OWL_LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    server = await asyncio.start_server(
        route_connection, host=HOST, port=PORT,
    )

    logger.info("🦉 OWL-AGENT Forward Proxy")
    logger.info("   Listen:  %s:%d", HOST, PORT)
    logger.info("   Upstream: %s", UPSTREAM_PROXY or "none (direct)")
    logger.info("   Stats:   http://%s:%d/_stats", HOST, PORT)
    logger.info("   Health:  http://%s:%d/_ping", HOST, PORT)

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down.")
