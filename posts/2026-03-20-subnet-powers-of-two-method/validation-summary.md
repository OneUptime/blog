# Validation Summary: How to Subnet Using the Powers of Two Method

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv4 subnetting
- CIDR and VLSM prefix notation
- Python `math` module
- Python `ipaddress` module

## Sources Consulted
- RFC 1878: Variable Length Subnet Table For IPv4 - https://www.rfc-editor.org/rfc/rfc1878.html
- RFC 3021: Using 31-Bit Prefixes on IPv4 Point-to-Point Links - https://datatracker.ietf.org/doc/html/rfc3021
- RFC 4632: Classless Inter-domain Routing (CIDR) - https://www.rfc-editor.org/rfc/inline-errata/rfc4632.html
- Python `ipaddress` module documentation - https://docs.python.org/3/library/ipaddress.html
- Python `math` module documentation - https://docs.python.org/3/library/math.html

## Issues Found
- The post described each borrowed bit as halving "hosts per subnet." That is exact for total address block size, but not for usable host counts because ordinary IPv4 subnets reserve the network and broadcast addresses. I changed the wording to "address block size" and kept the usable-host formula as `2^host_bits - 2`.
- The worked example had an incorrect borrowed-bits formula: `32 - 27 - 0 = 3`. I changed it to `new prefix - parent prefix = 27 - 24 = 3`.
- The reverse-calculation code reported zero usable hosts for `/31` and `/32`. RFC 3021 treats both addresses in a `/31` as host addresses on point-to-point links, and Python's `ipaddress.hosts()` includes both `/31` addresses and the single `/32` address. I updated the code to handle those special cases.

## Review Notes
The `host_bits = ceil(log2(needed_hosts + 2))` formula is correct for ordinary IPv4 subnets that reserve network and broadcast addresses. It is not meant to size `/31` point-to-point links or `/32` host routes.
