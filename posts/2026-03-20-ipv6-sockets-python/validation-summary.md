# Validation Summary: How to Create IPv6 Sockets in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Python `socket` module
- IPv6
- TCP sockets
- UDP sockets
- DNS/address resolution with `getaddrinfo()`

## Sources Consulted
- Python Standard Library: `socket` module — https://docs.python.org/3/library/socket.html
- RFC 6724: Default Address Selection for Internet Protocol Version 6 (IPv6) — https://www.rfc-editor.org/rfc/rfc6724
- RFC 4007: IPv6 Scoped Address Architecture — https://www.rfc-editor.org/rfc/rfc4007
- IANA Service Name and Transport Protocol Port Number Registry (port 5353 / mDNS) — https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=5353

## Issues Found

1. **The `getaddrinfo()` section overstated IPv6 preference.** The post said protocol-independent code "prefers IPv6 when both AAAA and A records exist" and that the example "will use IPv6 if AAAA record exists." Python documents `getaddrinfo()` result ordering as system-specific, and RFC 6724 defines destination address ordering rules rather than a blanket "always prefer IPv6" rule. Updated the docstring, inline comment, and conclusion to say the code tries addresses in the order returned by the system.

2. **`connect_to_host()` leaked sockets on failed connection attempts.** If `connect()` failed inside the loop, the code moved on without closing the socket it had just created. Added cleanup in the `except` path so failed attempts close their socket before continuing.

3. **The dual-stack example assumed platform support too strongly.** The original server example unconditionally set `IPV6_V6ONLY` to `0`. Updated it to check `socket.has_dualstack_ipv6()` first so the example remains correct on platforms where dual-stack IPv6 sockets are not available.

4. **The UDP example used the well-known mDNS port.** The default UDP server port was `5353`, which is assigned to Multicast DNS and is commonly already in use by system services. Changed the example default to `55000` to avoid an unnecessary port conflict in a generic socket-programming example.

5. **The introduction and conclusion were too absolute about IPv6 address tuples.** Python documents the IPv6 address form as `(host, port, flowinfo, scope_id)`, but `flowinfo`/`scope_id` are not always `0`, and the simplified `(host, port, 0, 0)` form is only a common case when no scope is needed. Updated the wording to reflect that accurately.

## Review Notes
- All six Python code blocks compile successfully under `python3` after the fixes.
- The link-local example uses `eth0`, which is a valid Linux-style interface name but not universal across operating systems. The example is technically correct as written, but readers on macOS, Windows, or systems using different interface names will need to substitute their local interface name.
