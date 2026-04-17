# Validation Summary: How to Analyze DHCPv6 Exchanges in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filters)
- tshark (CLI packet analysis)
- tcpdump (capture)
- DHCPv6 protocol (RFC 8415)
- IPv6 multicast (ff02::1:2)
- ICMPv6

## Sources Consulted
- [RFC 8415 — DHCPv6](https://datatracker.ietf.org/doc/html/rfc8415) — verified message type codes (Solicit=1, Advertise=2, Request=3, Confirm=4, Renew=5, Rebind=6, Reply=7, Release=8, Decline=9), multicast address `ff02::1:2` (All_DHCP_Relay_Agents_and_Servers), UDP ports (client=546, server=547), and option codes (IA_NA=3, Client ID=1, DNS Servers=23, Domain List=24).
- [Wireshark DHCPv6 display filter reference](https://www.wireshark.org/docs/dfref/d/dhcpv6.html) — verified `dhcpv6`, `dhcpv6.msgtype`, `dhcpv6.option.type`, `dhcpv6.iaaddr.ip`, and the `dhcpv6.duidllt.*` sub-fields.
- [Wireshark ICMPv6 display filter reference](https://www.wireshark.org/docs/dfref/i/icmpv6.html) — verified `icmpv6.type` and `icmpv6.nd.ns.target_address`.

## Issues Found

1. **Invalid `dhcpv6.duidllt` filter usage.** The original post used `dhcpv6.duidllt contains "aa:bb:cc"`. In the Wireshark display filter reference, `dhcpv6.duidllt` is a protocol subtree whose filterable values live on sub-fields (`dhcpv6.duidllt.hwtype`, `dhcpv6.duidllt.link_layer_addr`, `dhcpv6.duidllt.link_layer_addr_ether`). Using the parent name with `contains` is unreliable. Changed to `dhcpv6.duidllt.link_layer_addr contains aa:bb:cc`, which is the documented filter for matching a DUID-LLT by link-layer bytes. Also removed the unnecessary quotes around the byte sequence to match Wireshark's standard hex-colon syntax.

2. **Incorrect ICMPv6 Neighbor Solicitation filter for diagnosing multicast.** The original post suggested `icmpv6.type == 135 && icmpv6.nd.ns.target_address == ff02::1:2` to verify that the DHCPv6 multicast group is working. This filter can never match: ICMPv6 Neighbor Solicitation (type 135) resolves unicast addresses via the solicited-node multicast — a multicast address like `ff02::1:2` is never a valid NS `target_address`. Replaced it with `ipv6.dst == ff02::1:2`, which actually shows traffic destined to the All_DHCP_Relay_Agents_and_Servers multicast group and is the appropriate first-line diagnostic for "is multicast delivery working?".

## Review Notes
- All DHCPv6 message-type codes, multicast address, UDP ports, and option codes align with RFC 8415.
- The SARR (Solicit–Advertise–Request–Reply) four-message exchange description is accurate for stateful DHCPv6.
- `tcpdump` BPF syntax and `tshark -Y` display-filter usage with `-T fields -e` are correct.
- `dhcpv6.iaaddr.ip` and `dhcpv6.duidllt.link_layer_addr` are both documented Wireshark fields and are used correctly in the tshark example.
- Option numbers (IA_NA=3, DNS Servers=23, Domain List=24, Client ID=1) follow IANA's DHCPv6 option registry.
- No version-specific caveats beyond the general note that Wireshark display filter field names can vary slightly across major versions; all referenced fields exist in currently supported Wireshark branches.
