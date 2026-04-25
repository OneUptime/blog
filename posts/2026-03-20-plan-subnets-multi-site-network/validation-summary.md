# Validation Summary: How to Plan Subnets for a Multi-Site Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting
- RFC 1918 private addressing
- Point-to-point WAN addressing with /30 and /31
- Python `ipaddress`
- FRRouting BGP route aggregation

## Sources Consulted
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 1918, Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918.html
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021.html

## Issues Found
- The design principle that suggested using `/20` for smaller sites was too broad alongside the post's VLAN-to-third-octet mapping scheme. I changed it to clarify that a `/20` only works when the site's VLAN numbering plan still fits inside that smaller block, because the sample layout uses VLAN IDs that would not fit arbitrarily inside every `/20`.
- The FRRouting example implied that `aggregate-address 10.0.0.0/16 summary-only` alone is sufficient to originate the summary. I corrected the surrounding sentence to note that the contributing more-specific routes must already be present in the BGP table, which matches FRRouting's documented behavior.

## Review Notes
- The Python examples are syntactically correct and run as written with Python 3.12; `IPv4Network.subnets(new_prefix=30)`, `IPv4Network.hosts()`, and `num_addresses` behave as the post expects.
- The recommendation to use `/30` or `/31` for point-to-point links is technically correct. The code sample demonstrates `/30`; `/31` is valid for point-to-point links per RFC 3021.
