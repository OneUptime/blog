# Validation Summary: How to Configure ws (Node.js WebSocket) with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js `ws` library (WebSocket server/client)
- Browser WebSocket API
- IPv6 networking
- `ip6tables` (Linux firewall)
- `wscat` (WebSocket CLI testing tool)
- `ss` (socket statistics command)

## Sources Consulted
- ws npm package documentation: https://www.npmjs.com/package/ws
- ws GitHub repository: https://github.com/websockets/ws
- wscat GitHub: https://github.com/websockets/wscat
- RFC 6455 (The WebSocket Protocol): https://datatracker.ietf.org/doc/html/rfc6455
- RFC 3986 (URI Generic Syntax, bracketed IPv6 in authority component): https://datatracker.ietf.org/doc/html/rfc3986
- Node.js `net` / `http` docs for `socket.remoteAddress`: https://nodejs.org/api/net.html
- ip6tables Linux man page: https://linux.die.net/man/8/ip6tables

## Issues Found
No technical issues found.

- `new WebSocket.Server({ host: '::', port: 8080 })` correctly binds to all IPv6 interfaces; `WebSocket.Server` is a valid alias for `WebSocketServer` when using `const WebSocket = require('ws')`.
- `req.socket.remoteAddress` is the documented way to retrieve the client IP in the `connection` handler.
- Bracketed IPv6 URLs (`ws://[2001:db8::1]:8080/`, `ws://[::1]:8080/`) are valid per RFC 6455 / RFC 3986.
- The `ip6tables`, `ss`, and `wscat` commands are syntactically correct and use current, non-deprecated flags.

## Review Notes
- The Description frontmatter mentions "TLS, authentication, and connection management," but the post body only covers plain-`ws://` binding, firewalling, and client connection. A future revision could either trim the description or add `wss://` (TLS) and auth sections to match.
- When binding to `::`, Linux's default `IPV6_V6ONLY=0` means the socket also accepts IPv4 connections as IPv4-mapped IPv6 (e.g. `::ffff:192.0.2.1` in `remoteAddress`). Worth calling out for readers who log client IPs.
- `npm install -g wscat` works, but modern alternatives (`npx wscat`) avoid global installs — optional improvement only.
