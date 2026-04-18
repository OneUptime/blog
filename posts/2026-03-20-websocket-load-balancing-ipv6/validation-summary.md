# Validation Summary: How to Configure WebSocket Load Balancing with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol
- IPv6 networking
- Node.js `ws` library
- ip6tables (Linux firewall)
- wscat (WebSocket CLI client)
- ss (socket statistics utility)
- Nginx (mentioned in tags/intro only)
- HAProxy (mentioned in tags/intro only)

## Sources Consulted
- ws library documentation: https://github.com/websockets/ws/blob/master/doc/ws.md (Server constructor options `host`, `port`)
- RFC 6874 — Representing IPv6 Zone Identifiers in URIs (bracketed IPv6 syntax)
- RFC 3986 — URI Generic Syntax
- ip6tables(8) man page (syntax for `-A`, `-p`, `--dport`, `-j`, `-m comment`)
- wscat documentation: https://github.com/websockets/wscat
- iproute2 `ss` man page (`-tlnp` flags)
- MDN WebSocket API documentation (`addEventListener`, `send`)

## Issues Found
No technical issues found. All code, commands, and technical claims are accurate:
- `new WebSocket.Server({ host: '::', port: 8080 })` is valid `ws` library syntax and binds to all IPv6 interfaces.
- `req.socket.remoteAddress` correctly exposes the client IP in a ws connection handler.
- `ws://[2001:db8::1]:8080/` and `ws://[::1]:8080/` follow RFC 3986/6874 bracket notation for IPv6 in URIs.
- `ip6tables -A INPUT -p tcp --dport 8080 -j ACCEPT -m comment --comment "..."` is accepted by ip6tables; the comment match works regardless of position relative to `-j`.
- `ss -tlnp | grep 8080` correctly lists TCP listeners on port 8080.
- `wscat -c ws://[::1]:8080/` is the correct invocation for testing.

## Review Notes
- Scope mismatch: the title and tags promise Nginx/HAProxy load balancing configuration with sticky sessions, but the post body only covers basic IPv6 WebSocket server binding, firewalling, and client connection. No Nginx/HAProxy configuration snippets are provided. Per the review guidelines, restructuring and adding new sections is out of scope, so this was not addressed, but a future edit should either expand the content to match the title or narrow the title/tags to reflect the actual content.
- The example uses `2001:db8::1` (documentation prefix per RFC 3849), which is the correct choice for examples.
- Convention would put `-m comment --comment "..."` before `-j ACCEPT` in the ip6tables rule; both orderings are accepted by netfilter, so this is not an error.
