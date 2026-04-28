# Validation Summary: How to Configure IPv6 First Hop Security on Cisco IOS

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS / IOS-XE CLI
- IPv6 First Hop Security (FHS) framework
- IPv6 RA Guard
- IPv6 DHCPv6 Guard
- IPv6 Snooping (ND inspection + binding table)
- IPv6 Source Guard
- Cisco Catalyst switch platform commands (2960-S/X, 3560/3750, 3850, 9xxx)
- SDM templates (`sdm prefer dual-ipv4-and-ipv6`)

## Sources Consulted
- [FHS and SISF Configuration Guide — IPv6 FHS (Cisco IOS XE 17, Catalyst 9000)](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/ipv6-first-hop-security.html)
- [Security Configuration Guide, Cisco IOS XE 17.15.x (Catalyst 9300) — Configuring IPv6 First Hop Security](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/sec/b_1715_sec_9300_cg/configuring_ipv6_first_hop_security.html)
- [Security Configuration Guide, Cisco IOS XE Dublin 17.11.x (Catalyst 9500) — Configuring IPv6 First Hop Security](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-11/configuration_guide/sec/b_1711_sec_9500_cg/configuring_ipv6_first_hop_security.html)
- [IPv6 First-Hop Security Configuration Guide, Cisco IOS XE 16.10 — IPv6 Snooping](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-16-10/ip6f-xe-16-10-book/ip6-snooping.html)
- [IPv6 First-Hop Security Configuration Guide — IPv6 RA Guard (IOS XE 16.10)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-16-10/ip6f-xe-16-10-book/ip6-ra-guard.html)
- [IPv6 First-Hop Security Configuration Guide — IPv6 Source Guard and Prefix Guard](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-16/ip6f-xe-16-book/ip6-src-guard.pdf)
- [IPv6 First-Hop Security Binding Table — IOS 15S](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-s/ip6-fhs-bind-table.html)
- [Cisco IOS IPv6 Command Reference — `show ipv6 na` to `show ipv6 pr`](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s4.html)
- [Cisco IOS IPv6 Command Reference — `show ipv6 ri` to `si`](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s5.html)
- Sibling post validation summaries (`2026-03-20-ndp-ra-guard-cisco`, `2026-03-20-ndp-ipv6-source-guard`, `2026-03-20-ndp-nd-inspection`) for cross-checked findings on the same syntax issues
- RFC 6105 (IPv6 RA Guard), RFC 7113 (RA Guard implementation advice)

## Issues Found

1. **Misleading "ipv6 first-hop-security umbrella" wording.** The introduction implied a top-level CLI command `ipv6 first-hop-security`. No such CLI hierarchy exists — FHS is a feature *family* whose components are configured under their own roots (`ipv6 nd raguard policy`, `ipv6 dhcp guard policy`, `ipv6 snooping policy`, `ipv6 source-guard policy`). Reworded to "a coordinated set of features built on the IPv6 Snooping binding table".

2. **Invalid interface command `ipv6 snooping trust`.** Cisco IPv6 Snooping does not expose a standalone `trust` interface keyword. Trusted ports are configured by creating an `ipv6 snooping policy` with the `trusted-port` sub-command and attaching that policy with `ipv6 snooping attach-policy`. Added a `FHS_SNOOP_TRUSTED` policy (with `trusted-port` and `device-role node`) in Step 4, and replaced the bogus interface command in Step 6 with `ipv6 snooping attach-policy FHS_SNOOP_TRUSTED`.

3. **Non-canonical static binding syntax.** The static `ipv6 neighbor binding` example placed the interface before the IPv6 address and used the (deprecated on most platforms) `hardware-address` keyword:
   `ipv6 neighbor binding vlan 10 interface GigabitEthernet1/0/5 2001:db8::1 hardware-address 0011.2233.4455`
   Cisco's documented form is `ipv6 neighbor binding vlan <id> <ipv6-address> interface <int> <mac>`. Reordered to match the canonical example from the IOS IPv6 command reference.

4. **Fabricated `show ipv6 first-hop-security summary` and `show ipv6 first-hop-security statistics`.** Neither command appears in any current Cisco IOS / IOS-XE FHS or command-reference documentation. The actual umbrella-style commands are `show ipv6 snooping features` (lists active first-hop features) and `show ipv6 snooping policies` (lists every snooping policy and the interfaces/VLANs it is attached to). Replaced both occurrences in the Verification section and in the Conclusion.

5. **Non-existent per-interface show commands.** The post listed:
   - `show ipv6 nd raguard interface GigabitEthernet1/0/1`
   - `show ipv6 dhcp guard interface GigabitEthernet1/0/1`
   - `show ipv6 source-guard interface GigabitEthernet1/0/1`

   None of these have a documented `interface` form. Per-interface visibility is obtained via `show ipv6 nd raguard counters interface ...`, `show ipv6 snooping counters interface ...`, and `show ipv6 snooping policies interface ...`. Replaced each with the documented equivalent.

6. **Wrong troubleshooting check commands.** Mirrored fix #5 in the Troubleshooting section: replaced `show ipv6 nd raguard interface ...` and `show ipv6 dhcp guard interface ...` with `show ipv6 nd raguard policy <name>` / `show ipv6 dhcp guard policy <name>` plus `show ipv6 snooping counters interface ...` for traffic-level visibility.

7. **Incorrect debug command `debug ipv6 nd raguard`.** Cisco's documented debug for RA Guard runs under the IPv6 Snooping debug tree: `debug ipv6 snooping raguard`. Updated the troubleshooting section.

## Review Notes

- The `device-role host|router|client|server` directives, `trusted-port`, `security-level guard`, `tracking enable`, `limit address-count`, `vlan configuration <id>`, `ipv6 snooping attach-policy`, `ipv6 nd raguard attach-policy`, `ipv6 dhcp guard attach-policy`, and `ipv6 source-guard attach-policy` commands are all syntactically correct and match Cisco's documented FHS configuration model.
- `deny global-autoconf` inside `ipv6 source-guard policy` is correctly documented; it denies traffic sourced from globally autoconfigured (SLAAC/EUI-64) addresses absent a binding-table entry.
- The note that Source Guard must be deployed only after the binding table is populated is correct — enabling it prematurely will black-hole legitimate hosts whose bindings have not yet been learned.
- The IOS 15.0(1)SE / 15.2(1)E version recommendations are reasonable; full FHS feature parity (binding table + Source Guard) generally requires 15.0(2)SE or later on classic IOS, and is fully present on modern IOS-XE Catalyst platforms.
- On modern IOS-XE (16.x/17.x) the snooping/source-guard syntax has been unified under the device-tracking framework (`device-tracking policy`). Both syntaxes coexist on most current images; the post does not target a specific release, so the older but still supported `ipv6 snooping policy` / `ipv6 source-guard policy` form was left in place.
- The example output block in the Verification section is illustrative only — actual `show` output uses a slightly different layout but conveys equivalent information.
- The 2960-S/X line-up entry is borderline: small-form-factor 2960 platforms have only partial FHS support (RA Guard and Snooping yes; full Source Guard was historically restricted). Left as-is because the post correctly notes "complete Source Guard support" requires 15.2(1)E or later.
