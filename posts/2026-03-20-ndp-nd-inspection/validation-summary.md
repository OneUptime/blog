# Validation Summary: How to Configure IPv6 ND Inspection

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861
- IPv6 First Hop Security (FHS)
- Cisco IOS / IOS XE IPv6 Snooping
- Juniper Junos OS DHCP Security / Neighbor Discovery Inspection
- IPv6 Source Guard, RA Guard (referenced)

## Sources Consulted
- [RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)](https://datatracker.ietf.org/doc/html/rfc4861)
- [Cisco IPv6 First-Hop Security Configuration Guide — IPv6 Snooping](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-16-10/ip6f-xe-16-10-book/ip6-snooping.html)
- [Cisco Catalyst 9300 Security Configuration Guide — Configuring IPv6 First Hop Security](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/16-6/configuration_guide/sec/b_166_sec_9300_cg/configuring_ipv6_first_hop_security.html)
- [Insinuator: Configuring IPv6 Snooping and DHCPv6 Guard on Cisco IOS](https://insinuator.net/2014/01/configuring-ipv6-snooping-and-dhcpv6-guard-on-cisco-ios/)
- [Juniper — neighbor-discovery-inspection statement](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/nd-inspection-edit-vlans-port-security.html)
- [Juniper — Enabling IPv6 Neighbor Discovery Inspection](https://www.juniper.net/documentation/en_US/junos/topics/task/configuration/port-security-nd-inspection.html)
- [Juniper — Example: Configuring IPv6 Source Guard and ND Inspection](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/example/port-security-protect-from-ipv6-spoofing.html)
- [Juniper — show dhcp-security binding](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcp-security-binding.html)
- [Juniper — show neighbor-discovery-inspection statistics](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-nd-inspection-statistics-port-security.html)

## Issues Found

1. **Invalid Cisco interface command `ipv6 snooping trust`.** The post showed `ipv6 snooping trust` as a direct interface command to mark uplinks/router ports as trusted. Cisco IPv6 Snooping does not expose a standalone interface command — trusted ports are configured by creating an `ipv6 snooping policy` with the `trusted-port` sub-command (and optionally `device-role`) and attaching that policy to the interface with `ipv6 snooping attach-policy`. Replaced the snippet with a separate trust policy and `attach-policy` syntax.

2. **Incorrect Juniper feature name and CLI syntax.** The post referred to the Juniper feature as "ND Security" and used commands like `forwarding-options nd-security`, `family ethernet-switching nd-security-trusted`, `show nd-security binding`, and `show nd-security statistics`. None of those are valid Junos statements. The actual feature is **Neighbor Discovery Inspection**, configured under `[edit vlans <name> forwarding-options dhcp-security]` (which auto-enables DHCPv6 snooping). Trusted ports use `dhcp-security group ... overrides trusted`. The binding table is `show dhcp-security binding`, and statistics are `show neighbor-discovery-inspection statistics`. Rewrote the entire Juniper section with correct syntax sourced from Juniper documentation, and updated the introduction and conclusion to use the correct feature name.

## Review Notes

- The `security-level inspect` option (mentioned alongside `glean` and `guard`) is documented as deprecated/no-op in newer Cisco IOS XE releases. The post's description ("validate but do not drop / log only") matches its historical behavior; readers on modern IOS XE should treat `guard` (default) and `glean` as the meaningful options. Did not edit since the description is not factually wrong.
- The binding-table state names in the "Binding Table Lifecycle" section blend RFC 4861 neighbor cache states (e.g., INCOMPLETE) with Cisco IPv6 snooping binding table states (REACHABLE/STALE/DOWN, plus TENTATIVE/VERIFY in Cisco). The post's framing is informally accurate enough for a tutorial; left as-is.
- The Cisco default reachable lifetime of 300 seconds is correct for the IPv6 snooping binding table (configurable via `tracking enable reachable-lifetime`). Note this differs from RFC 4861's 30,000 ms (30 s) `REACHABLE_TIME` default for the host neighbor cache — different concepts in different layers.
- The phrase "inspects all NDP messages in hardware" was softened to remove the hardware claim, since whether inspection runs in hardware vs. software depends on the platform/ASIC capabilities.
