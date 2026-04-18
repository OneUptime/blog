# Validation Summary: How to Test WebSocket Connections over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol (RFC 6455)
- IPv6 (RFC 8200)
- Node.js `ws` library
- Browser WebSocket API
- `wscat` CLI tool
- `ip6tables` (Linux firewall)
- `ss` (socket statistics)

## Sources Consulted
- RFC 6455 (The WebSocket Protocol): https://datatracker.ietf.org/doc/html/rfc6455
- RFC 3986 (URI Generic Syntax — bracketed IPv6 literals): https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- RFC 3849 (IPv6 Documentation Prefix 2001:db8::/32): https://datatracker.ietf.org/doc/html/rfc3849
- `ws` Node.js library docs: https://github.com/websockets/ws/blob/master/doc/ws.md
- WHATWG WebSocket interface: https://websockets.spec.whatwg.org/
- `wscat` documentation: https://github.com/websockets/wscat
- `ip6tables` man page / Netfilter documentation
- `iproute2` / `ss` man page

## Issues Found
No technical issues found. All code and commands verified:
- `new WebSocket.Server({ host: '::', port: 8080 })` is correct for the `ws` library; `host` option accepts `::` for all IPv6 interfaces.
- `req.socket.remoteAddress` is the correct way to retrieve the client's IP in the `ws` connection handler.
- `ip6tables -A INPUT -p tcp --dport 8080 -j ACCEPT -m comment --comment "..."` is syntactically valid; iptables accepts match extensions before or after `-j`.
- Bracketed IPv6 literal in WebSocket URL (`ws://[2001:db8::1]:8080/`) matches RFC 3986 / RFC 6455 requirements.
- `2001:db8::1` is correctly from the RFC 3849 documentation prefix.
- `wscat -c ws://[::1]:8080/` is correct usage.
- `ss -tlnp` flags are current and correct.

## Review Notes
- On Linux, binding to `::` typically accepts both IPv4 (as IPv4-mapped IPv6) and IPv6 connections by default, because `IPV6_V6ONLY` is off. The post does not claim IPv6-only behavior, so this is accurate as written, but readers wanting strictly IPv6 should set that socket option.
- The conventional order in iptables examples places `-m comment --comment "..."` before `-j ACCEPT`; both orders are accepted by iptables, so no change needed.
- The post could be strengthened with a note about `wss://` (TLS) for production, but that is an enhancement, not a correctness issue.
