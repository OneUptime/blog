# Validation Summary: How to Identify IPv6 Address Types from Their Prefix

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv6 addressing architecture
- IPv6 special-purpose and transition prefixes
- IPv6 multicast scopes
- Python `ipaddress` standard library

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 3056, Connection of IPv6 Domains via IPv4 Clouds: https://www.rfc-editor.org/rfc/rfc3056
- RFC 4380, Teredo: Tunneling IPv6 over UDP through NATs: https://www.rfc-editor.org/rfc/rfc4380
- RFC 7346, IPv6 Multicast Address Scopes: https://www.rfc-editor.org/rfc/rfc7346
- RFC 3849, IPv6 Documentation Address: https://www.rfc-editor.org/rfc/rfc3849
- RFC 9637, Expanding the IPv6 Documentation Space: https://www.rfc-editor.org/rfc/rfc9637
- RFC 7526, Deprecating the Anycast Prefix for 6to4 Relay Routers: https://www.rfc-editor.org/rfc/rfc7526
- IANA IPv6 Special-Purpose Address Space: https://www.iana.org/assignments/iana-ipv6-special-registry/
- IANA IPv6 Global Unicast Address Space: https://www.iana.org/assignments/ipv6-unicast-address-assignments/
- IANA IPv6 Multicast Address Space: https://www.iana.org/assignments/ipv6-multicast-addresses/

## Issues Found
- The post treated anycast as prefix-identifiable. I removed the `Anycast` tag and corrected the introduction and conclusion because RFC 4291 states that anycast uses unicast syntax and is not syntactically distinguishable by prefix alone.
- The global-unicast example used `2001:db8::1`, which is documentation space rather than real global unicast. I replaced it with a true global-unicast example and corrected the allocated-space examples in the later comparison block.
- The documentation section was outdated because it only listed `2001:db8::/32`. I added `3fff::/20`, which RFC 9637 added in 2024, and updated the Python detector to recognize both documentation prefixes.
- The 6to4 row incorrectly labeled `2002::/16` as deprecated and used a private-IPv4-derived example. I removed the deprecation note and replaced the example with a valid 6to4-form address. RFC 7526 deprecates the 6to4 anycast relay mechanism, not the `2002::/16` prefix itself.
- The Teredo example `2001::...` was not a valid IPv6 literal. I replaced it with a syntactically valid example in the Teredo prefix.
- The IPv4-compatible example used `::192.168.1.1`, which embeds a private IPv4 address. I replaced it with a public-IPv4-based example consistent with RFC 4291’s requirement for an IPv4-compatible address.
- The Python detector used `IPv6Address.is_private` as if it meant “ULA only.” Current Python documentation defines `is_private` in terms of the IANA special registries, so the original code would misclassify documentation, 6to4, Teredo, and IPv4-mapped addresses. I replaced that logic with explicit prefix checks and `ipaddress` helper properties.
- The multicast scope helper omitted scope `0x3`, and the multicast scope breakdown omitted realm-local scope. I added realm-local handling per RFC 7346, switched scope extraction to a bit-based implementation, and corrected `ff02::1:2` to “DHCP relay agents and servers.”

## Review Notes
- IPv4-compatible addresses are deprecated and mainly of historical interest.
- 6to4 and Teredo are legacy transition mechanisms; the post is now accurate for identification purposes, but they should not be presented as preferred modern deployment choices.
- RFC 9637 added `3fff::/20` as an additional IPv6 documentation prefix in August 2024, so older IPv6 references often omit it.
