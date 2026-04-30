# Validation Summary: How to Identify Reserved IPv4 Addresses

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv4 addressing
- IANA special-purpose IPv4 allocations
- IPv4 multicast address space
- Python `ipaddress` module
- RFC-based network design conventions

## Sources Consulted
- IANA IPv4 Special-Purpose Address Space: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- IANA IPv4 Multicast Address Space: https://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 6890, Special-Purpose IP Address Registries: https://www.rfc-editor.org/rfc/rfc6890
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737
- RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space: https://www.rfc-editor.org/rfc/rfc6598
- RFC 2544, Benchmarking Methodology for Network Interconnect Devices: https://www.rfc-editor.org/rfc/rfc2544.html

## Issues Found
- The section heading implied every listed block came from the IANA IPv4 Special-Purpose Address Registry. I changed it to `Common Special-Purpose IPv4 Blocks` because the multicast range is maintained in IANA's separate IPv4 Multicast Address Space registry.
- The Python example used `IPv4Address.is_private` as if it meant RFC 1918 only, and used `is_reserved` as if it covered all special-purpose space. In current Python, that misclassifies several examples, including `0.0.0.0`, `192.0.2.1`, `240.0.0.1`, and `255.255.255.255`, while leaving `100.64.0.1` as `Unknown`. I replaced the classification logic with explicit `IPv4Network` membership checks and kept `is_global` only as a fallback for public addresses.
- I updated a few references and labels to match current authoritative sources: `0.0.0.0/8` now cites RFC 791, `127.0.0.0/8` cites RFC 1122, `192.0.0.0/24` cites RFC 6890, and `240.0.0.0/4` is labeled `Reserved` to match the IANA registry.

## Review Notes
- Python 3.13 adjusted `ipaddress.is_private` handling for several special-purpose ranges. Explicit network checks are more reliable than semantic flags when the goal is to label specific IPv4 categories such as documentation, benchmarking, shared space, or limited broadcast.
- The post remains intentionally selective rather than exhaustive. For example, IANA tracks narrower assignments inside `192.0.0.0/24` and many multicast sub-ranges, but the corrected post is technically accurate for the ranges it covers.
