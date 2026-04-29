# Validation Summary: How to Understand Mobile IPv6 Proxy Neighbor Advertisements

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Mobile IPv6 (MIPv6) — RFC 6275
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861
- Proxy NDP on Linux (iproute2 / sysctl)
- UMIP (Linux MIPv6 daemon)
- Scapy (Python packet crafting)
- tcpdump BPF filter syntax
- Ethernet IPv6 multicast mapping — RFC 2464

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §4.4 (Neighbor Advertisement message format), §4.6.1 (Source/Target Link-Layer Address options)
- RFC 6275 — Mobility Support in IPv6, §10.4.1 (Intercepting Packets for the Mobile Node), §11.4.3
- RFC 2464 — Transmission of IPv6 Packets over Ethernet Networks, §7 (multicast MAC mapping)
- iproute2 `ip-neighbour(8)` man page (proxy entry syntax)
- Linux kernel `Documentation/networking/ip-sysctl.txt` (`net.ipv6.conf.*.proxy_ndp`)
- Scapy source: `scapy/layers/inet6.py` (`ICMPv6ND_NA`, `ICMPv6NDOptDstLLAddr` type=2)
- tcpdump pcap-filter(7) — `ip6[N]` byte indexing semantics

## Issues Found

1. **Incorrect tcpdump byte offset for the NA flags field.** The post used `ip6[41] & 0x20 != 0` to detect the Override flag. Byte 41 of an IPv6 packet is the ICMPv6 Code field (always 0 for NA), not the flags. Per RFC 4861 §4.4, the NA structure is Type(1) Code(1) Checksum(2) R/S/O+Reserved(4) Target(16), so the R/S/O flags are at byte 44 of the IPv6 packet. Corrected the filter to `ip6[44] & 0x20 != 0` and updated the inline comment.

2. **Wrong destination MAC for IPv6 multicast in the Scapy example.** The post used `Ether(dst="ff:ff:ff:ff:ff:ff")` for a packet destined to `ff02::1`. IPv6 has no broadcast; per RFC 2464 §7, IPv6 multicast over Ethernet uses `33:33:XX:XX:XX:XX` where the last four octets are the low-order 32 bits of the IPv6 multicast address. For `ff02::1` that is `33:33:00:00:00:01`. Updated the dst MAC and added a brief comment noting the RFC 2464 mapping.

3. **Inaccurate description of the Home Agent's role.** The text "The Home Agent solicits on behalf of (proxies for) each registered Mobile Node" implies the HA sends Neighbor Solicitations on the MN's behalf. The HA actually answers Neighbor Solicitations from other on-link nodes by sending Neighbor Advertisements (and may send unsolicited NAs after a binding update). Reworded to "The Home Agent answers Neighbor Solicitations on behalf of (proxies for) each registered Mobile Node."

## Review Notes
- The R=0 setting in the proxy NA is correct: per RFC 6275 §10.4.1, the HA proxies for the MN as a host, so the Router flag is cleared even though the HA itself is a router.
- Scapy's `ICMPv6NDOptDstLLAddr` is the correct option in an NA — despite the name it carries ND option type 2 (Target Link-Layer Address), which is the option used in NA and Redirect messages.
- The `ip -6 neigh add proxy <addr> dev <iface>` syntax and the `net.ipv6.conf.<iface>.proxy_ndp = 1` sysctl are both correct for current iproute2 / Linux kernels.
- The IPv6 prefix `2001:db8:home::/64` is not strictly valid IPv6 syntax (`h`, `o`, `m` are not hex digits), but it is used consistently as a mnemonic across the entire MIPv6 series in this blog and the intent is clearly didactic — left as-is to maintain consistency with sibling posts.
- The Mermaid diagram simplifies the NS multicast delivery (NS is technically sent to the solicited-node multicast address, not unicast to the HA) — acceptable for a sequence-style overview.

