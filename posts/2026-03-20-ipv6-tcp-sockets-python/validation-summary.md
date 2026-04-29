# Validation Summary: How to Create IPv6 TCP Sockets in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python `socket` module
- Python `asyncio`
- IPv6
- TCP sockets
- Dual-stack IPv4/IPv6 networking

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `asyncio` streams documentation (`asyncio.open_connection`): https://docs.python.org/3/library/asyncio-stream.html#asyncio.open_connection
- RFC 3986, URI Generic Syntax (IPv6 literals in brackets are URI syntax, not socket host argument syntax): https://datatracker.ietf.org/doc/html/rfc3986
- RFC 4007, IPv6 Scoped Address Architecture: https://datatracker.ietf.org/doc/html/rfc4007

## Issues Found
- The client section incorrectly referred to IPv6 "bracket notation" and implied that `getaddrinfo(..., family=socket.AF_INET6)` handled both IPv4 and IPv6 hosts. I changed the wording to say the function accepts an IPv6 literal or a hostname resolved to IPv6, which matches Python's `socket.getaddrinfo()` behavior when `AF_INET6` is requested.
- The dual-stack section overstated platform behavior by implying OS-specific rules instead of using Python's documented capability check. I updated the wording and added a `socket.has_dualstack_ipv6()` guard so the example now reflects Python's current dual-stack guidance.
- The link-local example labeled the address passed to `connect()` as a "bind tuple" and only entered `try/finally` after `connect()`, which could leave the socket unclosed on connection failure. I corrected the comment and moved `connect()` inside the `try` block.
- The `asyncio` example used `socket.AF_INET6` without importing `socket`. I added the missing import.
- The conclusion stated that IPv6 bind tuples have 4 elements as an absolute rule. I changed that explanation to reflect Python's documented tuple form, where `flowinfo` and `scope_id` are often omitted unless needed.
- The first server example's `IPV6_V6ONLY` comment lacked the same platform caveat as the dual-stack section. I updated the comment to note that dual-stack depends on platform support.

## Review Notes
- The first server example still explicitly sets `IPV6_V6ONLY=0`, so on platforms with dual-stack IPv6 support it can accept IPv4 connections as well as IPv6. That is technically valid, but it is not a strictly IPv6-only listener.
- I also ran a local Python sanity check to confirm the corrected snippets compile and that `socket.has_dualstack_ipv6()` is available in the current runtime.
