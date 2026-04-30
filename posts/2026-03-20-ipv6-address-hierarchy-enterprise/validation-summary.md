# Validation Summary: How to Plan an IPv6 Address Hierarchy for an Enterprise Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- Enterprise address planning and route summarization
- Python `ipaddress`
- IPAM documentation

## Sources Consulted
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation" https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4291, "IP Version 6 Addressing Architecture" https://www.rfc-editor.org/rfc/rfc4291
- RFC 5375, "IPv6 Unicast Address Assignment Considerations" https://www.rfc-editor.org/rfc/rfc5375.html
- Python Standard Library documentation for `ipaddress` https://docs.python.org/3/library/ipaddress.html
- RFC 6164, "Using 127-Bit IPv6 Prefixes on Inter-Router Links" https://www.rfc-editor.org/rfc/rfc6164.html

## Issues Found
- The post used `2001:db8:corp::/48` as its example enterprise prefix. That is not a valid IPv6 prefix because hextets may contain only hexadecimal digits. I replaced it with the valid documentation prefix `2001:db8:1000::/48` throughout the post and Python example, consistent with RFC 3849 and Python's `ipaddress` parser.
- The scheme label `FSZZ` did not match the bit assignments shown in the article. I corrected it to `RSFV` so the label matches the documented Region, Site, Function, and VLAN layout.
- The second nibble was described as `00-ff = up to 16 sites per region`, which was mathematically inconsistent. A single nibble is `0-f`, so I corrected the text and the branch summary count to 16 sites per region.
- Several hierarchy examples in the Mermaid diagram did not match the function nibble mapping in the text. I corrected the HQ management, user LAN, and server examples so the sample `/64` values align with the documented nibble assignments.
- The data center examples reused function values in ways that contradicted the function mapping table. I updated those example prefixes so the third nibble remains consistent with the documented function definitions.
- The Python example's `vlan_id` metadata did not match the nibble-based VLAN examples shown in the article. I aligned the sample metadata with the corrected subnet IDs.

## Review Notes
RFC 6164 recommends `/127` prefixes on inter-router point-to-point links. This post is still technically valid as an address-planning guide built around `/64` subnet IDs, but implementers may choose `/127` when assigning actual router interfaces on point-to-point links.
