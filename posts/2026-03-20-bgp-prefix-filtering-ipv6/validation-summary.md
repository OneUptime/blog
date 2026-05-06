# Validation Summary: How to Configure BGP Prefix Filtering for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- BIRD 2
- FRRouting
- Cisco IOS
- bgpq4
- OneUptime

## Sources Consulted
- IANA IPv6 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 5156, Special-Use IPv6 Addresses: https://www.rfc-editor.org/rfc/rfc5156.html
- RFC 3879, Deprecating Site Local Addresses: https://www.rfc-editor.org/rfc/rfc3879.html
- RFC 7454, BGP Operations and Security: https://www.rfc-editor.org/rfc/rfc7454.html
- BIRD 2.16 User's Guide: https://bird.nic.cz/doc/bird-2.16.2.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS IPv6 Command Reference (`ipv6 prefix-list`): https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco IOS IP Routing: BGP Command Reference (`neighbor prefix-list`): https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco IOS XE Multiprotocol BGP for IPv6 guidance: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-3/configuration_guide/rtng/b_173_rtng_9600_cg/implementing_multiprotocol_bgp_for_ipv6.html
- bgpq4 official documentation: https://github.com/bgp/bgpq4
- OneUptime IP monitor documentation: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime SNMP monitor documentation: https://oneuptime.com/docs/monitor/snmp-monitor

## Issues Found
- The bogon list incorrectly treated `::/8` as the unspecified range and included prefixes such as `64:ff9b::/96`, `2001::/32`, and `2002::/16` as never-valid bogons. I replaced `::/8` with `::/128`, removed the prefixes that are not blanket bogons for Internet BGP filtering, and clarified the list as a common baseline.
- The BIRD example used a `function` with `accept`/`reject`, but BIRD requires a named `filter` for that pattern. I converted it to `filter ipv6_import_filter`, added the mandatory `local as 64496;`, fixed the invalid neighbor example address, and removed the unsubstantiated `/19` broad-prefix rejection line.
- The FRR example was incomplete for IPv6 BGP because the neighbor was not activated under `address-family ipv6 unicast`. I added `neighbor 2001:db8::1 activate`, fixed the example address, and aligned the deny list with the corrected bogon prefixes.
- The Cisco IOS example used `permit ::/0`, which is an exact-match rule and would only permit the default route. I changed it to `permit ::/0 le 48`, added `neighbor ... activate`, and corrected the bogon entries to match Cisco prefix-list semantics.
- The `bgpq4` examples used undocumented placeholders (`%p` as written in the post), reused `%n` as though it were a sequence number, and used an invalid `-Z` flag. I replaced them with documented `-l` and `-s` examples from the official `bgpq4` documentation.
- The monitoring paragraph implied direct BGP-session/prefix-count monitoring in OneUptime without explaining the mechanism. I corrected it to describe monitoring via IP reachability and SNMP-exposed router metrics, which matches the current OneUptime product documentation.

## Review Notes
- The bogon list is a baseline, not an exhaustive copy of the evolving IANA special-purpose registry. Operators should periodically refresh static filters against the IANA registry.
- The `/48` maximum-length filter is a common Internet routing policy and is consistent with RFC 7454's discussion of prevailing operational practice, but accepted maximum lengths can vary by peer and use case.
