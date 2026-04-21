# Validation Summary: How to Perform Subnetting in Your Head Without a Calculator

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 CIDR notation
- IPv4 subnet masks and host ranges
- Python `ipaddress` standard library module

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://datatracker.ietf.org/doc/html/rfc3021
- RFC 1878, Variable Length Subnet Table For IPv4: https://datatracker.ietf.org/doc/html/rfc1878
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The block-size method was introduced as applying to "any subnet mask", but the "interesting octet" shortcut only applies directly when the mask has a partial octet. Updated the wording to say "any subnet mask with a partial octet."
- The quick formula summary did not clearly distinguish between arithmetic in the interesting octet and the full network/broadcast addresses, which could mislead readers on masks like `/20`. Updated the formula summary to set lower host octets to `0` for the network address and `255` for the broadcast address, and to calculate first/last host from the full addresses.
- The host-range formula was scoped to typical IPv4 subnets with separate network and broadcast addresses, because `/31` point-to-point prefixes are special under RFC 3021 and `/31`/`/32` have special Python `ipaddress.hosts()` behavior.

## Review Notes
- The worked examples for `192.168.10.45/26`, `172.16.100.200/20`, and `10.5.3.200/25` were verified with Python `ipaddress` and are correct.
- The Python validator is syntactically correct and uses current standard-library APIs. For very large networks, a future improvement could avoid materializing `list(net.hosts())`, but it works for the examples shown in the post.
