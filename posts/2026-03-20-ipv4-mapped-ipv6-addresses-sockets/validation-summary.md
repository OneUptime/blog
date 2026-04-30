# Validation Summary: How to Understand IPv4-Mapped IPv6 Addresses in Sockets

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and IPv4-mapped IPv6 addresses
- Dual-stack socket programming
- C socket APIs (`AF_INET6`, `IPV6_V6ONLY`, `IN6_IS_ADDR_V4MAPPED`, `inet_ntop`)
- Python `socket` and `ipaddress`
- WSGI `environ` / `REMOTE_ADDR`

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture" — https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3493, "Basic Socket Interface Extensions for IPv6" — https://www.rfc-editor.org/rfc/rfc3493
- RFC 5952, "A Recommendation for IPv6 Address Text Representation" — https://www.rfc-editor.org/rfc/rfc5952
- Linux `ipv6(7)` manual page — https://man7.org/linux/man-pages/man7/ipv6.7.html
- Python `ipaddress` library documentation — https://docs.python.org/3/library/ipaddress.html
- Python `socket` module documentation — https://docs.python.org/3/library/socket.html
- PEP 3333, WSGI v1.0.1 — https://peps.python.org/pep-3333/
- IANA IPv6 Special-Purpose Address Space registry — https://www.iana.org/assignments/iana-ipv6-special-registry

## Issues Found
- The C `classify_address()` example treated every non-loopback, non-link-local, non-mapped IPv6 address as "Global IPv6". That was too broad, because unspecified, multicast, unique-local, and other non-global IPv6 addresses would also match that branch. I changed the output to "Other IPv6" to keep the classification technically correct.
- The final Python section was labeled as HTTP-header handling, but the code actually read `REMOTE_ADDR` from a WSGI `environ` mapping. I renamed the section and comment so the explanation matches the mechanism being shown.
- The same Python snippet normalized mapped addresses by stripping a lowercase `::ffff:` prefix. That fails for valid mapped forms such as `::ffff:c0a8:105` and uppercase forms such as `::FFFF:192.168.1.5`. I replaced the string-prefix logic with `ipaddress.ip_address(...).ipv4_mapped`, which correctly handles legal IPv4-mapped IPv6 text forms.

## Review Notes
- The C examples compiled cleanly with `gcc -Wall -Wextra -Werror` during review.
- The Python normalization logic was exercised locally, including dotted-quad, hexadecimal, and uppercase IPv4-mapped IPv6 inputs.
- Dual-stack listener behavior is platform-dependent. The article’s `IPV6_V6ONLY=0` examples are consistent with RFC 3493, Linux `ipv6(7)`, and current Python docs, but portable Python code can also use `socket.has_dualstack_ipv6()` and `socket.create_server(..., dualstack_ipv6=True)` where appropriate.
