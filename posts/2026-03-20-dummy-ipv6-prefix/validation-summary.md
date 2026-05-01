# Validation Summary: How to Understand the Dummy IPv6 Prefix (100:0:0:1::/64)

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv6 special-purpose address allocations
- IETF RFCs
- Python `ipaddress`
- MPLS OAM / BFD
- Geneve active OAM

## Sources Consulted
- RFC 9780: https://www.rfc-editor.org/info/rfc9780
- RFC 9780 HTML: https://www.rfc-editor.org/rfc/rfc9780.html
- RFC 6666: https://www.rfc-editor.org/rfc/rfc6666
- IANA IPv6 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 9772: https://www.rfc-editor.org/rfc/rfc9772.html
- RFC 4291: https://www.rfc-editor.org/rfc/rfc4291.html
- Python `ipaddress` docs: https://docs.python.org/3/library/ipaddress.html
- `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The post cited the wrong RFC. `100:0:0:1::/64` is the Dummy IPv6 Prefix allocated by RFC 9780, not RFC 9003. I corrected the tags, description, narrative text, and Python labels.
- The post incorrectly stated that `100:0:0:1::/64` is a /64 within `100::/64`. These are separate /64 allocations in the IANA special-purpose registry. I corrected the relationship section and updated the conclusion accordingly.
- The post described the prefix as a generic routing placeholder for BGP/OSPF/route-reflector scenarios. RFC 9780 standardizes it for specific IP/UDP-encapsulated management, control, and OAM traffic instead. I replaced the unsupported routing-placeholder examples with RFC-backed use cases and protocol examples.
- The Python example inherited the incorrect prefix relationship and mislabeled `100:0:0:2::1` as discard-only. I updated the classifier to treat the dummy prefix and discard-only prefix as separate ranges and fixed the test expectation.
- One Linux command example used invalid syntax: `ip -6 route add 100:0:0:1::/64 dev null`. The `ip route` syntax does not define a `null` device for this purpose. Because the surrounding routing-placeholder section was itself incorrect, I removed that example when replacing the section with RFC-backed material.

## Review Notes
The post is now technically accurate, but this prefix should be presented as a protocol-specific special-purpose allocation rather than a general operational null-route convention. Local discard routes may still be an operator policy choice, but that is separate from what RFC 9780 standardizes.
