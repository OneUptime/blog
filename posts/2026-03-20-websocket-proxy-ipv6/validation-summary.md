# Validation Summary: How to Configure WebSocket Proxy with IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- WebSocket protocol (RFC 6455)
- IPv6 addressing (RFC 3986 URI host syntax)
- Node.js `ws` library (WebSocket server)
- Browser WebSocket API
- `ip6tables` (Linux IPv6 firewall)
- `wscat` CLI (WebSocket testing)
- `ss` (iproute2 socket statistics)

## Sources Consulted
- Node.js `ws` library documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- RFC 3986, Section 3.2.2 (Host) — bracketed IPv6 literals in URIs
- RFC 6455 — The WebSocket Protocol
- MDN WebSocket API reference: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- iptables(8) / ip6tables(8) man pages
- npm wscat package: https://www.npmjs.com/package/wscat
- iproute2 `ss` man page

## Issues Found
No technical issues found. All code examples, CLI commands, and technical claims are accurate:
- `ws` library `Server({ host: '::', port: 8080 })` is valid and binds to all IPv6 interfaces.
- `req.socket.remoteAddress` correctly retrieves the client address.
- `ip6tables -A INPUT -p tcp --dport 8080 -j ACCEPT -m comment --comment "..."` is accepted by iptables (both legacy and nf_tables backends) despite `-j` appearing before `-m`.
- `ws://[2001:db8::1]:8080/` matches RFC 3986 bracketed IPv6 host syntax.
- `npm install -g wscat` and `wscat -c ws://[::1]:8080/` are correct.
- Browser WebSocket `addEventListener('open'|'message', ...)` usage is standard.
- `sudo ss -tlnp | grep 8080` is the idiomatic listening-socket check.

## Review Notes
- **Scope mismatch (not a technical error):** The title, description, and tags advertise Nginx and Traefik as reverse proxies, but the post body does not contain any Nginx or Traefik configuration. The body instead covers a Node.js `ws` server, ip6tables rules, a browser client, and testing tooling. Per review guidelines ("Do not add new sections, restructure the post, or make stylistic changes"), no content was added. Future revisions should either expand the body to actually include `nginx.conf` `Upgrade`/`Connection` header handling and Traefik `entryPoints` with IPv6, or update the title/tags/description to reflect the actual WebSocket-over-IPv6 server content.
- **ip6tables rule ordering (style, not correctness):** The canonical iptables rule-specification order is matches first, then target, e.g. `-m comment --comment "WebSocket IPv6" -j ACCEPT`. The current order works on all modern iptables versions, so this is left unchanged.
- **IPv4-mapped addresses:** On Linux with the default `net.ipv6.bindv6only=0`, binding the Node.js server to `::` also accepts IPv4 connections, which will surface in `req.socket.remoteAddress` as `::ffff:a.b.c.d`. Worth noting if readers expect pure-IPv6 addresses.
- **Example address `2001:db8::1`** is from the documentation-only range (RFC 3849) — appropriate choice for a tutorial.
