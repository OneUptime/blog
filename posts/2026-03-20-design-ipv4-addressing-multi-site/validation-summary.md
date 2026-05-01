# Validation Summary: How to Design an IPv4 Addressing Scheme for a Multi-Site Enterprise

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- CIDR subnetting and route summarization
- RFC 1918 private address space
- WAN point-to-point addressing
- Python `ipaddress`
- IP address management (IPAM)

## Sources Consulted
- Python Standard Library: `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 1918, Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632
- RFC 2328, OSPF Version 2: https://www.rfc-editor.org/rfc/rfc2328

## Issues Found
- The `/22` site allocations for NYC, Chicago, Dallas, and LA were not aligned to valid `/22` network boundaries. They were corrected to `10.1.0.0/22`, `10.1.4.0/22`, `10.1.8.0/22`, and `10.1.12.0/22` so the CIDR examples are valid.
- The NYC site-range and VLAN examples were derived from the invalid `10.1.1.0/22` block, so the site summary and VLAN subnets were corrected to match the valid `10.1.0.0/22` allocation.
- The Python `ipaddress` example used `ip_network('10.1.1.0/22')`, which raises `ValueError` because `ip_network()` requires a valid network address when `strict=True` (the default). The example was corrected to use `10.1.0.0/22`.
- The overlap-check loop in the Python example compared each region to itself and printed incorrect "OK" output for self-comparisons. The loop was corrected to compare each region only with later entries in the list.
- The route summarization section incorrectly described advertising RFC 1918 space "to the internet" and reducing routes on "internet-facing routers". RFC 1918 space is not publicly routable, so the wording was corrected to summarization within the enterprise WAN/core.
- The summarization example mixed levels by comparing a regional `/16` aggregate to individual `/24` prefixes even though the site allocations in the post are `/22`. The example was corrected to compare the `/16` regional summary against the individual `/22` site routes.

## Review Notes
- The post is technically correct after the fixes above.
- `/31` prefixes are valid on IPv4 point-to-point links per RFC 3021, but both endpoints must support 31-bit prefixes for that deployment choice to work reliably.
