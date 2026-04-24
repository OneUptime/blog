# Validation Summary: How to Use Python ipaddress Module for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- Python standard library `ipaddress` module
- IPv6 addressing
- IPv6 subnetting
- RFC 4291 IPv6 addressing rules
- RFC 5952 IPv6 text representation

## Sources Consulted
- Python `ipaddress` library reference: https://docs.python.org/3/library/ipaddress.html
- Python `ipaddress` HOWTO: https://docs.python.org/3/howto/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 5952, A Recommendation for IPv6 Address Text Representation: https://www.ietf.org/rfc/rfc5952
- Cloudflare IP ranges: https://www.cloudflare.com/ips/

## Issues Found
- The post used `IPv6Address.ipv4_compatible`, which is not part of Python's `ipaddress` API. I replaced that example with a supported `ipv4_mapped` check showing that `::192.0.2.1` is not treated as an IPv4-mapped address. This matches the Python docs, which only expose `ipv4_mapped` for addresses in `::ffff/96`, and RFC 4291, which distinguishes deprecated IPv4-compatible addresses from IPv4-mapped addresses.

## Review Notes
- Python 3.13 updated some `is_private` and `is_global` classifications for special-use ranges, but the examples used in this post remain correct on current supported Python versions.
- The subnet allocation example materializes all `/48` subnets from a `/32` into a list. That is acceptable for the tutorial example shown here, but iterator-based approaches are safer for larger production IPAM workloads.
