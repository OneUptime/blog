# Validation Summary: How to Find the Valid Host Range in a Subnet

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- CIDR
- Subnetting
- Python
- Python `ipaddress` module

## Sources Consulted
- Python Standard Library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The post stated the `network + 1` and `broadcast - 1` rule as if it applied to every IPv4 subnet. I corrected that wording to scope it to `/0` through `/30`, and added the `/31` and `/32` special cases because RFC 3021 and Python's `ipaddress` documentation treat those differently.
- The `host_range()` example built `list(net.hosts())`, which does not scale to large networks and was not actually computing the range directly from the network metadata. I rewrote the example to use `network_address`, `broadcast_address`, `num_addresses`, and explicit `/31` and `/32` handling.
- The final takeaway described `network.hosts()` as a generator that always excludes network and broadcast addresses. Python documents it as an iterator, and for IPv4 `/31` it includes both addresses while `/32` returns the single host address. I corrected that explanation and updated the usable-host example to match.

## Review Notes
- The corrected Python examples were executed locally with `python3` and produced the expected results for the documented sample subnets.
