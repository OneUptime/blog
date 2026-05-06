# Validation Summary: How to Calculate Subnet Masks from IPv4 CIDR Prefix Length in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python standard library `ipaddress`
- IPv4
- CIDR notation
- Subnet masks and wildcard masks

## Sources Consulted
- Python `ipaddress` library reference: https://docs.python.org/3.12/library/ipaddress.html
- Python `ipaddress` HOWTO: https://docs.python.org/3.12/howto/ipaddress.html
- RFC 3021: Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021.html

## Issues Found
- The `network_info()` example converted `net.hosts()` to a list, which can consume excessive memory for large networks even though the helper is presented as general-purpose. I replaced that with constant-memory calculations for usable host counts and first/last host values, while preserving the documented `ipaddress` behavior for `/31` and `/32` networks.

## Review Notes
- The post uses current, non-deprecated `ipaddress` APIs.
- The dotted-mask-to-prefix example is valid because `IPv4Network` accepts mask strings as well as prefix lengths.
