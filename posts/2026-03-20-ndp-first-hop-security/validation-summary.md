# Validation Summary: How to Understand IPv6 First Hop Security Features

## Status
validated

## Post Type
Conceptual Overview / Configuration Guide

## Technologies Covered
- IPv6 First Hop Security (FHS) — switch-level protections for IPv6 link-local
- ICMPv6 Router Advertisement (Type 134) and RA Guard — RFC 6105
- DHCPv6 Guard / DHCPv6 Shield — RFC 7610 (server messages: ADVERTISE/REPLY/RECONFIGURE)
- IPv6 ND Inspection / IPv6 Snooping (binding table, address-count limits)
- IPv6 Source Guard (data-plane source address enforcement)
- Cisco IOS-XE configuration syntax (`ipv6 nd raguard`, `ipv6 dhcp guard`, `ipv6 snooping`, `ipv6 source-guard`)
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861

## Sources Consulted
- [RFC 6105 — IPv6 Router Advertisement Guard](https://datatracker.ietf.org/doc/html/rfc6105)
- [RFC 7610 — DHCPv6-Shield: Protecting Against Rogue DHCPv6 Servers](https://datatracker.ietf.org/doc/html/rfc7610)
- [RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)](https://datatracker.ietf.org/doc/html/rfc4861)
- [RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6)](https://datatracker.ietf.org/doc/html/rfc8415) — DHCPv6 message types
- [IANA ICMPv6 Type Numbers](https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml) — confirms RA = 134
- Cisco IOS-XE IPv6 First-Hop Security Configuration Guide — IPv6 RA Guard, DHCPv6 Guard, IPv6 Snooping, IPv6 Source Guard chapters
- Cisco Catalyst 9300 Security Configuration Guide — Configuring IPv6 First Hop Security
- Sibling validation summary `posts/2026-03-20-ndp-nd-inspection/validation-summary.md` — confirms `ipv6 snooping trust` is not a documented Cisco interface command and the proper approach is a snooping policy with `trusted-port` attached via `ipv6 snooping attach-policy`

## Issues Found

1. **Invalid Cisco interface command `ipv6 snooping trust`.** The "Complete Cisco FHS Configuration" snippet used `ipv6 snooping trust` as a direct interface command on the uplink. Cisco IPv6 Snooping does not expose a standalone `trust` interface command in its documented command reference; trusted ports are configured by creating an `ipv6 snooping policy` with the `trusted-port` sub-command (and `device-role node` as appropriate) and attaching it with `ipv6 snooping attach-policy`. Replaced the snippet by adding an `ND_TRUST` snooping policy and changed the uplink line to `ipv6 snooping attach-policy ND_TRUST`. This is consistent with the fix applied in the sibling `2026-03-20-ndp-nd-inspection` post.

## Review Notes

- **ICMPv6 Type 134 = Router Advertisement** — verified against the IANA ICMPv6 type registry and RFC 4861 §4.2.
- **DHCPv6 server messages ADVERTISE / REPLY / RECONFIGURE** — verified against RFC 8415 §7.3 (message types 2, 7, 10). These are the messages a rogue server would emit, and DHCPv6 Guard with `device-role client` blocks them on access ports — accurate.
- **Cisco RA Guard syntax** (`ipv6 nd raguard policy`, `device-role host|router`, `trusted-port`, `attach-policy`) is correct and matches the Cisco IOS-XE command reference.
- **Cisco DHCPv6 Guard syntax** (`ipv6 dhcp guard policy`, `device-role client|server`, `attach-policy`) is correct.
- **Cisco IPv6 Snooping syntax** (`ipv6 snooping policy`, `security-level guard`, `tracking enable`, `limit address-count`) is correct.
- **`show` commands** (`show ipv6 nd raguard statistics`, `show ipv6 dhcp guard statistics`, `show ipv6 neighbor binding`, `show ipv6 source-guard statistics`) — `show ipv6 neighbor binding` is unambiguously correct. The `… statistics` variants exist in Cisco's first-hop-security command set on supported platforms; some operators may prefer `show ipv6 snooping counters interface` for combined counters. Not flagged as wrong.
- **OSI layer labels** in the components table are informal but reasonable. RA Guard inspects ICMPv6 (logically L3/L4) on an L2 switch — the "L2 (switch inspection)" framing is acceptable given it operates on the access port. DHCPv6 Guard's "L2/L4 (switch + UDP port inspection)" reflects the switch matching DHCPv6 server UDP/547 traffic — fair.
- **Deployment ordering** (RA Guard → DHCPv6 Guard → ND Inspection → Source Guard) is sound advice: Source Guard depends on the binding table populated by ND Inspection / DHCPv6 snooping, so enabling it first would drop all traffic. The "Caution" section's failure modes are accurate.
- The `security-level inspect` mode is mentioned in the Step 3 caution as a safer pre-cutover step — historically valid; on newer IOS-XE releases `inspect` may behave like `glean` (no enforcement). The post's framing ("inspect mode first, then guard mode") still conveys the correct staged-rollout intent.
- The mermaid diagram correctly shows that RA Guard and DHCPv6 Guard are independent of the binding table, while Source Guard depends on bindings populated by ND Inspection (and DHCPv6 snooping).
