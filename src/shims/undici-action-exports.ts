/**
 * Narrow undici surface for the action bundle.
 *
 * `@actions/http-client` imports `ProxyAgent` and `@actions/github` imports
 * `fetch`. undici's main entry also eagerly loads WebSocket (RFC 6455 SHA-1
 * handshake), which must not ship in dist/.
 */
export { default as ProxyAgent } from 'undici/lib/dispatcher/proxy-agent.js';
export { fetch } from 'undici/lib/web/fetch/index.js';
