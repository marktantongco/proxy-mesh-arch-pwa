export interface ProxyService {
  id: string
  name: string
  port: number
  description: string
  role: string
  status: 'running' | 'standby'
  pid?: number
  version?: string
  protocol: string
  upstream: string[]
  detail: string
}

export const proxyStack: ProxyService[] = [
  {
    id: 'owl',
    name: 'OWL Forward Proxy',
    port: 60000,
    description: 'Entry proxy — all traffic enters here',
    role: 'Forward Proxy',
    status: 'running',
    pid: 2541,
    version: 'latest',
    protocol: 'HTTP CONNECT',
    upstream: ['Mihomo'],
    detail:
      'Acts as the system-level HTTP_PROXY/HTTPS_PROXY endpoint. Forwards all traffic to Mihomo for rule-based routing. Configured via environment variables — every shell session inherits this proxy chain.',
  },
  {
    id: 'mihomo',
    name: 'Mihomo',
    port: 7890,
    description: 'Rule-based proxy engine — routes by destination',
    role: 'Proxy Engine',
    status: 'running',
    pid: 2555,
    version: 'latest',
    protocol: 'Mixed (HTTP/SOCKS5)',
    upstream: ['Kirolink'],
    detail:
      'The core routing engine. Inspects destination addresses and applies rule sets (geoip, domain, custom) to decide which upstream to use. Acts as the intelligent traffic director of the mesh.',
  },
  {
    id: 'kirolink',
    name: 'Kirolink',
    port: 8080,
    description: 'Anthropic route — proxies to Claude API',
    role: 'Upstream Proxy',
    status: 'running',
    pid: 2568,
    version: 'latest',
    protocol: 'HTTP Reverse Proxy',
    upstream: ['Anthropic API'],
    detail:
      'Specialized proxy that routes traffic to Anthropic\'s API. Returns 14 available Claude models including claude-opus-4-6, claude-4-sonnet, and claude-4-haiku. The critical hop for AI agent connectivity.',
  },
  {
    id: 'kiro-gateway',
    name: 'Kiro Gateway',
    port: 8333,
    description: 'OpenAI-compatible API gateway',
    role: 'API Gateway',
    status: 'running',
    pid: 2582,
    version: 'latest',
    protocol: 'HTTP API',
    upstream: ['Anthropic API'],
    detail:
      'Provides an OpenAI-compatible REST API interface. Accepts standard OpenAI SDK requests and translates them to Anthropic API calls. Enables drop-in replacement of OpenAI base URLs with a local endpoint.',
  },
  {
    id: 'kiro-tokend',
    name: 'Kiro Tokend',
    port: 48321,
    description: 'OIDC token refresh daemon',
    role: 'Auth Service',
    status: 'running',
    pid: 2595,
    version: '1.0.0',
    protocol: 'HTTP API',
    upstream: ['OIDC Provider'],
    detail:
      'Standalone daemon that maintains fresh OIDC tokens. Runs token refresh cycles before expiry, serves tokens via HTTP to other services. Eliminates stale-token failures in long-running agent sessions.',
  },
]

export interface TrafficStep {
  from: string
  to: string
  label: string
  color: string
}

export const trafficFlow: TrafficStep[] = [
  { from: 'App / CLI', to: 'OWL :60000', label: 'HTTP_PROXY', color: '#00ff88' },
  { from: 'OWL :60000', to: 'Mihomo :7890', label: 'forward', color: '#00cc6a' },
  { from: 'Mihomo :7890', to: 'Kirolink :8080', label: 'rule match', color: '#009955' },
  { from: 'Kirolink :8080', to: 'Anthropic API', label: 'upstream', color: '#006644' },
  { from: 'Kiro Gateway :8333', to: 'Anthropic API', label: 'OpenAI compat', color: '#8844ff' },
  { from: 'Kiro Tokend :48321', to: 'OIDC Provider', label: 'token refresh', color: '#ff6644' },
]

export interface TimelineEvent {
  year: string
  title: string
  description: string
}

export const evolution: TimelineEvent[] = [
  {
    year: 'v1',
    title: 'Direct Anthropic API',
    description: 'Agents called Anthropic API directly — no proxy, no caching, no resilience. Every connection failure killed the session.',
  },
  {
    year: 'v2',
    title: 'Single Proxy (OWL)',
    description: 'Added OWL forward proxy for HTTP_PROXY support. Gave us a single entry point but no smart routing.',
  },
  {
    year: 'v3',
    title: 'Mihomo Rule Engine',
    description: 'Inserted Mihomo for destination-based routing. Split traffic by rule sets. Added geoip and domain-based policies.',
  },
  {
    year: 'v4',
    title: 'Kirolink + Kiro Gateway',
    description: 'Dual Anthropic paths: Kirolink for direct proxy, Kiro Gateway for OpenAI-compatible API. Both pointing at Claude models.',
  },
  {
    year: 'v5',
    title: 'Kiro Tokend (Current)',
    description: 'Added OIDC token refresh daemon. Eliminated stale-token failures. Total memory: ~15MB across all 5 services.',
  },
]
