# Validation Summary: How to Handle IPv6 Addresses in Python Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python `ipaddress` module
- Python `socket` module
- IPv6 addressing and networking
- URL formatting for IPv6 literals

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry
- RFC 6874, Representing IPv6 Zone Identifiers in Address Literals and Uniform Resource Identifiers: https://www.rfc-editor.org/rfc/rfc6874

## Issues Found
- The `is_private` comment for `2001:db8::1` was incorrect. I changed it to `True` because Python documents `is_private` as “not globally reachable,” and the IANA documentation prefix `2001:db8::/32` is not globally reachable.
- The validation example incorrectly said a scoped address like `fe80::1%eth0` needed stripping before validation. I removed the stripping logic because `ipaddress.IPv6Address` accepts IPv6 scope zone IDs.
- The IPv6 client example only used the first `getaddrinfo()` result and used `send()`. I changed it to filter for TCP, try each returned IPv6 address in order, and use `sendall()` so the example matches Python’s documented socket behavior.
- The server example forced dual-stack behavior with `IPV6_V6ONLY=0`, which is platform-dependent. I updated it to use `socket.create_server()` with `socket.has_dualstack_ipv6()` so the example follows Python’s documented dual-stack API.
- The URL-formatting helper did not handle scoped IPv6 literals correctly. I updated it to percent-encode the zone separator (`%` -> `%25`) before bracketing, which matches the URI rules for zone identifiers.

## Review Notes
- The `IPv6Network` example, membership check, and subnet output were correct as written.
- The revised snippets were rechecked locally on Python 3.12.3 after the edits.
- Python 3.13 changed some `ipaddress.is_private` and `is_global` classifications for special-purpose ranges, so behavior can differ on older interpreters for some addresses.
