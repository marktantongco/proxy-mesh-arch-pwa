# Proxy Mesh Architecture

> Hub-and-spoke proxy mesh: OWL Forward Proxy → Mihomo → Kirolink / Kiro Gateway → Anthropic API

An architectural reference documenting the currently-running proxy stack — a **hub-and-spoke mesh** that replaced the older linear-chain design. This repo contains the architecture docs, configuration backups, and an interactive PWA.

## Live Demo

- **Vercel:** https://proxy-mesh-arch-pwa-new.vercel.app
- **GitHub Pages:** https://marktantongco.github.io/proxy-mesh-arch-pwa/
- **Source:** https://github.com/marktantongco/proxy-mesh-arch-pwa

## Architecture

### The Shift: Linear Chain → Hub-and-Spoke Mesh

**Old (deprecated):** `App → Mihomo → CLIProxyAPI → Antigravity → Anthropic`
A single linear chain. One break anywhere kills the whole path.

**Current:** `App → OWL Forward Proxy (:60000) → Mihomo (:7890) → [Kirolink (:8080) | Kiro Gateway (:8333)]`
A hub-and-spoke mesh with:
- Single entry point (OWL Forward Proxy) with retry, rate-limit, proxy rotation
- Routing hub (Mihomo) with geo-aware rule engine
- Multiple AI backends (Kirolink, Kiro Gateway) for Anthropic access
- Auth backbone (Kiro Tokend) keeping OIDC tokens fresh

### Diagram

```
  +------------------------------------------------------------------+
  |                    APP / OPENCODE / SHELL                         |
  |            HTTP_PROXY=http://127.0.0.1:60000                      |
  +----------------------------+-------------------------------------+
                               |
                               v
  +------------------------------------------------------------------+
  |  LAYER 1: OWL FORWARD PROXY  (127.0.0.1:60000)                  |
  |  Entry point. Retry, rate-limit, proxy rotation, direct bypass.  |
  +----------------------------+-------------------------------------+
                               | upstream (optional)
                               v
  +------------------------------------------------------------------+
  |  LAYER 2: MIHOMO RULE ENGINE  (127.0.0.1:7890)                  |
  |  Geo-routing: CN -> DIRECT, AI -> proxy pool, rest -> global     |
  |  Rules: GEOSITE, DOMAIN-SUFFIX, GEOIP, MATCH                     |
  +------+---------------------+------------------+------------------+
         |                     |                  |
         v                     v                  v
  +------------+    +--------------------+   +--------------+
  |  DIRECT    |    |  PROXY POOL       |   |  PROXY POOL  |
  | (CN)       |    |  (Global/AI)      |   |  (China AI)  |
  +------------+    +--------+----------+   +--------------+
                             |
                +------------+------------+
                v                         v
  +------------------------+  +------------------------------+
  |  LAYER 3a: KIROLINK    |  |  LAYER 3b: KIRO GATEWAY      |
  |  :8080                 |  |  :8333                       |
  |  Anthropic API proxy   |  |  OpenAI-compatible API       |
  |  (CodeWhisperer token) |  |  (Kiro SSO / AWS Builder ID) |
  +----------+-------------+  +--------------+---------------+
             |                               |
             +----------+--------------------+
                        v
  +------------------------------------------+
  |  AUTH: KIRO TOKEND  (127.0.0.1:48321)    |
  |  OIDC token refresh daemon               |
  |  Keeps AWS SSO tokens alive              |
  +------------------------------------------+
                        |
                        v
  +------------------------------------------+
  |  ANTHROPIC API  (api.anthropic.com)      |
  |  Claude Opus / Sonnet / Haiku models     |
  +------------------------------------------+
```

## Components

### Layer 0: Kiro Tokend `:48321` — Auth Backbone

| Property | Value |
|----------|-------|
| **Port** | 48321 |
| **Service** | `kiro-tokend.service` |
| **Binary** | `~/.local/share/kiro-tokend/dist/main.js` (Node.js) |
| **Memory** | ~3MB |
| **Endpoints** | `/token`, `/refresh`, `/health`, `/info` |
| **Role** | OIDC token refresh daemon. Keeps AWS SSO (CodeWhisperer/Kiro) tokens fresh so downstream proxies never hit auth expiry. Refreshes before expiry, serves tokens via HTTP. |

### Layer 1: OWL Forward Proxy `:60000` — Entry Point

| Property | Value |
|----------|-------|
| **Port** | 60000 |
| **Service** | `owl-forward-proxy.service` |
| **Binary** | `~/.owl-agent/forward_proxy.py` (Python/aiohttp) |
| **Memory** | ~6MB |
| **Endpoints** | `/_stats`, `/_ping`, `/`, any HTTP/CONNECT |
| **Upstream** | Mihomo on `:7890` (configurable via `UPSTREAM_PROXY` env) |
| **Role** | Transparent forward proxy. Single `HTTP_PROXY` target for all shell traffic. Adds retry logic, rate-limiting, connection defense, and proxy rotation. |

**Key behaviors:**
- **Direct bypass** — `.nvidia.com`, `.opencode.ai`, `.amazonaws.com`, `.kiro.dev` connect directly (no upstream)
- **Rotating proxy pool** — loads proxy sources on demand, tries up to 3 distinct proxies per request, marks failures as banned
- **Stats** — `GET /_stats` returns JSON with request counts, uptime, error rates
- **Health** — `GET /_ping` returns `pong`
- **Hop-by-hop stripping** — RFC 7230 compliant header cleanup

### Layer 2: Mihomo `:7890` — Routing Hub

| Property | Value |
|----------|-------|
| **Port** | 7890 (mixed/SOCKS5), 9090 (API), 1053 (DNS) |
| **Process** | `mihomo -d ~/.config/combined-proxy` |
| **Memory** | ~7MB |
| **Config** | `~/.config/combined-proxy/mihomo.yaml` |
| **Role** | Geo-rule engine. Intelligent routing of all system traffic. |

**Proxy Groups:**

| Group | Type | Purpose |
|-------|------|---------|
| `🌍 Global` | Select | Catch-all international traffic |
| `🤖 AI Services` | Select | AI provider traffic → proxy pool |
| `🚀 Auto-Select` | URL-test | Auto-picks fastest proxy (300s interval, 50ms tolerance) |
| `🇨🇳 China AI` | Select | Chinese AI providers (DeepSeek, Kimi, etc.) |
| `🎵 Spotify` | Select | Music streaming traffic |
| `🛑 Block` | Select | Blocked services (TikTok) |

**Rule Priority:**
1. **GEOSITE** — Fast trie match against site categories (anthropic, openai, cn, spotify, tiktok)
2. **DOMAIN-SUFFIX** — Manual overrides for ~25 AI providers
3. **GEOIP** — Domestic traffic (CN, private) → DIRECT
4. **MATCH** — Catch-all → Global proxy

### Layer 3a: Kirolink `:8080` — Anthropic API Proxy

| Property | Value |
|----------|-------|
| **Port** | 8080 |
| **Service** | `kirolink.service` |
| **Binary** | `kirolink` (Go binary) |
| **Memory** | ~0.5MB |
| **Endpoints** | `POST /v1/messages`, `GET /v1/models`, `GET /health` |
| **Role** | Drop-in Anthropic API proxy. Uses CodeWhisperer/Kiro auth to access Claude models. |

**Available models:**
claude-opus-4-6, claude-3-7-sonnet-20250219, claude-4-sonnet, claude-4-haiku, claude-4-opus, claude-sonnet-4-6, claude-haiku-4-5, claude-sonnet-4-5, and more.

### Layer 3b: Kiro Gateway `:8333` — OpenAI-Compatible Gateway

| Property | Value |
|----------|-------|
| **Port** | 8333 |
| **Service** | `kiro-gateway.service` |
| **Binary** | Python (Uvicorn, `kiro-gateway` fork) |
| **Memory** | ~5MB |
| **Auth** | Requires Bearer token (Kiro/CodeWhisperer SSO) |
| **Role** | OpenAI-compatible API gateway. Translates Kiro IDE/CLI auth into standard API. 13 cached models. |

**Dependencies:** Binds to `kiro-tokend.service` — starts after tokend is ready.

## Traffic Flow

### AI API Request (e.g., `api.anthropic.com`)

```
1. App sets HTTP_PROXY=http://127.0.0.1:60000
2. Request hits OWL Forward Proxy (:60000)
3. OWL checks bypass list (not bypassed → forwards to upstream)
4. Upstream: Mihomo (:7890)
5. Mihomo matches GEOSITE,anthropic → 🤖 AI Services proxy group
6. Proxy pool → Kirolink (:8080) or direct to Anthropic
7. Kirolink injects Bearer token (from CodeWhisperer/Kiro auth)
8. Response flows back through the chain
```

### Direct Bypass (nvidia.com, opencode.ai, amazonaws.com, kiro.dev)

```
1. App hits OWL Forward Proxy (:60000)
2. OWL checks bypass list → matched
3. OWL connects DIRECT (no upstream)
4. Response flows back directly
```

### China Traffic (geosite:cn)

```
1. Request hits OWL (:60000) → Mihomo (:7890)
2. Mihomo matches GEOSITE,cn → DIRECT
3. No proxy involved
```

## Installation & Setup

### Prerequisites

- Ubuntu/Debian Linux (tested on 24.04)
- Python 3.10+
- Node.js 20+
- Go (for kirolink)
- AWS Builder ID (for Kiro auth)

### 1. Kiro Tokend (Auth)

```bash
# Install from kiro-tokend repo
systemctl --user enable --now kiro-tokend.service
# Verify
curl http://127.0.0.1:48321/health
```

### 2. OWL Forward Proxy

```bash
# Service already set up at ~/.owl-agent/forward_proxy.py
systemctl --user enable --now owl-forward-proxy.service
# Verify
curl http://127.0.0.1:60000/_ping
```

### 3. Mihomo

```bash
# Binary at /usr/local/bin/mihomo
# Config at ~/.config/combined-proxy/mihomo.yaml
# Run via systemd or directly
/usr/local/bin/mihomo -d ~/.config/combined-proxy -f ~/.config/combined-proxy/mihomo.yaml
```

### 4. Kirolink

```bash
# Binary at ~/Documents/proxy/kirolink/kirolink
systemctl --user enable --now kirolink.service
# Verify
curl http://127.0.0.1:8080/v1/models
```

### 5. Kiro Gateway

```bash
# Python project at ~/Documents/proxy/kiro-gateway
systemctl --user enable --now kiro-gateway.service
# Verify
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8333/v1/models
```

## Configuration Reference

### OWL Forward Proxy (env vars)

| Env Var | Default | Description |
|---------|---------|-------------|
| `OWL_PROXY_HOST` | `127.0.0.1` | Bind address |
| `OWL_PROXY_PORT` | `60000` | Listen port |
| `UPSTREAM_PROXY` | (none) | Upstream proxy URL (e.g., `http://127.0.0.1:7890`) |
| `OWL_CONNECT_TIMEOUT` | `15` | Connection timeout (seconds) |
| `OWL_MAX_BODY_BYTES` | `10485760` | Max request body (10MB) |
| `OWL_LOG_LEVEL` | `INFO` | Logging verbosity |

### Mihomo Rules & Groups

See the full config at `backup/config/combined-proxy/mihomo.yaml`. Key structure:

```yaml
mixed-port: 7890
mode: rule
proxy-providers:
  filtered_nodes:  # External proxy nodes with health checks
proxy-groups:
  - 🤖 AI Services  # AI traffic
  - 🌍 Global       # Catch-all
  - 🇨🇳 China AI     # Chinese AI providers
rules:
  - GEOSITE,anthropic,🤖 AI Services
  - GEOSITE,cn,DIRECT
  - MATCH,🌍 Global
```

## Operations

### Health Checks

```bash
# OWL Forward Proxy
curl http://127.0.0.1:60000/_ping     # → pong
curl http://127.0.0.1:60000/_stats    # → JSON stats

# Mihomo
curl http://127.0.0.1:9090            # External controller

# Kirolink
curl http://127.0.0.1:8080/health     # → OK
curl http://127.0.0.1:8080/v1/models  # → model list

# Kiro Gateway
curl http://127.0.0.1:8333/health     # → healthy JSON

# Kiro Tokend
curl http://127.0.0.1:48321/health    # → status JSON
```

### Logs

```bash
journalctl --user -u owl-forward-proxy -f
journalctl --user -u kirolink -f
journalctl --user -u kiro-gateway -f
journalctl --user -u kiro-tokend -f
```

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `curl` hangs | Mihomo not running | `systemctl --user start mihomo` |
| 401 from Kirolink | Token expired | `kiro-cli auth login` |
| 502 from Gateway | Kiro Tokend not running | `systemctl --user start kiro-tokend` |
| Slow AI requests | Proxy pool stale | Wait for health check cycle (5 min) |
| SSL errors | OWL bypass list missing domain | Add to bypass set in `forward_proxy.py` |

## Systemd Service Units

| Service | Port | Depends On |
|---------|------|------------|
| `kiro-tokend.service` | 48321 | network-online.target |
| `owl-forward-proxy.service` | 60000 | network.target |
| `kirolink.service` | 8080 | network.target |
| `kiro-gateway.service` | 8333 | kiro-tokend.service |

All services use `Restart=on-failure` for self-healing.

## Evolution: From Linear Chain to Hub-and-Spoke

### What Changed

| Aspect | Old Stack (Deprecated) | Current Stack |
|--------|----------------------|---------------|
| **Entry** | Mihomo only | OWL Forward Proxy + Mihomo |
| **AI Backend** | CLIProxyAPI → Antigravity | Kirolink + Kiro Gateway |
| **Auth** | Google OAuth (Antigravity) | AWS SSO / CodeWhisperer (Kiro) |
| **Architecture** | Linear chain | Hub-and-spoke mesh |
| **Memory** | ~45MB | ~15MB |
| **Fallback** | None | Auto-retry + proxy rotation |
| **Bypass** | None | Domain-based direct connect |

### Deprecated Components

- **CLIProxyAPI** — Replaced by kiro-gateway + kirolink
- **Antigravity** — Replaced by Kiro-based auth proxy
- **9Router** — Podman-based router, no longer active

## Related Repositories

| Repo | Focus | Difference |
|------|-------|------------|
| [`proxy-mesh-arch-pwa`](https://github.com/marktantongco/proxy-mesh-arch-pwa) (this) | Architecture docs & PWA | **You are here.** Reference docs, not installers. |
| [`kiro-proxy-ecosystem`](https://github.com/marktantongco/kiro-proxy-ecosystem) | Operational ecosystem | Installers, scripts, MCP bridge, systemd units |
| [`antigravity-proxy-stack`](https://github.com/marktantongco/antigravity-proxy-stack) | Old Antigravity stack | Legacy — superseded by this architecture |

## License

MIT
