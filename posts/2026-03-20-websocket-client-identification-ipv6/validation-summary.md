# Validation Summary: How to Handle IPv6 Client Identification in WebSocket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol (RFC 6455)
- IPv6 addressing (RFC 4291, RFC 3986 for URI bracket syntax)
- Node.js `ws` library
- ip6tables (netfilter)
- wscat CLI
- ss (iproute2)

## Sources Consulted
- ws library README and API docs: https://github.com/websockets/ws
- Node.js net.Socket docs for `remoteAddress`: https://nodejs.org/api/net.html#socketremoteaddress
- RFC 3986 (URI Generic Syntax, bracket notation for IPv6 literals): https://www.rfc-editor.org/rfc/rfc3986
- RFC 6455 (The WebSocket Protocol): https://www.rfc-editor.org/rfc/rfc6455
- ip6tables(8) man page
- wscat (npm): https://www.npmjs.com/package/wscat
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

## Issues Found
No technical issues found.

- `new WebSocket.Server({ host: '::', port: 8080 })` is valid; `WebSocket.Server` remains exported as an alias of `WebSocketServer` in the ws library.
- `req.socket.remoteAddress` is the correct accessor for the peer IP on the upgrade request.
- Binding to `::` on Linux by default accepts both IPv6 and IPv4-mapped (`::ffff:a.b.c.d`) connections unless `IPV6_V6ONLY` is set; the example stays correct for the scope described.
- The ip6tables rule with `-j ACCEPT -m comment --comment "..."` is accepted by current iptables builds; the more conventional order places matches before the target but functionally both work.
- The client WebSocket URL `ws://[2001:db8::1]:8080/` correctly uses bracketed IPv6 literal per RFC 3986 §3.2.2.
- `wscat -c ws://[::1]:8080/` and `ss -tlnp | grep 8080` are valid invocations.

## Review Notes
- The post title and description mention "client identification" but the content focuses primarily on binding, firewall configuration, and URL format rather than normalizing or canonicalizing IPv6 addresses (e.g., handling IPv4-mapped `::ffff:` prefixes, per-client rate limiting/session keys). This is a scope/content observation, not a technical error.
- Modern ws usage prefers `const { WebSocketServer } = require('ws')` with `new WebSocketServer(...)`; `WebSocket.Server` continues to work but is no longer the documented primary form.
- Readers behind a reverse proxy (nginx, ALB) will see the proxy's address in `req.socket.remoteAddress`; the real client IP would come from `X-Forwarded-For` or PROXY protocol. This isn't in scope for the post but is worth flagging to readers in a future revision.
