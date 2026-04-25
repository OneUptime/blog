# Validation Summary: How to Plan an IPv4 Addressing Scheme for Your Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- CIDR and route summarization
- Subnetting and VLSM
- VLAN-to-subnet planning
- Python `ipaddress` standard library

## Sources Consulted
- Python Standard Library: `ipaddress` module https://docs.python.org/3/library/ipaddress.html
- Python documentation: An introduction to the `ipaddress` module https://docs.python.org/3/howto/ipaddress.html
- RFC 1918: Address Allocation for Private Internets https://www.rfc-editor.org/rfc/rfc1918.html
- RFC 4632: Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan https://www.rfc-editor.org/rfc/rfc4632.html

## Issues Found
- The Site A `/16` example labeled `65,534 addresses`, but a `/16` contains 65,536 total addresses and 65,534 traditional usable host addresses. I corrected the wording to `65,534 usable hosts` to match the count shown.
- The original `allocate_subnets()` Python example misused `address_exclude()` and `subnets()`, which produced incorrect allocations that could overlap or skip unexpectedly. I replaced it with a working sequential allocator that uses `IPv4Network.subnets(new_prefix=...)` to find the next aligned subnet inside the parent block.
- The Python example comments and output referred to `hosts` while using `num_addresses - 2`, which is specifically a usable-host calculation for the shown subnet sizes. I updated those labels to `usable hosts` for technical precision.

## Review Notes
- The guidance to leave 2x growth room and to align VLAN IDs with the third octet is operational best practice rather than an RFC requirement, but it is technically reasonable as presented.
- The corrected Python example demonstrates sequential aligned allocation within a parent prefix. It does not try to recreate the earlier site plan's intentionally spaced subnet numbering.
