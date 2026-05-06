# Validation Summary: How to Check If an IPv4 Address Is Private or Public in Python

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Python
- Python standard library `ipaddress`
- IPv4 addressing
- RFC 1918 private address space
- Special-purpose IPv4 ranges

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- IANA IPv4 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- RFC 1918, Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://datatracker.ietf.org/doc/rfc5737/
- RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space: https://datatracker.ietf.org/doc/html/rfc6598
- RFC 3927, Dynamic Configuration of IPv4 Link-Local Addresses: https://datatracker.ietf.org/doc/html/rfc3927

## Issues Found
- The `split_private_public()` example used `addr.is_private`, which includes loopback and other non-global ranges in Python. That made the shown output wrong for `127.0.0.1`. I changed the function to check the three RFC 1918 networks explicitly and to treat public addresses as `addr.is_global and not addr.is_multicast`, which matches the stated output.
- The inline comments for `is_private`, `is_global`, and `is_reserved` were too loose. I updated them to match the Python documentation more closely, including the fact that `is_reserved` for IPv4 is only `240.0.0.0/4`.
- The special-ranges example only included one RFC 5737 documentation block and would classify the other documentation blocks as `public`. I added all three documentation ranges and adjusted the fallback so uncategorized non-public addresses are not mislabeled as `public`.
- The conclusion said `is_global` detects publicly routable addresses. I corrected this to reflect Python's documented `globally reachable` semantics and the need to exclude multicast when the goal is public unicast detection.

## Review Notes
- Python 3.13 changed some `is_private` and `is_global` edge-case classifications in `ipaddress`. The post does not pin a Python version, so readers on older runtimes may see differences for some special-purpose addresses even though the revised examples remain correct.
