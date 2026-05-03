# Validation Summary: How to Debug IGMP Querier Election Problems

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IGMP (Internet Group Management Protocol) v2 and v3
- IP Multicast
- Cisco IOS (IGMP snooping, querier configuration, query intervals)
- Linux kernel IGMP (`force_igmp_version` sysctl, `ip maddr`)
- tcpdump (filter expressions for IGMP)
- iptables (IGMP protocol rules)
- pimd / smcroute (mentioned)

## Sources Consulted
- [RFC 2236 - Internet Group Management Protocol, Version 2](https://datatracker.ietf.org/doc/html/rfc2236)
- [RFC 3376 - Internet Group Management Protocol, Version 3](https://datatracker.ietf.org/doc/html/rfc3376)
- [Cisco IP Multicast: IGMP Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti_igmp/configuration/xe-3se/5700/imc-igmp-xe-3se-5700-book/imc_igmp.html)
- [Cisco Catalyst 3750-X/3560-X IGMP Configuration](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3750x_3560x/software/release/15-2_2_e/multicast/configuration_guide/b_mc_1522e_3750x_3560x_cg/b_ipmc_3750x_3560x_chapter_01000.pdf)
- [Linux force_igmp_version sysctl reference (sysctl-explorer)](https://sysctl-explorer.net/net/ipv4/force_igmp_version/)
- [iptables(8) man page](https://linux.die.net/man/8/iptables)
- [IBM: Configuring iptables for IP multicast](https://www.ibm.com/support/pages/configuring-iptables-ip-multicast)

## Issues Found

1. **Incorrect destination address in tcpdump comment (Step 3)** — The comment claimed General Queries are sent to "224.0.0.1 or 224.0.0.22". 224.0.0.22 is the IGMPv3 *Membership Report* destination (the all-IGMPv3-routers group), not a General Query destination. General Queries always go to 224.0.0.1 (the all-systems group) in both IGMPv2 and IGMPv3. Updated the comment to clarify that 224.0.0.1 is the all-systems group used for General Queries.

2. **Inaccurate phrasing about IGMP version mismatches (Step 4)** — The original text "An IGMPv3-only router will not respond to IGMPv2 queries, and vice versa" is technically incorrect because routers *send* queries; they do not respond to them (hosts respond to queries). Reworded to: "Mixed IGMP versions on a segment can cause membership reports to be misinterpreted - an IGMPv2-only router will not understand IGMPv3 reports, and IGMPv3 hosts may not downgrade to v2 reports as expected." This preserves the practical advice while being technically accurate about how IGMP versioning works.

## Review Notes

- The "typically 255 seconds" Other Querier Present Interval is correct using RFC 2236 default values (Robustness=2, Query Interval=125s, Query Response Interval=10s → 2×125 + 0.5×10 = 255s). However, Cisco IOS uses a default Query Interval of 60 seconds, which yields ~125 seconds. Both are common defaults depending on the platform; the post's number is consistent with the RFC defaults and is fine as written.
- The Cisco IOS IGMP snooping querier commands (`ip igmp snooping vlan 20 querier [address|version]`) and query interval commands (`ip igmp query-interval`, `ip igmp query-max-response-time`) are valid and match Cisco documentation.
- The Group Membership Interval formula `Query Interval × Robustness + Max Response Time` matches RFC 2236 Section 8.4.
- The `force_igmp_version` sysctl path and value semantics (1=v1, 2=v2, 0/other=v3) are correct.
- The `iptables -p igmp -j ACCEPT` form is valid; iptables recognizes "igmp" as a protocol name (IP protocol 2).
- The `ip maddr show` and `show ip igmp snooping querier vlan <n>` commands are valid.
