# Validation Summary: How to Monitor WebSocket IPv6 Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol (RFC 6455)
- IPv6 (RFC 2460 / RFC 8200)
- Node.js `ws` library
- Browser WebSocket API
- `ip6tables` (Linux netfilter)
- `wscat` CLI
- `ss` (iproute2)
- nginx access logs
- OneUptime (TCP port monitoring)

## Sources Consulted
- `ws` Node.js library documentation: https://github.com/websockets/ws
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- RFC 6455 (The WebSocket Protocol): https://datatracker.ietf.org/doc/html/rfc6455
- RFC 3986 (URI Generic Syntax — bracketed IPv6 literals): https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- ip6tables man page: https://man7.org/linux/man-pages/man8/ip6tables.8.html
- iptables-extensions (comment match module): https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Node.js `net.Socket.remoteAddress`: https://nodejs.org/api/net.html#socketremoteaddress
- wscat: https://github.com/websockets/wscat
- iproute2 `ss` man page: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
No technical issues found.

- `new WebSocket.Server({ host: '::', port: 8080 })` is valid in the `ws` library; `host: '::'` binds to all IPv6 interfaces (and, on dual-stack Linux systems with `IPV6_V6ONLY=0`, accepts IPv4-mapped addresses too). `WebSocket.Server` is exported as an alias for `WebSocketServer`.
- `req.socket.remoteAddress` correctly returns the peer address for WebSocket upgrade requests.
- `ip6tables -A INPUT -p tcp --dport 8080 -j ACCEPT -m comment --comment "..."` is syntactically valid; iptables does not require match options before the target.
- Bracketed IPv6 URL `ws://[2001:db8::1]:8080/` follows RFC 3986 §3.2.2 for URI host literal syntax; `2001:db8::/32` is the documentation prefix (RFC 3849) and appropriate for an example.
- `wscat -c ws://[::1]:8080/` is the correct client-mode invocation.
- `ss -tlnp` correctly lists listening TCP sockets with process info.

## Review Notes
- The post's description/tags mention Prometheus and Grafana, but the body only covers OneUptime TCP monitoring. This is a scope mismatch rather than a technical error, so no edits were made per the "fix only technical errors" directive.
- `WebSocket.Server` in the `ws` library still works but `WebSocketServer` (destructured import) is the more modern idiom. Not incorrect; just stylistic.
- On dual-stack Linux, binding to `::` typically accepts both IPv6 and IPv4-mapped connections unless `IPV6_V6ONLY` is set. A future revision could mention this nuance.
- `tail -f /var/log/nginx/access.log | grep "::"` is a rough heuristic for spotting IPv6 entries; it could false-positive on any log line containing two colons (e.g., timestamps under some log formats). A more precise filter would use the `$remote_addr` field directly.
