# Validation Summary: How to Calculate Network Address from an IP and Subnet Mask

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv4 addressing
- IPv4 subnetting
- Python `socket` module
- Python `struct` module
- Python `ipaddress` module

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 950, Internet Standard Subnetting Procedure: https://datatracker.ietf.org/doc/html/rfc950
- RFC 4632, Classless Inter-domain Routing (CIDR): https://datatracker.ietf.org/doc/rfc4632/

## Issues Found
- The "critical octet" takeaway was slightly overgeneralized. I updated it to say "For standard contiguous subnet masks" because that heuristic depends on contiguous high-order mask bits, which is the standard CIDR/netmask form discussed by the post and accepted by Python's `ipaddress` module.

## Review Notes
- The bitwise AND explanation and all worked examples are technically correct.
- Both Python code examples ran successfully and produced the documented network addresses.
- The `socket` example is valid for IPv4, which matches the post's scope and tags. For dual-stack code, Python's `inet_pton()`/`inet_ntop()` or the `ipaddress` module would be the relevant alternatives.
