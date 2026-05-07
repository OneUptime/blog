# Validation Summary: How to Avoid Common Subnetting Mistakes

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting
- Python `ipaddress` standard library
- VPN/private network overlap checking
- RFC 1918 private IPv4 addressing

## Sources Consulted
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `ipaddress` HOWTO: https://docs.python.org/3/howto/ipaddress.html
- RFC 1918, Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021
- RFC 919, Broadcasting Internet Datagrams: https://www.rfc-editor.org/rfc/rfc919

## Issues Found
- Mistake 2 incorrectly stated that `ipaddress.IPv4Interface("192.168.1.0/24")` would raise `ValueError`. Python's official documentation says `IPv4Interface` accepts arbitrary host addresses, so the example was corrected to explicitly check whether a candidate matches the network or broadcast address before assignment.
- Mistake 3 and the Key Takeaways section stated the usable-host formula too absolutely. They were updated to clarify that `2^host_bits - 2` applies to conventional IPv4 subnets, while `/31` and `/32` are special cases.
- The code snippets in Mistake 4 and Mistake 5 used `ipaddress` without importing it. `import ipaddress` was added so the examples run as written.

## Review Notes
- The post is accurate after correction. The Python APIs used are current standard-library interfaces and are not deprecated.
