# Validation Summary: How to Configure IPv6 Policy Routing in SD-WAN

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `iproute2` IPv6 policy routing
- Linux `nftables`
- Cisco IOS XE IPv6 policy-based routing
- Juniper Junos IPv6 filter-based forwarding / policy-based routing
- IPv6 addressing and traffic class / DSCP handling

## Sources Consulted
- Linux `ip-rule(8)` manual: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- nftables wiki, Setting packet metainformation: https://wiki.nftables.org/wiki-nftables/index.php/Setting_packet_metainformation
- nftables wiki, Matching packet headers: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- nftables wiki, Quick reference-nftables in 10 minutes: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- Cisco IPv6 policy-based routing documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-36s-book/ip6-pol-bsd-rtng.html
- Cisco IPv6 ACL documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_data_acl/configuration/xe-16-11/sec-data-acl-xe-16-11-book.pdf
- Juniper filter-based forwarding overview: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-option-filter-based-forwarding-overview.html
- Juniper example for `next-ip6` / filter-based forwarding: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/topic-map/filter-based-forwarding-policy-based-routing.html
- Juniper IPv6 firewall filter match conditions: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper firewall filter actions: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-actions-nonterminating.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849

## Issues Found
- The post used multiple invalid IPv6 literals such as `2001:db8:mpls::gateway`, `2001:db8:lan::/64`, and similar non-hex placeholders. These are not valid IPv6 addresses. I replaced them with valid documentation-prefix examples under `2001:db8::/32` per RFC 3849.
- The Linux example re-added the default RPDB `main` rule at priority `32766`. Linux already installs the `local`, `main`, and `default` RPDB rules automatically, so I removed that extra command and replaced it with a note.
- The Linux section described DSCP matching using `ip rule tos` values without clarifying that Linux is matching the full 8-bit traffic class field. I corrected the comments so the examples explicitly describe `0xb8` and `0x88` as traffic-class values corresponding to DSCP EF and AF41 with ECN bits set to `00`.
- The nftables section mixed nftables rules with separate `ip6tables` MARK commands even though the section was explicitly about nftables. I standardized the example on nftables-only marking, removed the stray `ip6tables` commands, and updated the verification command to inspect nftables counters instead of `ip6tables`.
- The original nftables-based `fwmark` rules reused the same priorities as earlier `ip rule` examples, which could create ambiguous ordering if a reader applied both sections together. I moved the `fwmark` rules to higher-priority values (`90`-`92`) so they evaluate before the later source / traffic-class rules.
- The Cisco IOS XE example applied three separate `ipv6 policy route-map` statements to a single interface. IOS XE applies one route map on the interface, with multiple numbered entries inside that route map. I consolidated the example into a single `route-map PBR-IPV6` with sequence numbers `10`, `20`, and `30`.
- The Juniper example used an invalid / misleading combination of IPv6 filter matching and forwarding behavior for a generic IPv6 PBR example. I replaced it with documented `traffic-class` matches and `next-ip6` actions, plus a source-prefix match for bulk traffic, which aligns with Junos filter-based forwarding documentation.
- The verification examples still referenced invalid IPv6 literals and legacy `ip6tables` counters. I updated them to use valid documentation-prefix addresses, `mark 200` route lookup testing, and `nft list chain` for hit counters.

## Review Notes
- Junos `next-ip6` and other filter-based forwarding actions are platform and release dependent. The corrected syntax is documented by Juniper, but operators should still confirm support for their exact platform and Junos release in Feature Explorer and platform-specific docs.
- Linux `ip rule tos` matches the entire traffic-class byte, including ECN bits. In environments where ECN bits may vary, matching DSCP in nftables and steering with `fwmark` is more precise than relying on exact `tos` values alone.
