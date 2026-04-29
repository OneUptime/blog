# Validation Summary: How to Calculate IPv6 Subnets from a /48 Allocation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- CIDR subnetting
- IP address planning
- Python `ipaddress` standard library

## Sources Consulted
- Python Standard Library: `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RIPE NCC, Create an Addressing Plan: https://www.ripe.net/publications/ipv6-info-centre/deployment-planning/create-an-addressing-plan/

## Issues Found
- The introduction described a `/48` as "the standard" allocation for organizations. I changed this to "a common IPv6 allocation" because RFC 6177 obsoleted the older default-`/48` recommendation and current policy guidance allows a wider range of end-site assignment sizes.
- The quick reference table said "Hosts per /64". I changed this to "Addresses per /64" because a `/64` contains `2^64` addresses, but IPv6 subnet size is more precisely expressed in addresses rather than a strict host count.
- The conclusion said a `/48` is "more than enough address space for any organization". I replaced that universal claim with a precise capacity statement that a `/48` contains `65,536` `/64` subnets.

## Review Notes
- The Python examples are syntactically correct, use current standard-library APIs, and the documented output matches actual execution.
- The examples correctly use `2001:db8::/32`, which RFC 3849 reserves for documentation.
