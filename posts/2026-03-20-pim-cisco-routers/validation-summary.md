# Validation Summary: How to Set Up PIM (Protocol Independent Multicast) on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE IP multicast routing
- PIM Sparse Mode (PIM-SM)
- PIM Dense Mode (PIM-DM)
- Auto-RP and static Rendezvous Point (RP) configuration
- IGMP
- Reverse Path Forwarding (RPF)

## Sources Consulted
- Cisco IOS IP Multicast Command Reference: `ip multicast-routing` and multicast routing command behavior  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti/command/imc-cr-book/imc_i2.html
- Cisco IOS IP Multicast Command Reference: `ip pim query-interval`, `ip pim rp-address`, and `ip pim autorp listener`  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti/command/imc-cr-book/imc_i3.html
- Cisco IOS IP Multicast Command Reference: `show ip pim interface`, `show ip pim neighbor`, `show ip pim rp mapping`, and `show ip pim tunnel`  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti/command/imc-cr-book/imc_s1.html
- Cisco AutoRP Enhancement documentation  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti_pim/configuration/xe-3se/3850/imc-pim-xe-3se-3850-book/imc_autorp.html
- Cisco Verifying IP Multicast Operation guide  
  https://www.cisco.com/en/US/docs/ios/ipmulti/configuration/guide/imc_verify_op.html
- Cisco Troubleshoot Multicast Networks with CLI Tools  
  https://www.cisco.com/c/en/us/support/docs/ip/ip-multicast/13726-57.html
- RFC 4601: Protocol Independent Multicast - Sparse Mode (PIM-SM): Protocol Specification (Revised)  
  https://www.rfc-editor.org/rfc/rfc4601
- RFC 3973: Protocol Independent Multicast - Dense Mode (PIM-DM): Protocol Specification (Revised)  
  https://datatracker.ietf.org/doc/html/rfc3973

## Issues Found
- The example `ip multicast-routing distributed` line was too generic for a broad Cisco IOS guide. The `distributed` keyword is platform and release specific, so I changed it to a note instead of leaving it as a default copy-paste command.
- The static RP verification command used `show ip pim rp`, which Cisco documents as showing active RPs cached with associated multicast routing entries. I changed this to `show ip pim rp mapping`, which is the correct command to verify RP mappings.
- The Auto-RP section said sparse-dense mode was required on all interfaces. Cisco documents two valid approaches: sparse-dense mode on transit interfaces, or `ip pim autorp listener` with interfaces left in sparse mode. I corrected the wording to remove the false requirement.
- The troubleshooting section used `show ip pim neighbor detail`, which is not documented in the Cisco IOS PIM command reference. I replaced it with `show ip pim neighbor`.
- The troubleshooting section used `show ip mroute count 239.1.1.1`, which does not match the documented argument order. I changed it to `show ip mroute 239.1.1.1 count`.
- The troubleshooting section used `show ip pim state`, which is not a documented Cisco IOS command in the referenced command set. I replaced it with `show ip mroute 239.1.1.1` to inspect multicast forwarding state for the group.
- The DR election explanation implied highest IP always wins. Cisco documents that highest DR priority wins first, and highest IP is only the tiebreaker when priorities are equal. I corrected that explanation.
- The multicast ping guidance claimed the ping would go to all group members and that all receivers should reply. Cisco documents multicast ping as a router-based reachability test for routers configured to respond, typically with `ip igmp join-group`. I simplified the command to `ping <group>` and corrected the explanation.

## Review Notes
- Auto-RP is Cisco-specific. Cisco also documents BSR as the standards-based RP discovery mechanism, but the post remains technically valid without adding a BSR section.
- PIM dense mode is still documented, but it is generally a niche or lab-oriented deployment model compared with PIM-SM in modern enterprise networks.
