# Validation Summary: How to Set Up IPv6 SLAAC vs DHCPv6 for Address Assignment

## Status
validated

## Post Type
Tutorial / Guide (with comparison and decision-tree elements)

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- DHCPv6 (stateful and stateless/options-only)
- Router Advertisements (RA) and `radvd` (Router Advertisement Daemon)
- ISC Kea DHCPv6 server
- dnsmasq (DHCPv6 + RA)
- EUI-64, Privacy Extensions, and Stable Privacy address generation
- Linux IPv6 sysctls (`use_tempaddr`, `addr_gen_mode`)
- Netplan / systemd-networkd and NetworkManager (`nmcli`) client configuration
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- ndisc6 tools (`rdisc6`), `tcpdump`, `ip6tables` (RA Guard / DHCPv6 Shield)

## Sources Consulted
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (SLAAC)
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6); message types and codes (Table, Section 7.3)
- RFC 4861 — Neighbor Discovery for IPv6 (RA/RS, multicast `ff02::1`/`ff02::2`, M/O flags)
- RFC 4941 / RFC 8981 — Privacy Extensions / Temporary Address Extensions for SLAAC
- RFC 7217 — Semantically Opaque (Stable Privacy) Interface Identifiers
- RFC 8106 — IPv6 RA Options for DNS Configuration (RDNSS, DNSSL)
- RFC 5952 — A Recommendation for IPv6 Address Text Representation
- RFC 3315 §5.1 — All_DHCP_Relay_Agents_and_Servers multicast `ff02::1:2`; UDP ports 546/547
- radvd documentation / `radvd.conf(5)` man page (AdvSendAdvert, AdvManagedFlag, AdvOtherConfigFlag, AdvAutonomous, AdvOnLink, RDNSS, DNSSL)
- ISC Kea ARM — DHCPv6 configuration (subnet6, pools, option-data, reservations, lease-database memfile, loggers)
- dnsmasq man page — `dhcp-range`, `dhcp-option=option6:`, `dhcp-host=id:`, `enable-ra`, `ra-param`
- Linux kernel `ip-sysctl` documentation (`addr_gen_mode`, `use_tempaddr`)
- netplan.io reference; NetworkManager `nm-settings` (`ipv6.method`, `ipv6.addr-gen-mode`)

## Issues Found
No technical issues found.

All functional claims, commands, and configuration snippets were verified and are accurate:
- The EUI-64 derivation (insert `FFFE`, flip the Universal/Local bit so `00` → `02`) is correct.
- `use_tempaddr=2` correctly enables and prefers temporary (privacy) addresses.
- `addr_gen_mode` value mapping (0=EUI-64, 2=stable-privacy, 3=random) matches the kernel.
- RA flag semantics (M=Managed addresses, O=Other config, A=Autonomous/SLAAC, L=On-link) and all `radvd` flag combinations for SLAAC-only / hybrid / DHCPv6-only are correct.
- DHCPv6 message-type codes 1–11 match RFC 8415.
- Multicast/port references (`ff02::2`, `ff02::1`, `ff02::1:2`, UDP 546/547) and the `tcpdump 'ip6[40] = 134'` RA filter are correct.
- Kea and dnsmasq config keys, option names, and DUID formats are valid for each product (`dns-servers` plural in Kea vs `option6:dns-server` singular in dnsmasq — both correct for their respective software).
- Client configs (Netplan, `nmcli`, `rdisc6`, `ip6tables --icmpv6-type router-advertisement`) are valid.

## Review Notes
- The post cites **RFC 4941** for Privacy Extensions. This is the historically standard reference but was obsoleted by **RFC 8981** (Feb 2021). The `use_tempaddr` behavior described is unchanged, so this is informational only, not an error.
- The EUI-64 worked example writes the full address as `2001:db8:1::021a:2bff:fe3c:4d5e`. This is unambiguous and parseable, but per RFC 5952 canonical form `::` should not compress a single zero group and leading zeros should be omitted (canonical: `2001:db8:1:0:21a:2bff:fe3c:4d5e`). Left as-is since the leading-zero form is pedagogically tied to showing the inserted/flipped bytes; not a functional error.
- In the dnsmasq snippet, the `ra-param` comments ("Disable SLAAC" / "managed addressing") slightly overstate what `ra-param` controls — `ra-param` sets RA priority/interval/router-lifetime, while stateful vs SLAAC behavior is driven by the `dhcp-range` mode. The configuration shown (a normal `dhcp-range`) does produce stateful DHCPv6 with the M flag set, so it is functionally correct; only the inline comments are imprecise.
- Kea logger key `output_options` (underscore) is accepted; newer Kea also accepts `output-options` (hyphen). Either works.
