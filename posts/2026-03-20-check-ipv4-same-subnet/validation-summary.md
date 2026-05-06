# Validation Summary: How to Check If Two IPv4 Addresses Are on the Same Subnet

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- Python `ipaddress` standard library module
- IPv4 subnetting
- CIDR notation

## Sources Consulted
- Python Standard Library: `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python HOWTO: An introduction to the `ipaddress` module: https://docs.python.org/3/howto/ipaddress.html
- RFC 1918, Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The bitwise mask example treated any dotted-quad as a usable mask. I changed it to derive the mask through `ipaddress.IPv4Network(f"0.0.0.0/{mask}").netmask` so invalid subnet masks are rejected using `ipaddress`'s netmask validation rules.
- The routing helper used the entire RFC 1918 private ranges (`10/8`, `172.16/12`, `192.168/16`) as if they were local subnets. I replaced those with example directly connected subnets and tightened the docstring so the example now matches actual same-subnet/directly connected routing behavior.

## Review Notes
- The remaining examples are technically correct with current Python `ipaddress` APIs.
- `same_network()` compares full `IPv4Network` objects, so CIDR strings with different resulting prefixes will not compare equal even if one network contains the other.
