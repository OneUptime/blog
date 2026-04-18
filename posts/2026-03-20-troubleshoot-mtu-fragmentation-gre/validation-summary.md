# Validation Summary: How to Troubleshoot MTU and Fragmentation in GRE Tunnels

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- GRE (Generic Routing Encapsulation) tunnels
- Linux networking (iproute2: `ip link`)
- iptables (TCPMSS target, `--clamp-mss-to-pmtu`, `--set-mss`)
- nftables (MSS clamping via `tcp option maxseg size set rt mtu`)
- ping / ICMP with DF bit (`-M do`)
- tcpdump
- Path MTU Discovery (PMTUD)
- IPsec, VXLAN, IPv6 GRE (overhead comparisons)

## Sources Consulted
- RFC 2784 — Generic Routing Encapsulation (GRE): https://datatracker.ietf.org/doc/html/rfc2784
- RFC 7348 — VXLAN: https://datatracker.ietf.org/doc/html/rfc7348
- iptables-extensions(8) — TCPMSS target: https://ipset.netfilter.org/iptables-extensions.man.html
- nftables wiki — Setting the TCP MSS: https://wiki.nftables.org/wiki-nftables/index.php/Setting_the_TCP_MSS_value
- Linux ip-link(8) manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux ping(8) manual (for `-M do` and `-s`): https://man7.org/linux/man-pages/man8/ping.8.html
- tcpdump(8) / pcap-filter(7): https://www.tcpdump.org/manpages/pcap-filter.7.html

## Issues Found
No technical issues found.

Verified calculations:
- GRE overhead: 20-byte outer IPv4 header + 4-byte basic GRE header = 24 bytes (per RFC 2784, basic header with no optional fields). ✓
- Tunnel MTU: 1500 − 24 = 1476 ✓
- MSS without clamping: 1500 − 20 (IP) − 20 (TCP) = 1460 ✓
- MSS with clamping: 1476 − 40 = 1436 ✓
- `ping -s 1453` produces 1453 + 8 (ICMP) + 20 (IP) = 1481-byte packet, which exceeds 1476 with DF set — correctly fails. ✓
- VXLAN overhead 50 bytes: 14 (inner Ethernet) + 8 (VXLAN) + 8 (UDP) + 20 (outer IP) = 50 ✓
- GRE over IPv6: 40 (IPv6) + 4 (GRE) = 44; 1500 − 44 = 1456 ✓
- iptables MSS clamping rule syntax is canonical.
- nftables `tcp option maxseg size set rt mtu` matches the official nftables wiki MSS-clamping recipe.
- tcpdump filter `tcp[tcpflags] & tcp-syn != 0` is a valid BPF expression for SYN packets.

## Review Notes
- The claim that oversized DF-set packets are "silently dropped" is accurate in environments where ICMP Fragmentation Needed (Type 3, Code 4) messages are filtered — a common real-world scenario. In a correctly configured network, the sending host would receive an ICMP PMTU message. The post's framing is the common troubleshooting scenario, so this is acceptable.
- The 54-byte IPsec overhead used for `GRE+IPsec: 1422` is a reasonable representative value (e.g., ESP tunnel mode with AES-CBC + HMAC-SHA1), though real overhead varies by cipher, authentication, and mode (transport vs tunnel). This is presented as an illustrative table and is within typical ranges.
- The basic GRE header is 4 bytes; with optional Checksum, Key, or Sequence fields enabled the header grows (up to 16 bytes). The 24-byte total applies to the default/common case, which is what the post addresses.
- No deprecation concerns: `iptables` TCPMSS, `ip link`, and `nft` syntax all remain current.
