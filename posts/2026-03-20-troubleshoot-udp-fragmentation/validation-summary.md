# Validation Summary: How to Troubleshoot UDP Fragmentation Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- UDP / IP networking
- IP fragmentation and Path MTU Discovery (PMTUD)
- Linux kernel networking (`/proc/net/snmp`, `nstat`, `sysctl`)
- `ping`, `tcpdump`, `tracepath`
- Wireshark display filters
- Python `socket` module (Linux IP_MTU_DISCOVER / IP_MTU socket options)
- GRE and IPsec ESP tunnel overhead

## Sources Consulted
- RFC 791 (Internet Protocol) — IP header layout, DF/MF flags, fragment offset field
- RFC 768 (UDP) — UDP header (8 bytes)
- RFC 1191 (Path MTU Discovery)
- Linux man page `ip(7)` — IP_MTU_DISCOVER, IP_PMTUDISC_* constants, IP_MTU
- Linux kernel header `/usr/include/linux/in.h` — verified IP_MTU_DISCOVER=10, IP_MTU=14, IP_PMTUDISC_DONT=0, IP_PMTUDISC_WANT=1, IP_PMTUDISC_DO=2, IP_PMTUDISC_PROBE=3
- Linux man page `ping(8)` — `-s`, `-M do` flags
- Linux man page `tracepath(8)`
- Linux kernel docs `ip-sysctl.txt` — `net.ipv4.ipfrag_time` (default 30s, verified locally)
- Wireshark display filter reference — `ip.flags.mf`, `ip.frag_offset`, `ip.reassembled_in`
- tcpdump pcap-filter syntax — `ip[6:2] & 0x3fff` masks off DF (bit 14) while keeping MF (bit 13) and the 13-bit fragment offset

## Issues Found
No technical issues found. All commands, flags, constants, and calculations were verified:
- UDP overhead: 20-byte IPv4 header + 8-byte UDP header = 28 bytes; max non-fragmenting payload on standard Ethernet = 1500 - 28 = 1472 bytes — correct.
- ICMP echo overhead: 8-byte ICMP header + 20-byte IP header = 28 bytes, so `ping -s 1472` produces a 1500-byte packet — correct.
- GRE overhead: 20-byte outer IP + 4-byte basic GRE = 24 bytes; inner MTU 1476, max UDP payload 1448 — correct.
- IPsec ESP overhead ~50 bytes is a reasonable rule-of-thumb (actual varies with cipher, IV, padding, ICV, and tunnel/transport mode).
- tcpdump filter `'ip[6:2] & 0x3fff != 0'` correctly matches packets where MF=1 OR fragment offset > 0 (mask 0x3fff excludes bit 14 / DF, keeps bit 13 / MF and bits 12-0 / offset).
- `IP_PMTUDISC_PROBE = 3` and the Python `setsockopt(IPPROTO_IP, IP_MTU_DISCOVER, 3)` / `getsockopt(IPPROTO_IP, IP_MTU)` pattern matches the `ip(7)` man page.
- `net.ipv4.ipfrag_time` default of 30 seconds verified on a current Linux system.
- Wireshark filter names (`ip.flags.mf`, `ip.frag_offset`, `ip.reassembled_in`) are valid in current Wireshark releases.

## Review Notes
- Portability caveat for the Python snippet: `socket.IP_MTU_DISCOVER` and `socket.IP_MTU` are Linux-only and exposed only when CPython was built with the relevant kernel headers visible. On some distributions / Python builds these names may not be present, in which case the integer values (10 and 14) can be used directly. This is implicit in the post (which already labels the section as Linux-focused) and not strictly an error.
- `connect()` on a UDP socket only sets a default destination — it does not transmit, so the `IP_MTU` returned reflects the route MTU rather than a discovered path MTU. For a true PMTU discovery loop the application must actually send probes and react to ICMP "fragmentation needed" / EMSGSIZE. The post's example is fine as a starting estimate, but readers expecting a fully active PMTUD probe should use IP_PMTUDISC_DO and react to EMSGSIZE in a send loop.
- Modern PMTUD blackhole detection (`net.ipv4.tcp_mtu_probing`) is TCP-only and intentionally out of scope here.
