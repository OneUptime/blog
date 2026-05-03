# Validation Summary: How to Debug DHCPv6 with Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DHCPv6 (RFC 8415)
- Wireshark
- tshark (CLI Wireshark)
- IPv6
- BPF capture filters
- ISC dhclient

## Sources Consulted
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc8415
- Wireshark DHCPv6 display filter reference: https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- tshark man page (Wireshark documentation)
- dhclient(8) man page (ISC DHCP)

## Issues Found
1. **Incorrect Wireshark field name `dhcpv6.ia_na.addr`** — The post's tshark example used `-e dhcpv6.ia_na.addr` for the assigned IPv6 address, but Wireshark's actual field name is `dhcpv6.iaaddr.ip` (the IA Address option's IPv6 address field). Fixed by changing the `-e` argument.

2. **T1/T2 timer values violated RFC 8415 §14.2 ordering** — The Advertise frame example showed `T1: 1800, T2: 2880` while the Reply frame showed `valid: 3600, preferred: 2700`. Per RFC 8415, the relationship must be `T1 ≤ T2 ≤ preferred-lifetime ≤ valid-lifetime`, but here T2 (2880) exceeded the preferred lifetime (2700). Updated the example to `T1: 1350, T2: 2160` (the recommended 0.5× and 0.8× of the preferred lifetime), which now satisfies the ordering constraint.

## Review Notes
- DHCPv6 ports 546 (client) / 547 (server) and the All_DHCP_Relay_Agents_and_Servers multicast address `ff02::1:2` are correct per RFC 8415.
- Message type codes (Solicit=1, Advertise=2, Request=3, Reply=7) are correct.
- Status code `NoAddrsAvail = 2` is correct.
- `OPTION_RAPID_COMMIT = 14` is correct.
- The `dhcpv6.duid.bytes` field is a valid Wireshark byte-sequence field.
- The BPF capture filter `udp port 546 or udp port 547` is syntactically valid.
- `dhclient -6 -r` and `dhclient -6` invocations match the ISC dhclient(8) flags.
- The "Renew is unicast, Rebind is multicast" implication in the troubleshooting table is consistent with RFC 8415.
