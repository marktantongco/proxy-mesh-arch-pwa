# Agent Proxy Stack — Research Report & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade Tiered Router + Credential Mesh hybrid by wrapping `jwadow/kiro-gateway` with a zero-dependency credential rotation and free-tier fallback orchestrator.

**Architecture:** Lightweight Node.js reverse proxy (wrapper pattern) sits in front of kiro-gateway, fetches rotating tokens from a vault, routes to free tier (Ollama/Gemini) when paid tokens are exhausted, and intercepts 401/403 responses to auto-rotate credentials.

**Tech Stack:** Node.js 20+ (native `http` module, zero deps), kiro-gateway (Python/Docker), Ollama (local fallback), HashiCorp Vault or file-based token store.

---

## 📊 VERIFIED REPO ECOSYSTEM ANALYSIS

Research conducted 2026-06-01 via GitHub API. Repos verified as existing (200 OK) or non-existent (not found).

### Active Repos (push ≤30 days)

| Repo | Stars | Last Push | Language | License | Description |
|------|-------|-----------|----------|---------|-------------|
| `justlovemaki/AIClient2API` | 8,096⭐ | May 30 (2d) | JavaScript | GPL-3.0 | Gemini CLI, Antigravity, Codex, Grok, Kiro → OpenAI-compatible API. **Massive project.** |
| `romgX/openrelay` | 2,162⭐ | May 15 (17d) | TypeScript | MIT | Hundreds of free AI model quotas, one-click access. |
| `jwadow/kiro-gateway` | 1,853⭐ | May 18 (14d) | Python | AGPL-3.0 | **Reference implementation.** Proxy API gateway for Kiro IDE/CLI. Our foundation. |
| `rynfar/meridian` | 1,354⭐ | May 29 (3d) | TypeScript | None | Claude Max subscription proxy for OpenCode, Pi, Droid, Aider, Crush, Cline. |
| `huey1in/KiroX` | 455⭐ | May 30 (2d) | Go | Other | Kiro protocol registration + batch account creation tool (AWS Builder ID). |
| `petehsu/KiroProxy` | 377⭐ | May 11 (21d) | Python | None | Kiro compatibility/routing layer for developer workflows. |
| `hnewcity/KiroaaS` | 115⭐ | Jun 1 (today) | Python | AGPL-3.0 | Kiro as a Service — expose Kiro models via standard APIs. |
| `mxyhi/token_proxy` | 70⭐ | May 31 (1d) | Rust | Apache-2.0 | **Best token rotation candidate.** Local AI API gateway with SQLite token counting, priority-based load balancing. |

### Stale Repos (push 31-180 days)

| Repo | Stars | Last Push | Language | License | Description |
|------|-------|-----------|----------|---------|-------------|
| `aliom-v/KiroGate` | 416⭐ | Feb 15 (3.5mo) | Python/TS | AGPL-3.0 | OpenAI & Anthropic compatible Kiro API proxy. TypeScript/Deno variant. |
| `ssmDo/CodeFreeMax` | 182⭐ | Mar 22 (2.5mo) | Shell | None | Kiro/Antigravity/Warp/Grok → OpenAI/Claude/Augment converter. |
| `clawfleet/ClawFleet` | 157⭐ | Apr 27 (35d) | Go | MIT | Fleet manager for OpenClaw/Hermes agents. Browser dashboard. |
| `kkddytd/claude-api` | 134⭐ | Mar 16 (2.5mo) | Go | None | Kiro account pool manager with auto-registration, OIDC, token refresh, web console. |
| `zhongruan0522/AntiHub-ALL` | 420⭐ | Mar 20 (2.5mo) | Python | AGPL-3.0 | **ARCHIVED.** Multi-model subscription platform. No longer maintained. |
| `vinzabe/opencode-anthropic-max-fix` | 6⭐ | Apr 25 (37d) | JavaScript | None | Small fix script for OpenCode 429 errors. Pins auth package + billing headers. |
| `iamtheavoc1/opencode-anthropic-auth-fix` | 7⭐ | Apr 28 (34d) | Shell | MIT | One-command OpenCode fix for Anthropic billing. Patches auth recovery. |

### Minor / Forks

| Repo | Stars | Last Push | Notes |
|------|-------|-----------|-------|
| `bigdata2211it-web/kiro-proxy` | 5⭐ | May 11 | Node.js Kiro proxy, simple |
| `Arui08/kiro-api-proxy` | 6⭐ | May 15 | Node.js multi-account + web UI |
| `hoazgazh/aigate` | 2⭐ | Apr 7 | Go single-binary AI gateway (Kiwi-sized) |
| `meitianwang/kiro-gateway-swift` | 1⭐ | Mar 22 | Swift/native macOS app wrapper |
| `mub7865/kiro-openai-gateway` | 0⭐ | Mar 13 | Empty/minimal fork |
| `cornelcroi/ask-james` | 1⭐ | Jan 4 | MCP server for multi-LLM critique |
| `ryangui1983/uniplug` | 0⭐ | Apr 29 | Multi-provider proxy (Copilot, Kiro, DeepSeek, Ollama) |

### Repos NOT FOUND (from original list — do not exist)

The following repos from the original ecosystem analysis could not be verified via GitHub API (404/not found):

- `avaclaw1/hermes-billing-proxy`
- `o-shabashov/hermes-anthropic-patch`
- `enochosbot-bot/hermes-backdoor`
- `zacdcook/openclaw-billing-proxy`
- `sontakey/openclaw-billing-proxy`
- `nmarijane/claude-max-proxy` (×2)
- `Kazuki-0147/openclaw-billing-proxy`
- `vitalemazo/openclaw-billing-proxy`
- `marktantongco/kiro-proxy-ecosystem`
- `marktantongco/ruflo`

⚠️ **Implication**: Roughly 1/3 of the original 33 repos either never existed, were deleted, or were renamed. The real ecosystem is dominated by 3-4 large repos (AIClient2API, openrelay, kiro-gateway, meridian) and ~15 smaller satellites.

### Compatibility Matrix

| Component | kiro-gateway | token_proxy | meridian | openrelay | AIClient2API |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **kiro-gateway** | — | ✅ Full | ✅ Full | ✅ Partial | ✅ Partial |
| **token_proxy** | ✅ Full | — | ✅ Full | ⚠️ Redundant routing | ⚠️ Conflicting auth |
| **meridian** | ✅ Full | ✅ Full | — | ✅ Partial | ✅ Partial |
| **openrelay** | ⚠️ Partial | ⚠️ Redundant | ⚠️ Partial | — | ✅ Full |
| **AIClient2API** | ⚠️ Partial | ⚠️ Conflicting | ⚠️ Partial | ✅ Full | — |

---

## Context

### Problem

The AI proxy ecosystem has exploded to 25+ repos, but none solve the core billing resilience problem: **what happens when your single Claude Pro/Max token gets rate-limited or hits its quota?** Each repo assumes a single credential source. The Tiered Router + Credential Mesh hybrid solves this by:
1. Wrapping `kiro-gateway` with a credential rotation layer
2. Falling back to free tiers (Ollama, Gemini) when paid tokens are exhausted
3. Intercepting HTTP 401/403 to auto-rotate without manual intervention

### Assumptions

- **A1**: `jwadow/kiro-gateway` continues to be maintained and accepts standard `Authorization: Bearer` headers. If it switches auth methods, the wrapper's header injection must be updated.
- **A2**: A local Ollama instance or Gemini API key is available as a free-tier fallback. If neither exists, the orchestrator degrades to paid-only mode (no fallback).
- **A3**: Token rotation (switching between multiple Claude Pro/Max accounts) stays within Anthropic's ToS. If Anthropic bans account rotation, this approach must become a pure free-tier router.
- **A4**: Node.js 20+ is available. The orchestrator uses native `http.fetch` and `http.createServer` with zero npm dependencies.
- **A5**: Using crontab/systemd timers for token refresh is acceptable. No complex scheduler needed.

---

## Constraints

### Time
- Finish MVP within 4 hours (one session).

### Resources
- Available: Node.js 20+, Docker, Ollama (optional), HashiCorp Vault or flat file for token storage.
- NOT available: Paid cloud credits, npm supply chain (zero deps required).

### Technical
- Zero npm dependencies. Use only Node.js built-in `http`, `fetch`, `fs`, `crypto` modules.
- kiro-gateway runs in Docker container, accessible on localhost:8787 (default).
- Orchestrator runs on PORT 3000.
- All configuration via environment variables (`KIRO_GATEWAY_URL`, `OLLAMA_FALLBACK_URL`, `TOKEN_FILE`, `ROTATION_INTERVAL`).

### Quality
- Every step has a binary done condition (test passes, Docker starts, curl returns 200).
- Error paths tested: vault down → free tier fallback, token expired → auto-rotation, kiro down → 502.

### Dependencies
- Docker for kiro-gateway container
- Node.js 20+ runtime
- Git for version control

### Exclusions
- NOT building a GUI/dashboard (this is a CLI/Docker service)
- NOT forking kiro-gateway (wrapper pattern only)
- NOT implementing provider SDK integration (pure HTTP proxy)

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|-----------|
| kiro-gateway changes auth header format | Low | High | Wrapper logs raw headers on 401; fix is a config change |
| Anthropic bans token rotation | Medium | High | Remove rotation logic, keep free-tier fallback |
| Vault goes down during rotation | Medium | Medium | Cache last valid token; failover to free tier |
| Ollama not installed | High | Low | Orchestrator detects and disables free-tier routing |
| Node.js 20+ not available | Low | High | Fallback to Dockerized orchestrator (next iteration) |

---

## Steps

### Step 0: Repo Research & Validation

**Goal:** Confirm the upstream repo works before building on top of it.

- [ ] **0.1: Pull and run kiro-gateway**
    - Owner: You
    - Input: Docker installed, AWS Builder ID configured
    - Output: Running kiro-gateway on localhost:8787
    - Done: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/v1/models` returns 200 or 401 (expected without auth)
    - Est: 10 min

- [ ] **0.2: Verify kiro-gateway accepts Bearer auth**
    - Owner: You
    - Input: Running kiro-gateway, a valid Kiro token
    - Output: Confirmed auth header format
    - Done: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8787/v1/models` returns 200 with model list
    - Est: 5 min

- [ ] **0.3: Confirm token_proxy functionality (optional)**
    - Owner: You
    - Input: token_proxy source, Rust toolchain (optional)
    - Output: Understanding of token_proxy's SQLite token counting approach
    - Done: README reviewed, architectural notes taken
    - Est: 10 min

### Step 1: Wrapper Orchestrator — Vault Token Fetching

**Goal:** Fetch tokens from a configurable source (env var, file, or Vault) and cache them with TTL.

- [ ] **1.1: Create project directory and entry point**
    - Owner: You
    - Input: `mkdir -p ~/mesh-orchestrator`
    - Output: `~/mesh-orchestrator/orchestrator.mjs`
    - Done: File exists and is executable
    - Est: 2 min

- [ ] **1.2: Implement token provider module**
    - Owner: You
    - Input: Environment variables `TOKEN_FILE`, `VAULT_ENDPOINT`, `VAULT_TOKEN`
    - Output: `~/mesh-orchestrator/token-provider.mjs`
    - Done: Module exports `getToken()` and `rotateToken()` functions
    - Est: 15 min

    ```javascript
    // token-provider.mjs
    import { readFileSync, writeFileSync } from 'fs';

    const TOKEN_FILE = process.env.TOKEN_FILE || './tokens.json';
    let cache = { value: null, expiresAt: 0 };

    function loadTokens() {
      try {
        const raw = readFileSync(TOKEN_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch { return { tokens: [], current: 0 }; }
    }

    function saveTokens(data) {
      writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
    }

    export async function getToken() {
      if (Date.now() < cache.expiresAt - 60000) return cache.value;

      const state = loadTokens();
      if (!state.tokens.length) return null;

      const token = state.tokens[state.current];
      cache = { value: token, expiresAt: Date.now() + 300000 }; // 5 min TTL
      return token;
    }

    export async function rotateToken() {
      const state = loadTokens();
      state.current = (state.current + 1) % state.tokens.length;
      saveTokens(state);
      cache.expiresAt = 0; // force re-read
      console.log(`[ROTATE] Switched to token index ${state.current}`);
    }
    ```

- [ ] **1.3: Test token provider standalone**
    - Owner: You
    - Input: `tokens.json` with `{"tokens": ["tok1", "tok2"], "current": 0}`
    - Output: Console log of token values
    - Done: `node --experimental-vm-modules -e "import {getToken, rotateToken} from './token-provider.mjs'; console.log(await getToken())"` prints "tok1"
    - Est: 5 min

### Step 2: Wrapper Orchestrator — HTTP Proxy Core

**Goal:** Implement the reverse proxy with credential injection and 401/403 interception.

- [ ] **2.1: Implement the proxy server**
    - Owner: You
    - Input: token-provider.mjs from Step 1
    - Output: `~/mesh-orchestrator/orchestrator.mjs`
    - Done: Server starts on PORT, proxies requests, injects Bearer token
    - Est: 20 min

    ```javascript
    // orchestrator.mjs
    import http from 'http';
    import { getToken, rotateToken } from './token-provider.mjs';

    const KIRO_URL = new URL(process.env.KIRO_GATEWAY_URL || 'http://localhost:8787');
    const FALLBACK_URL = process.env.FALLBACK_URL || null; // e.g. Ollama
    const PORT = parseInt(process.env.PORT || '3000');

    async function proxyRequest(req, targetUrl, token) {
      return new Promise((resolve, reject) => {
        const opts = {
          hostname: targetUrl.hostname,
          port: targetUrl.port,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: targetUrl.host },
        };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;

        const proxy = http.request(opts, (proxyRes) => {
          // Intercept 401/403 before responding to client
          if ((proxyRes.statusCode === 401 || proxyRes.statusCode === 403) && token) {
            console.warn(`[PROXY] Token rejected (${proxyRes.statusCode}). Rotating...`);
            rotateToken().then(() => {
              // Client will retry; return the error for now
              resolve({ status: proxyRes.statusCode, headers: proxyRes.headers, body: null, rotated: true });
            }).catch(reject);
          } else {
            resolve({ status: proxyRes.statusCode, headers: proxyRes.headers, stream: proxyRes, rotated: false });
          }
        });
        proxy.on('error', reject);
        req.pipe(proxy);
      });
    }

    const server = http.createServer(async (req, res) => {
      const token = await getToken();

      if (!token && FALLBACK_URL) {
        console.log('[ROUTE] No token available, routing to free tier');
        const fbUrl = new URL(FALLBACK_URL);
        const result = await proxyRequest(req, fbUrl, null);
        if (result.stream) {
          res.writeHead(result.status, result.headers);
          result.stream.pipe(res);
        } else {
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No valid token and fallback failed' }));
        }
        return;
      }

      const result = await proxyRequest(req, KIRO_URL, token);
      if (result.stream) {
        res.writeHead(result.status, result.headers);
        result.stream.pipe(res);
      } else {
        // Token was rejected and rotated; tell client to retry
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
        res.end(JSON.stringify({ error: 'Token rotated, please retry' }));
      }
    });

    server.listen(PORT, () => {
      console.log(`[ORCHESTRATOR] Mesh proxy on :${PORT}`);
      console.log(`[ORCHESTRATOR] Upstream: ${KIRO_URL.hostname}`);
      if (FALLBACK_URL) console.log(`[ORCHESTRATOR] Fallback: ${FALLBACK_URL}`);
    });
    ```

- [ ] **2.2: Test proxy starts and responds**
    - Owner: You
    - Input: orchestrator.mjs, kiro-gateway running
    - Output: Server starts
    - Done: `node orchestrator.mjs` prints "[ORCHESTRATOR] Mesh proxy on :3000"
    - Est: 3 min

- [ ] **2.3: Test 401 interception**
    - Owner: You
    - Input: orchestrator running, tokens.json with a known-bad token
    - Output: Console shows "[PROXY] Token rejected (401). Rotating..."
    - Done: `curl http://localhost:3000/v1/models -H "Content-Type: application/json"` returns 429 with rotation notice
    - Est: 5 min

### Step 3: Free-Tier Fallback Routing

**Goal:** Route to Ollama (or another free tier) when all tokens are exhausted.

- [ ] **3.1: Add Ollama fallback detection**
    - Owner: You
    - Input: orchestrator.mjs from Step 2
    - Output: Modified orchestrator with health-checked fallback
    - Done: Server detects Ollama at startup and logs "[ORCHESTRATOR] Fallback available: http://localhost:11434"
    - Est: 10 min

    ```javascript
    // Add to orchestrator.mjs after imports
    async function checkFallback(url) {
      if (!url) return false;
      try {
        const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
      } catch { return false; }
    }

    // Add after server.listen
    const fallbackAvailable = await checkFallback(FALLBACK_URL);
    if (FALLBACK_URL && !fallbackAvailable) {
      console.warn('[WARN] Fallback URL configured but unreachable. Disabling fallback.');
    }
    ```

- [ ] **3.2: Test fallback routing**
    - Owner: You
    - Input: orchestrator running, tokens.json with empty array, Ollama running
    - Output: Requests routed to Ollama
    - Done: `curl http://localhost:3000/api/generate -d '{"model":"llama2","prompt":"hi"}'` returns Ollama response
    - Est: 5 min

### Step 4: Token Rotation — Crontab Scheduler

**Goal:** Automatically rotate tokens on a timer, not just on error.

- [ ] **4.1: Add health-check based rotation**
    - Owner: You
    - Input: orchestrator.mjs
    - Output: Module that proactively rotates tokens every N minutes
    - Done: Every rotation interval, logs "[HEALTH] Token still valid" or "[HEALTH] Token expired, rotating"
    - Est: 10 min

    ```javascript
    // Add to orchestrator.mjs
    const ROTATION_INTERVAL = parseInt(process.env.ROTATION_INTERVAL || '300000'); // 5 min

    async function healthCheck() {
      const token = await getToken();
      if (!token) { console.log('[HEALTH] No tokens available'); return; }

      try {
        const res = await fetch(`${KIRO_URL}/v1/models`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(5000)
        });
        if (res.status === 401) {
          console.log('[HEALTH] Token expired, rotating');
          await rotateToken();
        } else {
          console.log('[HEALTH] Token valid');
        }
      } catch (err) {
        console.log('[HEALTH] Check failed:', err.message);
      }
    }

    // Call periodically
    setInterval(healthCheck, ROTATION_INTERVAL);
    ```

- [ ] **4.2: Test rotation timer**
    - Owner: You
    - Input: orchestrator running, tokens.json with 2 tokens (1 bad, 1 good)
    - Output: After rotation interval, token switches to good one
    - Done: Check server logs — "[HEALTH] Token expired, rotating" followed by successful proxied request
    - Est: 5 min (set ROTATION_INTERVAL to 10000 for quick test)

### Step 5: Docker Compose Stack

**Goal:** One-command deployment of the full stack.

- [ ] **5.1: Create docker-compose.yml**
    - Owner: You
    - Input: Docker installed
    - Output: `~/mesh-orchestrator/docker-compose.yml`
    - Done: `docker compose up -d` starts orchestrator + kiro-gateway
    - Est: 15 min

    ```yaml
    # docker-compose.yml
    version: '3.8'
    services:
      orchestrator:
        build: .
        ports:
          - "3000:3000"
        environment:
          KIRO_GATEWAY_URL: http://kiro-gateway:8787
          FALLBACK_URL: http://ollama:11434
          TOKEN_FILE: /data/tokens.json
          ROTATION_INTERVAL: 300000
        volumes:
          - ./data:/data
        depends_on:
          - kiro-gateway
        restart: unless-stopped

      kiro-gateway:
        image: jwadow/kiro-gateway:latest
        ports:
          - "8787:8787"
        environment:
          - KIRO_REGION=us-east-1
        restart: unless-stopped

      ollama:
        image: ollama/ollama:latest
        ports:
          - "11434:11434"
        volumes:
          - ollama-data:/root/.ollama
        restart: unless-stopped
        profiles:
          - with-fallback

    volumes:
      ollama-data:
    ```

- [ ] **5.2: Create Dockerfile**
    - Owner: You
    - Input: Node.js 20+ base
    - Output: `~/mesh-orchestrator/Dockerfile`
    - Done: `docker build -t mesh-orchestrator .` succeeds
    - Est: 5 min

    ```dockerfile
    FROM node:20-alpine
    WORKDIR /app
    COPY *.mjs ./
    RUN mkdir -p /data
    EXPOSE 3000
    CMD ["node", "orchestrator.mjs"]
    ```

- [ ] **5.3: Test compose stack**
    - Owner: You
    - Input: docker-compose.yml, Dockerfile
    - Output: All 3 services start
    - Done: `docker compose up -d` then `curl http://localhost:3000/v1/models` returns a response (even if 401)
    - Est: 10 min

### Step 6: Observability & Hardening

- [ ] **6.1: Add Prometheus metrics endpoint**
    - Owner: You
    - Input: orchestrator.mjs
    - Output: `GET /metrics` returns token count, rotation count, fallback hits
    - Done: `curl http://localhost:3000/metrics` returns Prometheus-formatted text
    - Est: 15 min

    ```javascript
    // Metrics state (add at top of orchestrator.mjs)
    const metrics = {
      requests_total: 0,
      tokens_rotated: 0,
      fallback_hits: 0,
      token_rejections: 0,
    };

    // Increment in appropriate branches
    // Add /metrics route before createServer
    function metricsRoute(req, res) {
      const state = loadTokens();
      const text = [
        '# HELP mesh_requests_total Total proxied requests',
        '# TYPE mesh_requests_total counter',
        `mesh_requests_total ${metrics.requests_total}`,
        '# HELP mesh_tokens_rotated Total token rotations',
        '# TYPE mesh_tokens_rotated counter',
        `mesh_tokens_rotated ${metrics.tokens_rotated}`,
        '# HELP mesh_fallback_hits Requests served by free tier',
        '# TYPE mesh_fallback_hits counter',
        `mesh_fallback_hits ${metrics.fallback_hits}`,
        '# HELP mesh_tokens_configured Number of tokens in pool',
        '# TYPE mesh_tokens_configured gauge',
        `mesh_tokens_configured ${(state.tokens || []).length}`,
      ].join('\n');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(text);
    }
    ```

- [ ] **6.2: Add graceful shutdown**
    - Owner: You
    - Input: orchestrator.mjs
    - Output: SIGTERM/SIGINT handlers that drain connections
    - Done: `kill $PID` logs "[SHUTDOWN] Draining connections..." and exits cleanly
    - Est: 5 min

    ```javascript
    process.on('SIGTERM', () => {
      console.log('[SHUTDOWN] Received SIGTERM, closing server...');
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000); // force exit after 10s
    });
    process.on('SIGINT', () => process.emit('SIGTERM'));
    ```

---

## Dependencies

### Prerequisites
- [ ] Docker and Docker Compose installed
- [ ] Node.js v20+ installed (`node --version`)
- [ ] kiro-gateway Docker image pulled (`docker pull jwadow/kiro-gateway`)
- [ ] AWS Builder ID configured (for Kiro tokens)
- [ ] `tokens.json` file created with at least one valid token

### Blockers
- If `jwadow/kiro-gateway` does not start on Docker, the entire plan is blocked until fixed
- If Anthropic DMCA-takedowns `jwadow/kiro-gateway`, switch to `rynfar/meridian` as base proxy

### External
- Anthropic billing API may change auth mechanisms without notice
- AWS may revoke Kiro API access (the underlying "free Claude" source)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|-----------|
| kiro-gateway taken down by Anthropic DMCA | Medium | Critical | Switch to meridian as base proxy; keep wrapper pattern |
| Token file is read/write race condition | Low | Medium | Use `writeFileSync` with atomic temp-file rename pattern |
| Ollama consumes too much RAM on laptop | Medium | Low | Document `OLLAMA_MAX_LOADED_MODELS=1` env var; add to compose |
| Proxy adds 50-200ms latency per hop | Low | Low | Acceptable for non-real-time AI use; test with wrk benchmark |
| Kiro token rotation detected as abuse | Medium | High | Add jitter to rotation intervals (random 4-6 min instead of fixed 5) |

---

## Verification

Before claiming completion:

- [ ] **Step check**: Every step's "Done" condition verified
- [ ] **Proxy test**: `curl http://localhost:3000/v1/models -H "Content-Type: application/json"` returns kiro-gateway response
- [ ] **Fallback test**: Empty `tokens.json`, request goes to Ollama, returns response
- [ ] **Rotation test**: Bad token in slot 0, good in slot 1, orchestrator auto-rotates on first 401
- [ ] **Metrics test**: `curl http://localhost:3000/metrics` returns valid Prometheus text
- [ ] **Graceful shutdown**: `docker compose down` exits cleanly within 10s
- [ ] **Scope check**: No out-of-scope work (no GUI, no forking kiro-gateway)
- [ ] **Assumptions re-evaluated**: A1-A5 still hold
- [ ] **Risks re-evaluated**: Top risks mitigated or accepted

---

## Post-MVP Enhancements (Out of Scope for This Plan)

- Integration with `mxyhi/token_proxy` for SQLite-based token counting
- Web dashboard for token pool management
- Multi-architecture build (ARM for Raspberry Pi)
- Kubernetes Helm chart
- Integration with `rynfar/meridian` as alternative upstream for Claude Max subscription heads