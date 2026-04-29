# Validation Summary: How to Manage IPv6 Prefix Assignments for Multiple Sites

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnet planning
- Python `ipaddress`
- NetBox IPAM
- `pynetbox`
- BGP summarization
- Cisco IOS/IOS-XE

## Sources Consulted
- Python `ipaddress` library documentation: https://docs.python.org/3.15/library/ipaddress.html
- NetBox Prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- `pynetbox` endpoint documentation: https://pynetbox.readthedocs.io/en/stable/endpoint.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- Cisco IOS IPv6 Command Reference, `aggregate-address`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_01.html

## Issues Found
- The first Python example computed the `/64` subnet incorrectly by masking the IPv6 integer with a 64-bit constant and then passing a small integer to `ipaddress.ip_address()`. In Python, integers below `2**32` are treated as IPv4 by `ip_address()`, so the example raised a `ValueError` instead of producing IPv6 prefixes. I changed the code to add the 16-bit subnet ID at the correct bit position and construct the result as an `IPv6Network`.
- The inline comment in the first Python example described the inserted field as "VLAN nibbles," which was inaccurate for a `/48` to `/64` derivation. I corrected it to describe the 16-bit subnet ID at bits 49-64, matching RFC 4291's IPv6 global unicast structure.
- The NetBox example used the `site` field when creating prefixes. Current NetBox documentation states that the Prefix model's `site` field was replaced by `scope` in NetBox v4.2, and the REST API examples use `scope_type` and `scope_id`. I updated the example to use `scope_type=\"dcim.site\"` and `scope_id=site.id`.
- The NetBox example built child `/64` prefixes using fragile string manipulation and included an unused `rstrip(\":/48\")` expression that would not behave as a suffix removal. I replaced the subnet construction with `ipaddress`-based IPv6 math so the example produces correct `/64` prefixes from the site `/48`.
- The NetBox example abbreviated `workstations` as `wrkstns`, which broke the article's claim of a consistent VLAN-to-prefix template across sites. I aligned the label with the earlier template.
- The conclusion said the template uses the same "4-bit VLAN code" at each site. The template values are 16-bit subnet IDs represented as four hexadecimal digits, so I corrected the wording to "16-bit subnet ID."

## Review Notes
- The article's use of `/48` per site is technically valid for an internal enterprise addressing plan carved from an organizational aggregate, but RFC 6177 clarifies that `/48` is not a universal default recommendation for all IPv6 end sites.
- The Cisco IOS/IOS-XE `aggregate-address ... summary-only` example is consistent with Cisco documentation, and the explanation that `summary-only` suppresses advertisement of more-specific routes is accurate.
