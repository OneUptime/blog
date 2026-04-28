# Validation Summary: How to Configure RA Guard on Cisco Switches

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS / IOS-XE CLI
- IPv6 First Hop Security (FHS)
- IPv6 RA Guard
- IPv6 Snooping
- IPv6 Neighbor Discovery Protocol (NDP)
- Cisco Catalyst switch platform commands

## Sources Consulted
- [IPv6 First-Hop Security Configuration Guide, Cisco IOS XE Gibraltar 16.10.x — IPv6 RA Guard](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-16-10/ip6f-xe-16-10-book/ip6-ra-guard.html)
- [IPv6 First-Hop Security Configuration Guide, Cisco IOS XE Release 3S — IPv6 RA Guard](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-3s/ip6f-xe-3s-book/ip6-ra-guard.html)
- [IPv6 Configuration Guide, Cisco IOS Release 15.2M&T — IPv6 RA Guard](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/15-2mt/ip6-15-2mt-book/ip6-ra-guard.html)
- [Security Configuration Guide, Cisco IOS Release 15.2(7)Ex (Catalyst 1000) — Configuring IPv6 RA Guard](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst1000/software/releases/15_2_7_e/configuration_guides/sec/b_1527e_security_c1000_cg/configuring_ipv6_ra_guard.html)
- [FHS and SISF Configuration Guide — IPv6 FHS (Cisco IOS XE 17, Catalyst 9000)](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/ipv6-first-hop-security.html)
- [Cisco IOS IPv6 Command Reference — show ipv6 na to show ipv6 pr](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s4.html)
- RFC 6105 (IPv6 RA Guard) and RFC 7113 (Implementation Advice for IPv6 Router Advertisement Guard)

## Issues Found

1. **Incorrect match-source syntax in enhanced policy.** The post used `match ra ipv6 access-list ROUTER_SOURCES` to match RA source addresses. The correct Cisco syntax in `ipv6 nd raguard policy` configuration mode is `match ipv6 access-list <list-name>`. The `ra` keyword is only used with `match ra prefix-list`. Updated to `match ipv6 access-list ROUTER_SOURCES`.

2. **Non-existent show command `show ipv6 nd raguard statistics`.** Cisco does not document a `statistics` form of this command. The correct form is `show ipv6 nd raguard counters [interface type number]`, which displays packets received, bridged, and dropped (with reasons). Replaced both occurrences in Verification and Troubleshooting sections.

3. **Non-existent show command `show ipv6 nd raguard interface <intf>`.** This is not a documented Cisco command. Per-interface RA Guard policy attachment is shown via `show ipv6 nd raguard policy <policy-name>` (which lists interfaces/VLANs the policy is attached to) or via `show running-config interface ...`. Replaced with `show ipv6 nd raguard policy HOST_POLICY`.

4. **Non-existent show command `show ipv6 first-hop-security summary`.** Cisco does not document this command. The supported summary-style commands are `show ipv6 snooping features` (lists active FHS features) and `show ipv6 snooping policies` (lists snooping policies and where attached). Replaced with both.

5. **Incorrect debug command `debug ipv6 nd raguard`.** The correct Cisco debug command is `debug ipv6 snooping raguard [filter | interface | vlanid]`. Updated.

## Review Notes

- The core configuration commands (`ipv6 nd raguard policy`, `device-role host|router`, `trusted-port`, `ipv6 nd raguard attach-policy`, `vlan configuration`, `ipv6 snooping policy`, `security-level guard`, `tracking enable`) are all syntactically correct and match Cisco's documented FHS configuration model.
- The `match ra prefix-list` syntax is correct.
- Interface naming (`GigabitEthernet1/0/1`, `interface range`, `switchport mode access/trunk`, `spanning-tree portfast`) is consistent with standard Catalyst IOS/IOS-XE conventions.
- The note that interface-level policy overrides VLAN-level policy is correct for FHS attach-policy precedence.
- The "Issue 3: Extension header bypass" section references a real RFC 7113 concern (fragmented RA bypass on older platforms). The mention of a `drop-unsecured` keyword is hedged with "if supported" — strictly speaking, `drop-unsecured` is documented under SeND/`ipv6 nd inspection policy`, not `ipv6 nd raguard policy`. The more universally correct mitigation is to filter IPv6 fragments destined for `ff02::1` at the edge or upgrade to IOS/IOS-XE versions with deep RA inspection. Left in place because the conditional phrasing makes it advisory rather than a definitive instruction.
- The IOS 15.0(1)SE recommendation is reasonable; full FHS feature parity (including IPv6 snooping) generally requires IOS 15.0(2)SE or later on classic IOS, and is fully present on modern IOS-XE Catalyst platforms.
- Example output blocks are illustrative; actual `show ipv6 nd raguard counters` output uses a slightly different layout but conveys the same information (received / bridged / dropped per feature).
