# Validation Summary: How to Configure DHCPv6 Guard on Cisco Switches

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS / IOS-XE First Hop Security (FHS)
- DHCPv6 Guard (`ipv6 dhcp guard policy`)
- IPv6 Snooping (`ipv6 snooping policy`)
- IPv6 RA Guard (`ipv6 nd raguard policy`)
- IPv6 ACLs and Prefix Lists
- Cisco Catalyst switches (Gigabit interface examples)

## Sources Consulted
- [IPv6 First-Hop Security Configuration Guide — DHCPv6 Guard (Cisco IOS XE 16)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-16/ip6f-xe-16-book/ip6-dhcpv6-guard.html)
- [IP Addressing: DHCP Configuration Guide, Cisco IOS Release 15SY — DHCPv6 Guard](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/15-sy/dhcp-15-sy-book/ip6-dhcpv6-guard.html)
- [FHS and SISF Configuration Guide — IPv6 FHS (Cisco IOS XE 17, Catalyst 9000)](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/ipv6-first-hop-security.html)
- [IPv6 Snooping Configuration Guide (Cisco IOS Release 15S)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-s/ip6f-15-s-book/ip6-snooping.html)
- [NetworkLessons — IPv6 DHCPv6 Guard](https://networklessons.com/cisco/ccie-routing-switching-written/ipv6-dhcpv6-guard)
- RFC 8415 (DHCPv6) — message types ADVERTISE, REPLY, RECONFIGURE
- RFC 7610 (DHCPv6 Shield: Protecting Against Rogue DHCPv6 Servers)

## Issues Found

The Verification Commands section listed several commands that are not documented in Cisco's official IPv6 First Hop Security / DHCPv6 Guard references and the example output format did not match actual Cisco show output. Fixed as follows:

1. **Removed `show ipv6 dhcp guard interface GigabitEthernet1/0/1`** — this command form is not documented. Replaced with `show ipv6 dhcp guard policy HOST_DHCP`, which is the documented way to view a policy and the interfaces/VLANs it is attached to (the "Target" field in the output).
2. **Removed `show ipv6 dhcp guard statistics`** — not a documented Cisco command.
3. **Removed `show ipv6 first-hop-security summary`** — not a documented Cisco command. Replaced with `show ipv6 snooping policies`, which is documented and serves the related purpose of listing attached FHS policies.
4. **Updated the example output** — the original output (`Device role: CLIENT`, per-message receive/drop counters) did not match real Cisco output. Replaced with the documented format from `show ipv6 dhcp guard policy` (`Dhcp guard policy: ... / Device Role: dhcp client / Target: ...`).
5. **Changed `show ipv6 neighbor binding` to `show ipv6 neighbors binding`** (in two places) — the plural form is the documented Cisco IOS syntax for the binding table show command.

## Review Notes

The configuration syntax in the body of the post is accurate for current Cisco IOS / IOS-XE:

- `ipv6 dhcp guard policy <name>` with `device-role client|server` — correct
- `match server access-list` and `match reply prefix-list` — correct policy submode commands
- `ipv6 dhcp guard attach-policy` at both interface and `vlan configuration` levels — correct
- `ipv6 nd raguard policy` with `device-role host|router` and `trusted-port` — correct
- `ipv6 snooping policy` with `security-level guard` and `tracking enable stale-lifetime` — correct
- DHCPv6 server message types listed (ADVERTISE, REPLY, RECONFIGURE) — correct per RFC 8415

The relay-agent guidance is accurate: when a DHCPv6 relay agent forwards REPLY/ADVERTISE messages back to clients on behalf of the server, the relay-facing port on the access switch must use the server-role policy so those messages are not dropped.

No version-specific caveats were called out in the post; readers should be aware that exact command availability and output formatting can vary slightly between Cisco IOS, IOS-XE, and platform release trains (e.g., Catalyst 2960-X vs 9000 series). The core syntax used here is consistent across modern releases.
