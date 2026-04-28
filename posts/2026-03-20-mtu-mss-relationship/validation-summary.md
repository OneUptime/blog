# Validation Summary: How to Understand the Relationship Between MTU and MSS

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- TCP/IP networking (MTU, MSS, three-way handshake)
- VXLAN overlay networking
- WireGuard VPN
- GRE and IPsec tunnels
- AWS / Azure VPN
- Linux iptables (mangle table, TCPMSS target)
- tcpdump, tshark, ss command-line tools
- Python and C socket APIs (TCP_MAXSEG / IPPROTO_TCP)
- Jumbo Ethernet frames

## Sources Consulted
- RFC 879 (The TCP Maximum Segment Size and Related Topics)
- RFC 6691 (TCP Options and Maximum Segment Size)
- RFC 7348 (VXLAN: Virtual eXtensible Local Area Network) — VXLAN header overhead
- WireGuard documentation and `wg-quick(8)` manpage — default MTU of 1420 (1500 - 80)
- Linux kernel `tcp(7)` manpage — TCP_MAXSEG socket option
- iptables-extensions(8) manpage — TCPMSS target with --set-mss and --clamp-mss-to-pmtu
- tcpdump(8) and pcap-filter(7) manpages — BPF symbolic flag names like `tcp-syn`
- ss(8) manpage — `-tin` flags and `mss:` output field
- Linux kernel networking documentation on VXLAN default MTU calculation (physical - 50)

## Issues Found
No technical issues found.

All overhead calculations are accurate:
- Ethernet: 1500 - 40 = 1460 MSS ✓
- VXLAN: 50-byte overhead (outer IP 20 + UDP 8 + VXLAN 8 + inner Ethernet 14) → 1410 MSS ✓
- WireGuard: 80-byte overhead matches wg-quick default → 1380 MSS ✓
- GRE: 24-byte overhead (4 GRE + 20 outer IP) → 1436 MSS ✓
- Jumbo: 9000 - 40 = 8960 MSS ✓

All commands and code are correct:
- `tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0' -v` — valid BPF syntax
- `tshark -f 'tcp[tcpflags] & 0x02 != 0'` — valid capture filter
- `ss -tin | grep mss` — `-t` TCP, `-i` info, `-n` numeric; `mss:` is a documented field
- `iptables -t mangle ... -j TCPMSS --set-mss N` and `--clamp-mss-to-pmtu` — valid xtables-extensions
- Python `s.setsockopt(socket.IPPROTO_TCP, socket.TCP_MAXSEG, MSS)` — correct API
- C `setsockopt(sock, IPPROTO_TCP, TCP_MAXSEG, &mss, sizeof(mss))` — correct API

## Review Notes
- The TCP_MAXSEG socket option is a hint to the kernel; on Linux the actual MSS announced may also be capped by the route MTU. The post correctly suggests verifying with `tcpdump` after setting it, which is the right validation approach.
- The unused `import struct` in the Python example is harmless; left as-is to preserve the author's content.
- AWS VPN and Azure P2S VPN overhead numbers are mode-dependent (transport vs tunnel mode IPsec, AES-GCM vs AES-CBC+SHA, NAT-T, etc.). The figures given (101 and 150 bytes) are reasonable conservative defaults that match commonly published recommendations from AWS and Microsoft docs, though specific deployments may differ slightly.
- The post focuses on IPv4 (40-byte headers); IPv6 would use 60 bytes (40-byte IPv6 header + 20-byte TCP header), which is implied by the IPv4 tag but not explicitly called out — acceptable scoping.
