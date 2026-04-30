# Validation Summary: How to Plan IPv6 Address Allocation Hierarchies in IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnet planning
- IPAM hierarchy design
- NetBox
- pynetbox
- Python

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- NetBox prefix model documentation: https://netbox.readthedocs.io/en/feature/models/ipam/prefix/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- pynetbox IPAM documentation: https://pynetbox.readthedocs.io/en/stable/IPAM.html
- pynetbox endpoint documentation: https://pynetbox.readthedocs.io/en/v6.6.2/endpoint.html
- pynetbox source for `Endpoint.create()`: https://raw.githubusercontent.com/netbox-community/pynetbox/refs/heads/master/pynetbox/core/endpoint.py

## Issues Found
- The sample output for `describe_hierarchy("2001:db8::/32")` was incorrect. The function calculates immediate child allocations, so the correct result is `16 /36` prefixes, not `65,536 /48` prefixes. I updated the commented output to match the code's actual behavior.
- The `decode_address()` example parsed IPv6 text by splitting on `:`, which breaks for compressed forms such as `2001:db8::1`. I updated the example to normalize addresses with `ipaddress.IPv6Address(...).exploded` and to return `{}` for invalid input, which makes the example consistent with valid IPv6 parsing rules in the Python standard library.

## Review Notes
- The use of `2001:db8::/32` is appropriate for documentation examples per RFC 3849.
- The guidance to allocate `/64` per VLAN/subnet is consistent with current IPv6 addressing practice and RFC 7421's discussion of the 64-bit interface identifier boundary.
- Actual top-level IPv6 allocation sizes vary by provider, RIR policy, and organization type; this post uses a `/32` as an example hierarchy root rather than a universal assignment size.
