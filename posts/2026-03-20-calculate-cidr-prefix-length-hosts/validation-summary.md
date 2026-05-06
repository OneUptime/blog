# Validation Summary: How to Calculate CIDR Prefix Length for a Given Number of Hosts

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting
- CIDR prefix notation
- Python
- Python `math` module

## Sources Consulted
- Python `math` module documentation: https://docs.python.org/3/library/math.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 3021, "Using 31-Bit Prefixes on IPv4 Point-to-Point Links": https://www.rfc-editor.org/rfc/rfc3021
- RFC 4632, "Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan": https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The description, formula explanation, and takeaway language were too absolute. They implied the `hosts + 2` rule always applies, but `/31` point-to-point links and `/32` host routes are exceptions. I changed the wording to scope the formula to standard IPv4 subnets and updated the takeaway text accordingly.
- The `hosts_from_prefix()` example incorrectly reported `0` usable hosts for `/31` and `/32`. I added the required special-case handling so `/31` returns `2` usable addresses for RFC 3021 point-to-point links and `/32` returns `1` address for a host route.
- The edge-case notes explicitly called out the `/31` exception but did not explain that the standard formula also differs from `/32` host-route behavior. I added that clarification.

## Review Notes
- The main `prefix_for_hosts()` example intentionally remains a standard-subnet calculation. It does not automatically choose `/31` or `/32`, which is appropriate as long as the post clearly labels those as special cases.
- The Python snippets are syntactically valid and rely only on current standard-library APIs.
