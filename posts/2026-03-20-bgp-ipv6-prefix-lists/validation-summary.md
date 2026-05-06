# Validation Summary: How to Configure BGP IPv6 Prefix Lists

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- FRRouting (FRR)
- Cisco IOS / IOS XE
- IPv6 prefix lists

## Sources Consulted
- FRRouting Filtering documentation: https://docs.frrouting.org/en/latest/filter.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- Cisco IOS IPv6 Command Reference (`ipv6 prefix-list`): https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco IOS XE IPv6 BGP configuration guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-9/configuration_guide/ipv6/b_169_ipv6_9500_cg/configuring_multiprotocol_bgp_extensions_for_ipv6.html
- RFC 4193: https://www.rfc-editor.org/rfc/rfc4193
- RFC 4291: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849: https://www.rfc-editor.org/rfc/rfc3849
- RFC 6666: https://www.rfc-editor.org/rfc/rfc6666

## Issues Found
- Replaced invalid example IPv6 literals such as `2001:db8:peer::/48` and `2001:db8:peer::2` with valid hexadecimal IPv6 addresses. `peer` is not a valid hextet, so the original examples were syntactically invalid.
- Added `neighbor ... activate` to the FRRouting and Cisco BGP address-family examples. Both FRR and Cisco document that IPv6 unicast neighbors must be activated under the IPv6 address family unless defaults are changed.
- Corrected the FRRouting inspection examples from `show ipv6 prefix-list ...` to the documented `show ip prefix-list ...` commands, and replaced the unsupported prefix test example with the documented `debug prefix-list ... match ...` form.
- Fixed the discard-prefix bogon rule from `deny 100::/64` to `deny 100::/64 le 128`. Without `le 128`, the rule only matches the exact `/64` and would miss more-specific routes inside that block.
- Corrected the bogon section wording so `::/0` is not described as an invalid/unroutable prefix. The default route may be intentionally filtered, but it is not itself a bogon.
- Corrected the summary’s prefix-list behavior. IPv6 prefix lists have an implicit deny at the end; they do not have implicit permit behavior.
- Corrected the summary refresh command to the documented form that includes both the peer and direction: `clear bgp ipv6 unicast <peer> soft in|out`.

## Review Notes
- The bogon example is technically valid after correction, but it is illustrative rather than exhaustive. In production environments, operators often prefer a maintained list based on current IANA special-purpose allocations and local policy.
