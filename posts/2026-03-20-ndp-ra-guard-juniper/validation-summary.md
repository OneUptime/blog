# Validation Summary: How to Configure RA Guard on Juniper Switches

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Juniper Junos OS
- Juniper EX Series switches
- IPv6 Router Advertisement Guard (RA Guard)
- IPv6 Neighbor Discovery Protocol (NDP)
- DHCPv6 snooping
- IPv6 first-hop security

## Sources Consulted
- [Understanding IPv6 Router Advertisement Guard | Junos OS | Juniper Networks](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/concept/port-security-ra-guard.html)
- [Configuring Stateless IPv6 Router Advertisement Guard | Junos OS | Juniper Networks](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/task/port-security-ra-guard.html)
- [Configuring Stateful IPv6 Router Advertisement Guard | Junos OS | Juniper Networks](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/task/port-security-ra-guard-stateful.html)
- [router-advertisement-guard | Junos OS CLI Reference](https://stage.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-guard-edit-fo.html)
- [mark-interface (RA Guard) | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/mark-interface-edit-access-security.html)
- [interface (RA Guard) | Junos OS](https://origin-www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/interface-edit-access-security.html)
- [show access-security router-advertisement state | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/ref/command/show-access-security-router-advertisement-state.html)
- [show access-security router-advertisement statistics | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-access-security-router-advertisement.html)
- [neighbor-discovery-inspection | Junos OS CLI Reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/nd-inspection-edit-vlans-port-security.html)
- [IPv6 Neighbor Discovery Inspection | Junos OS](https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/concept/port-security-nd-inspection.html)

## Issues Found
The original post invented a Junos feature called `nd-security` with `nd-security-trusted` interface statements and `show nd-security` operational commands. None of this syntax exists in Junos OS. The post conflated three distinct Juniper features (RA Guard, ND Inspection, and DHCPv6 snooping) under a single fabricated `nd-security` command set. The entire configuration section was rewritten to use the actual Junos syntax.

Specific corrections:

1. **Configuration hierarchy** — Replaced the non-existent `[edit vlans <name> forwarding-options nd-security]` with the real `[edit forwarding-options access-security router-advertisement-guard]` hierarchy. RA Guard in Junos is not a child of `vlans forwarding-options`; it is its own top-level subsystem under `forwarding-options access-security`.

2. **Interface trust marking** — Replaced the non-existent `nd-security-trusted` interface statement (`set interfaces ge-0/0/23 unit 0 family ethernet-switching nd-security-trusted`) with the actual `mark-interface trusted` (or `block`) statement under the `router-advertisement-guard interface` hierarchy: `set forwarding-options access-security router-advertisement-guard interface ge-0/0/23.0 mark-interface trusted`.

3. **Policy requirement** — The original post implied RA Guard auto-enforces once `nd-security` is enabled on a VLAN. In reality, RA Guard requires a named `policy` with `accept`/`discard` match criteria (source MAC, source IP, prefix, hop limit, managed-config-flag, etc.), and that policy must be applied to either the interface or the VLAN. Added a complete policy example.

4. **VLAN application syntax** — Replaced `set vlans v10 forwarding-options nd-security` with the correct `set forwarding-options access-security router-advertisement-guard vlans v10 policy <policy-name> stateless`.

5. **Operational commands** — Replaced the fabricated `show nd-security`, `show nd-security binding`, `show nd-security statistics`, and `show nd-security interface` commands with the real `show access-security router-advertisement state [interface <interface>]` and `show access-security router-advertisement statistics`. Also corrected the example output to show real interface states (OFF, LEARNING, FORWARDING, BLOCKING, TRUSTED) per the documented command output.

6. **Version requirement** — The post claimed the feature was available since Junos 12.1. The actual `show access-security router-advertisement state` command (and the modern RA Guard hierarchy) was introduced in Junos OS 15.1X53-D55. Updated the version requirement throughout.

7. **DHCPv6 combination example** — The original `set vlans v10 forwarding-options dhcp-security` plus `set interfaces ... dhcp-trusted` syntax does not match Junos ELS DHCP security syntax. Rewrote to use the real `set vlans <name> forwarding-options dhcp-security group <group-name> overrides trusted` plus `interface <interface>` group-membership pattern.

8. **Stateless vs stateful explanation** — Added the actual operating modes (stateless/stateful) and what each interface state means, since the modes are user-visible and material to choosing a configuration.

9. **Syslog example** — Replaced the fabricated `RPD_ND_SECURITY_DROP` log tag with a more accurate description and replaced `monitor log` (which is not a Junos operational command) with the correct `monitor start <filename>`.

## Review Notes
- The accept policy example uses a `source-mac-address-list` reference in the `match-list` block. Junos accepts this as a list reference; the corresponding `policy-options source-mac-address-list` syntax shown is the standard Junos pattern.
- The blog uses simplified examples to keep the tutorial accessible. Production deployments typically combine RA Guard with ND Inspection (which has a separate dependency on DHCPv6 snooping) and IPv6 Source Guard for full coverage.
- The exact RA Guard CLI is supported on EX Series, QFX Series, and ACX Series running Junos OS 15.1X53-D55 or later. Older platforms or earlier Junos releases do not support this hierarchy and require firewall-filter-based workarounds.
- The `mark-interface block` option (statically drop all RAs on an interface, no policy lookup) is mentioned but not exemplified, since the typical deployment marks only the uplink as trusted and lets the policy handle the rest.
