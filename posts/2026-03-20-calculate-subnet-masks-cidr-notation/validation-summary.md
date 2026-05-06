# Validation Summary: How to Calculate Subnet Masks from CIDR Notation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- CIDR and subnet masks
- Python standard library: `socket`, `struct`, `ipaddress`

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- RFC 4632, Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan: https://datatracker.ietf.org/doc/html/rfc4632
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://datatracker.ietf.org/doc/html/rfc3021

## Issues Found
- The original `mask_to_cidr()` example used `socket.inet_aton()` plus `count("1")`, which accepted invalid or shorthand masks such as `255.0.255.0` and `255.255.255` instead of rejecting them. I replaced it with an `ipaddress.IPv4Network()`-based implementation and an explicit `netmask` check so only valid dotted-decimal subnet masks are accepted.
- The `/31` row in the quick reference table implied the two-host case without naming the RFC 3021 scope. I updated it to say `2 on point-to-point links` to match the RFC's intended use.

## Review Notes
- The `ipaddress` example's `net.num_addresses - 2` calculation is correct for the `/20` example shown. If the post is expanded later, note that `/31` and `/32` are special cases and do not follow the generic "minus two" usable-host rule.
