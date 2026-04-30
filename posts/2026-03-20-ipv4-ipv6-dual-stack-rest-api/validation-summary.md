# Validation Summary: How to Handle IPv4 and IPv6 Dual-Stack in REST API Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- REST API servers
- IPv4
- IPv6
- Dual-stack socket behavior
- Python `http.server`
- Python `socket` and `ipaddress`
- Node.js
- Express

## Sources Consulted
- Python `http.server` documentation: https://docs.python.org/3/library/http.server.html
- Python `socketserver` documentation: https://docs.python.org/3/library/socketserver.html
- Python `socket` documentation (`create_server`, `has_dualstack_ipv6`): https://docs.python.org/3/library/socket.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Node.js `net` documentation (`server.listen`, `ipv6Only`): https://nodejs.org/api/net.html
- Node.js `http` documentation (`IncomingMessage.socket`): https://nodejs.org/api/http.html
- Linux `ipv6(7)` manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- FreeBSD `inet6(4)` manual page: https://man.freebsd.org/cgi/man.cgi?query=inet6
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The original Python example constructed `HTTPServer` via `HTTPServer.__new__`, which bypassed normal `BaseServer` initialization. In practice, `serve_forever()` fails because required internal state is missing, and the socket was never activated through the normal server lifecycle. I replaced it with a proper `HTTPServer` subclass that binds an `AF_INET6` socket and explicitly clears `IPV6_V6ONLY` for a working dual-stack listener.
- The Node.js comments stated that listening on `"::"` automatically accepts both IPv4 and IPv6 and framed that as a Linux-default guarantee. Node’s official docs are narrower: listening on `"::"` may also bind IPv4 on many operating systems, but this is OS-dependent. I corrected the wording to match the documented behavior.
- The `normalize_client_ip()` helper stripped the `::ffff:` prefix before parsing. That works for dotted-quad mapped addresses, but it breaks other valid IPv4-mapped IPv6 text forms such as `::ffff:c0a8:101`. I removed the pre-strip and used `ipaddress.IPv6Address.ipv4_mapped` directly.
- The conclusion overgeneralized non-Linux defaults by claiming macOS/BSD always require two sockets for dual-stack. I narrowed this to a verified statement: Linux defaults `bindv6only` to `0`, while FreeBSD defaults `IPV6_V6ONLY` to `1`, so assumptions must be platform-specific.

## Review Notes
- The revised Python example uses `socket.has_dualstack_ipv6()`, which is available in modern Python 3 releases and is the documented way to check whether one IPv6 socket can accept both IPv4 and IPv6 traffic.
- I also smoke-tested the corrected Python pattern locally on Linux and confirmed it accepted both `127.0.0.1` and `::1`, with IPv4 clients appearing as IPv4-mapped IPv6 addresses before normalization.
