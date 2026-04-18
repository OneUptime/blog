# Validation Summary: How to Debug WebSocket IPv6 Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- WebSocket protocol (RFC 6455)
- IPv6 addressing (RFC 3986 bracket notation for URLs)
- Node.js `ws` library
- Browser WebSocket API
- `ip6tables` (Linux netfilter IPv6 firewall)
- `ss` (socket statistics utility from iproute2)
- `wscat` (WebSocket CLI testing tool)
- nginx access logs

## Sources Consulted
- RFC 6455 — The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- RFC 3986 — URI Generic Syntax (bracketed IPv6 in authority): https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- `ws` library documentation: https://github.com/websockets/ws (Server options `host`, `port`)
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- `ip6tables` man page (including `-m comment --comment`): https://linux.die.net/man/8/ip6tables
- `ss` man page: https://man7.org/linux/man-pages/man8/ss.8.html
- wscat on npm: https://www.npmjs.com/package/wscat
- Node.js `net.Socket.remoteAddress` docs: https://nodejs.org/api/net.html

## Issues Found
No technical issues found.

- `new WebSocket.Server({ host: '::', port: 8080 })` is valid `ws` library API and correctly binds to all IPv6 interfaces.
- `req.socket.remoteAddress` is the correct property for retrieving the client address in the `ws` connection callback.
- `ip6tables -A INPUT -p tcp --dport 8080 -j ACCEPT -m comment --comment "..."` uses valid flags; the `comment` match module supports `--comment`.
- `ss -tlnp` flags (TCP, listening, numeric, processes) are correct.
- Bracketed IPv6 URL form `ws://[2001:db8::1]:8080/` follows RFC 3986 §3.2.2.
- `2001:db8::/32` is the correct documentation prefix (RFC 3849), appropriate for an example.
- `wscat -c <url>` usage is correct for connecting to a WebSocket endpoint.

## Review Notes
- On Linux, binding to `::` typically also accepts IPv4 connections via IPv4-mapped IPv6 addresses unless `IPV6_V6ONLY` is set. Readers debugging a mixed-stack setup may want to be aware of this, but the post's claim as written is accurate.
- `req.socket.remoteAddress` for an IPv4 client reaching a dual-stack listener will appear as `::ffff:a.b.c.d` — worth noting if readers write strict IPv6 parsing, but not an error in the post.
- The `tail -f ... | grep "::"` tip will also match any line containing `::` in a path or field; it's a pragmatic first-pass filter rather than a precise one, but the post presents it as a quick check which is fair.
- wscat is still maintained and the install/usage syntax shown is current.
