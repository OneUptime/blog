# Validation Summary: How to Calculate Subnets and Host Ranges for Any IPv4 CIDR Block

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing and subnetting
- CIDR notation
- Python standard library `ipaddress` module
- RFC 3021 `/31` point-to-point addressing

## Sources Consulted
- Python 3.12 Standard Library: `ipaddress` https://docs.python.org/3.12/library/ipaddress.html
- RFC 3021: Using 31-Bit Prefixes on IPv4 Point-to-Point Links https://www.rfc-editor.org/rfc/rfc3021
- RFC 4632: Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The post stated `usable hosts = 2^(32-prefix) - 2` as a general rule. I corrected it to apply to `/30` and shorter prefixes, because `/31` point-to-point links are a special case under RFC 3021 and `/32` is a single-host route.
- The `/31` example described the prefix as having “no broadcast,” which was too broad. I changed it to say both addresses are usable on point-to-point links, which matches RFC 3021 more precisely.
- The `subnet_info()` Python example incorrectly computed `first_host`, `last_host`, and `usable_hosts` for `/31` and `/32` networks. I added explicit handling for those prefix lengths so the code now matches Python `ipaddress` behavior.
- The `divide_network()` Python example incorrectly computed per-subnet host counts and host ranges for `/31` and `/32` child subnets. I added matching special-case handling there as well.

## Review Notes
Validated against the Python 3.12 `ipaddress` documentation and confirmed locally on Python 3.12.3. The use of `strict=False` in `ip_network()` is technically correct here because it accepts host addresses such as `192.168.10.50/26` and normalizes them to their containing network.
