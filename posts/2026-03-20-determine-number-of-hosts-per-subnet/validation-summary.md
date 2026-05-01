# Validation Summary: How to Determine the Number of Hosts per Subnet

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv4
- CIDR
- Subnetting
- Python

## Sources Consulted
- RFC 3021, "Using 31-Bit Prefixes on IPv4 Point-to-Point Links": https://www.rfc-editor.org/rfc/rfc3021
- RFC 4632, "Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan": https://www.rfc-editor.org/rfc/rfc4632
- Python Standard Library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python Standard Library `math` documentation: https://docs.python.org/3/library/math.html

## Issues Found
- The post described the `2^host_bits - 2` rule too broadly in the description and formula explanation. I scoped that wording to standard subnets because `/31` and `/32` are explicit exceptions.
- The `/31` row and takeaway did not state that RFC 3021 applies this behavior to point-to-point links. I clarified that limitation.
- The `prefix_for_hosts()` helper was written as a generic smallest-prefix calculator even though its formula excludes `/31` and `/32`. I updated the docstring, added input validation, and clarified in comments that the shortcut is for standard subnets and that `/31` and `/32` must be handled separately.
- The final takeaway said to always add 2 before calculating a prefix. I corrected that to apply only to standard subnets.

## Review Notes
- The Python examples are syntactically valid and were also executed locally with Python 3.12.3 during review.
- `/32` is accurately described as a host route with one address, and Python's `ipaddress` documentation matches the post's usable-host treatment for `/31` and `/32`.
