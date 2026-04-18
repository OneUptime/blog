# Validation Summary: How to Verify Multicast Group Membership on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux networking (iproute2 `ip maddr`)
- IGMP (Internet Group Management Protocol, RFCs 2236/3376)
- `/proc/net/igmp`, `/proc/net/mcfilter`, `/proc/net/netstat`, `/proc/net/snmp`
- `netstat -g` (net-tools)
- `tcpdump` IGMP capture
- Python `socket` multicast join (IP_ADD_MEMBERSHIP / `struct ip_mreq`)

## Sources Consulted
- Linux kernel `net/ipv4/igmp.c` (igmp_mc_seq_show / mcf_seq_show), v6.1: https://elixir.bootlin.com/linux/v6.1/source/net/ipv4/igmp.c
- Linux kernel `net/ipv4/proc.c` (snmp_seq_show): https://elixir.bootlin.com/linux/v6.1/source/net/ipv4/proc.c
- iproute2 `ip-maddress(8)` man page
- `netstat(8)` (net-tools)
- `tcpdump(1)` and pcap-filter(7) for `ip proto 2`
- Python `socket` module docs (IP_ADD_MEMBERSHIP)
- IPv4 multicast → MAC mapping (RFC 1112): lower 23 bits of group address into 01:00:5E:xx:xx:xx

## Issues Found
1. **Wrong byte order in the `/proc/net/igmp` example output.** The post claimed the Group column is "little-endian hex" but the example values (`EF000001`, `E0000001`, `E00000FB`) were the network-byte-order representations. The kernel prints `__be32 multiaddr` with `%08X`, so on little-endian x86_64 the output is the host-order reinterpretation: 224.0.0.1 → `010000E0`, 224.0.0.251 → `FB0000E0`, 239.0.0.1 → `010000EF`. Updated the example to show the actual host-order hex and rephrased "little-endian hex" as "32-bit integer in host byte order (little-endian on x86_64)".
2. **Output structure was wrong.** The kernel prints the device line and each group line on separate lines (the device line contains no group info). Restructured the example so each group sits on its own line under the device header.
3. **Python conversion produced the wrong IP.** With the old input `EF000001`, `bytes.fromhex(...)[::-1]` actually yields `1.0.0.239`, not `239.0.0.1`. Updated the example to use `010000EF` (the value that actually appears in `/proc/net/igmp`), which correctly converts to `239.0.0.1`. Also dropped the unused `import struct`.
4. **`/proc/net/snmp` has no IGMP section.** `cat /proc/net/snmp | grep -i igmp` returns nothing on standard Linux kernels — only `Ip:`, `Icmp:`, `IcmpMsg:`, `Tcp:`, `Udp:`, `UdpLite:` sections exist. Replaced with `cat /proc/net/netstat | grep -i mcast`, which surfaces the actual multicast counters (`InMcastPkts`, `OutMcastPkts`, `InMcastOctets`, `OutMcastOctets`) under `IpExt`, plus a brief note explaining why.

## Review Notes
- IPv4 → multicast MAC mappings shown in the `ip maddr` example (`01:00:5e:00:00:01` for 224.0.0.1, `01:00:5e:00:00:fb` for 224.0.0.251) are correct per RFC 1112.
- The `tcpdump -i eth0 -n -v "ip proto 2"` filter is correct (IGMP is IP protocol 2); the alternative shorter form `igmp` would also work.
- The Python `IP_ADD_MEMBERSHIP` snippet is correct; `struct ip_mreq` is `multiaddr (4 bytes) + interface (4 bytes)`, and `0.0.0.0` lets the kernel pick the interface.
- Bringing an interface down/up to trigger IGMP reports works but is disruptive — fine as a testing technique with the caveat already implied by the "for testing querier behavior" framing.
- `netstat -g -n | grep -v "^$" | grep "\."` is a reasonable IPv4-only filter since IPv6 multicast addresses contain no dots.
- `/proc/net/mcfilter` exists and is the right file for IGMPv3 source-filter state.
