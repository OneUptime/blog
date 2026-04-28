# Validation Summary: How to Configure IPv6 First Hop Security on Juniper EX

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Juniper EX Series switches
- Junos OS (ELS configuration style)
- IPv6 Neighbor Discovery (NDP)
- IPv6 First Hop Security (FHS)
- RA Guard (`forwarding-options access-security router-advertisement-guard`)
- ND Inspection (`forwarding-options dhcp-security neighbor-discovery-inspection`)
- IPv6 Source Guard (`forwarding-options dhcp-security ipv6-source-guard`)
- DHCPv6 snooping

## Sources Consulted
- [Configuring Stateless IPv6 Router Advertisement Guard (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/task/port-security-ra-guard.html)
- [Understanding IPv6 Router Advertisement Guard (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/concept/port-security-ra-guard.html)
- [router-advertisement-guard CLI reference (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-guard-edit-fo.html)
- [Example: Configuring IPv6 Source Guard and Neighbor Discovery Inspection (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/example/port-security-protect-from-ipv6-spoofing.html)
- [neighbor-discovery-inspection CLI reference (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/nd-inspection-edit-vlans-port-security.html)
- [ipv6-source-guard CLI reference (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/ipv6-source-guard-port-security.html)
- [dhcp-security CLI reference (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/ref/statement/dhcp-security-edit-vlans.html)
- [trusted (DHCP Security) CLI reference (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/trusted-edit-vlans.html)
- [static-ipv6 CLI reference (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/static-ipv6-edit-vlans-dhcp-security.html)
- [Configuring Static DHCP IP Addresses (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/topic-map/configuring-static-dhcp-ip-addresses.html)
- [show dhcpv6 snooping binding (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcpv6-snooping-binding-port-security.html)
- [show dhcp-security ipv6 binding (Junos OS)](https://stage.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcp-security-ipv6-binding.html)
- [show neighbor-discovery-inspection statistics (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-nd-inspection-statistics-port-security.html)
- [show dhcp-security neighbor-discovery-inspection statistics (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/ref/command/show-dhcp-security-nd-inspection-statistics.html)

## Issues Found
The original post used a fabricated Junos hierarchy (`forwarding-options nd-security`, `nd-security-trusted`, `dhcp-trusted`) and fabricated show commands (`show nd-security ...`) that do not exist in any Junos release. Substantial rewrites were required throughout the configuration sections; the prose structure (intro / architecture / config / verification / static bindings / troubleshooting / logging / conclusion) was preserved.

Specific changes:

1. **Architecture mapping section** — replaced the made-up `nd-security` hierarchy with the real Junos features:
   - ND Inspection → `[edit vlans ... forwarding-options dhcp-security] neighbor-discovery-inspection`
   - IPv6 Source Guard → `[edit vlans ... forwarding-options dhcp-security] ipv6-source-guard`
   - DHCPv6 snooping → auto-enabled by ND inspection / IPv6 source guard
   - DHCPv6 Guard → trusted DHCPv6 server interface via `group ... overrides trusted`
   - RA Guard → `[edit forwarding-options access-security router-advertisement-guard]` (a separate hierarchy, not under `vlans`).

2. **Junos version requirement** — corrected the claim that `nd-security` is "available in Junos 12.1 or later." Per Juniper's documentation, IPv6 source guard / neighbor discovery inspection were introduced on EX2200 and EX3300 in Junos OS Release 14.1X53-D10. The requirement was rephrased accordingly and a pointer to Feature Explorer added for other models.

3. **Complete FHS Configuration** — rewrote all `set` commands to use the real syntax:
   - `set vlans v10 forwarding-options dhcp-security neighbor-discovery-inspection`
   - `set vlans v10 forwarding-options dhcp-security ipv6-source-guard`
   - Removed the invented `forwarding-options nd-security maximum-bindings` statement (no such statement exists at this hierarchy in Junos).
   - Removed the invented `family ethernet-switching nd-security-trusted` and `dhcp-trusted` per-interface statements.
   - Added a correct example of trusting a specific access port for DHCPv6 server traffic via `group <name> interface <if> overrides trusted`.
   - Replaced the implicit "RA Guard via nd-security" with a real RA Guard policy under `forwarding-options access-security router-advertisement-guard`, attached to the VLAN and (optionally) the upstream interface.

4. **Junos Hierarchy Format Configuration** — rewrote the bracket-format example to match the corrected `set` commands. Removed `nd-security { ... }` and `nd-security-trusted` / `dhcp-trusted` leaves; added a `forwarding-options { access-security { router-advertisement-guard { ... } } }` block.

5. **Verifying FHS on Juniper** — replaced the invented `show nd-security`, `show nd-security binding`, `show nd-security statistics`, `show nd-security interface ...`, `show dhcp v6 snooping binding`, and `show dhcp v6 snooping statistics` commands with the real ones: `show dhcpv6 snooping binding`, `show dhcp-security ipv6 binding`, `show neighbor-discovery-inspection statistics`, `show dhcp-security neighbor-discovery-inspection statistics`, and `show ipv6 neighbors`. Removed the fabricated per-interface output examples (no such command exists).

6. **Adding Static Bindings** — replaced the invented `set vlans v10 forwarding-options nd-security static-binding inet6-address ...` syntax with the documented form `set vlans <name> forwarding-options dhcp-security group <gname> interface <ifname> static-ipv6 <addr> mac <mac>`. The bracket-format example now nests the `static-ipv6` statement inside `group ... { interface ... { static-ipv6 ... } }`, which is the actual Junos schema.

7. **Troubleshooting** — removed the fabricated `show nd-security interface ge-0/0/23`, `nd-security-trusted`, `dhcp-trusted`, and `show dhcp v6 snooping statistics` invocations. Replaced them with `show configuration forwarding-options access-security router-advertisement-guard`, `show dhcpv6 snooping binding`, and the documented way to mark a non-trunk DHCP server port trusted (`group ... overrides trusted`).

8. **Logging NDP Security Events** — removed the fabricated `NDPMON_RA_DROP` / `NDPMON_NA_SPOOF` / `NDPMON_BIND_EXCEEDED` syslog tags (these are not real Junos events; Juniper does not document syslog tags of that form for these features). Replaced with a generic syslog-file recipe and pointers to the real `show ... statistics` commands. Also corrected the `monitor log /var/log/fhs-log` line to the correct Junos operational form `monitor start fhs-log`.

9. **Conclusion** — rewrote to reference the correct hierarchies (`dhcp-security` and `access-security router-advertisement-guard`) and the real verification commands.

## Review Notes
- The `dhcp-security` framework discussed here is the ELS form of port security, which is what current EX-series Junos uses. On older non-ELS releases the equivalent statements live under `[edit ethernet-switching-options secure-access-port vlan <name>]` (`neighbor-discovery-inspection`, `ipv6-source-guard`, `examine-dhcpv6`); platform/release support varies, so readers should consult Feature Explorer for their specific model and Junos version.
- The post does not stamp a specific Junos release on every command. Some `show` command names differ slightly across releases (e.g., `show dhcpv6 snooping binding` on older releases vs. `show dhcp-security ipv6 binding` on newer unified releases). Both forms are now mentioned where relevant.
- The default trust posture in Junos is per-VLAN: access ports default to *untrusted* and trunk ports default to *trusted* for DHCP snooping. This is now reflected accurately in the post; the previous claim that uplinks needed `dhcp-trusted` to pass DHCPv6 server messages was incorrect on a trunk-uplink topology.
- RA Guard policy semantics (`accept` vs `discard`) and `match-option` parameters could be expanded with a more realistic policy (e.g., source IP / prefix match-lists) in a future revision; the post uses a minimal `router-preference high` accept policy for illustration.
