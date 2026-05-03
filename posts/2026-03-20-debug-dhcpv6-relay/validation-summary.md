# Validation Summary: How to Debug DHCPv6 Relay Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- DHCPv6 protocol (RFC 8415)
- ISC DHCP `dhcrelay` (IPv6 relay mode)
- ISC Kea (`kea-dhcp6`)
- WIDE DHCPv6 server
- `tcpdump`, `tshark` (Wireshark CLI)
- `ss`, `ip -6` (iproute2)
- `radvd` (Router Advertisement daemon)
- `ip6tables`, `nftables`
- Cisco IOS DHCPv6 relay
- Juniper Junos DHCPv6 relay / system tracing

## Sources Consulted
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — message types, ports (UDP 546/547), multicast addresses (`ff02::1:2` All_DHCP_Relay_Agents_and_Servers, `ff05::1:3` All_DHCP_Servers)
- ISC DHCP `dhcrelay` manpage (github.com/isc-projects/dhcp `relay/dhcrelay.8`, kb.isc.org)
- ISC Kea documentation (kea.readthedocs.io) for `kea-dhcp6` logger configuration
- Wireshark display filter reference for `dhcpv6.msgtype`
- iproute2 `ip-route(8)`, `ip-neighbour(8)`, `ip-maddress(8)` manpages
- `ss(8)` manpage for socket stats syntax
- macOS `ndp(8)` manpage
- Cisco IOS DHCPv6 Relay command reference

## Issues Found

1. **Misuse of `ip netns exec` with macOS `ndp` command (Step 1).**
   The original line `ip netns exec client-ns ndp -a  # On macOS style` mixed Linux network-namespace syntax with the BSD/macOS `ndp` tool, which does not exist on standard Linux. Replaced with two cleanly separated examples — `ndp -a` labelled "On macOS:" and the existing `ip -6 neigh show` for Linux.

2. **Invalid `dhcrelay -6` syntax (Step 6).**
   The original command `dhcrelay -6 -d -f -l eth0 -u eth1 2001:db8::dhcp-server` was wrong on two counts:
   - In DHCPv6 mode, ISC `dhcrelay` does not accept positional server addresses (that form is DHCPv4-only). The upstream interface and optional unicast server must be supplied together via `-u [address%]ifname`.
   - `2001:db8::dhcp-server` is not a syntactically valid IPv6 literal (`dhcp-server` contains non-hex characters).
   Replaced with `-u 2001:db8::1%eth1` and added a brief comment explaining the form. Also dropped the redundant `-f` flag since `-d` already forces foreground operation per the dhcrelay manpage.

## Review Notes

- DHCPv6 message type codes (1 SOLICIT, 2 ADVERTISE, 3 REQUEST, 7 REPLY, 12 RELAY-FORW, 13 RELAY-REPL) verified against RFC 8415 §7.3.
- Multicast address `ff02::1:2` (All_DHCP_Relay_Agents_and_Servers) verified against RFC 8415 §7.1.
- Ports UDP 546 (client) and UDP 547 (server/relay) are correct.
- Option 18 (INTERFACE_ID) reference in the common-issues table is accurate per RFC 8415 §21.18.
- The commands `ndp -a` and `ip -6 neigh show` show the neighbor-discovery cache, not RA M/O flags directly. They serve as a rough sanity check that the client is talking ND with the router; for true RA-flag inspection, `radvdump` or `tcpdump -v 'icmp6 and ip6[40] == 134'` would be more direct. Left as-is since the surrounding context (radvd debug, RA flag checks) makes the intent clear and the commands are not incorrect.
- The Juniper section mixes `set system tracing` (system-wide debug tracing) with a `set forwarding-options dhcp-relay v6 active-server-group` line that is a config statement rather than a trace setting. Both are valid Junos commands; left as-is since the author's intent (enable tracing on a relay-configured device) is reasonable.
- `show ipv6 dhcp relay statistics` and `clear ipv6 dhcp relay statistics` are valid on certain Cisco platforms (e.g., ASR series) and may differ on others; left as-is.
