# Validation Summary: How to Configure MTU for IPv4 VPN Tunnels to Avoid Fragmentation

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- WireGuard (Linux kernel + wg-quick)
- OpenVPN (UDP and TCP modes)
- IPSec / StrongSwan with XFRM interfaces
- Linux `iproute2` (`ip link`)
- `iptables` `mangle` table with `TCPMSS` target
- `ping` (iputils) Path MTU Discovery via `-M do`
- `tcpdump` BPF filters
- `/proc/net/snmp` IP statistics

## Sources Consulted
- WireGuard project documentation and `wg-quick(8)` man page (https://man7.org/linux/man-pages/man8/wg-quick.8.html) — confirms `MTU` field in `[Interface]` section and project default of 1420.
- WireGuard whitepaper (https://www.wireguard.com/papers/wireguard.pdf) — confirms 60-byte IPv4 / 80-byte IPv6 encapsulation overhead.
- OpenVPN 2.6 reference manual (https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/) — confirms `tun-mtu`, `fragment`, and `mssfix` options and their semantics.
- iputils `ping(8)` man page — confirms `-M do` (set DF, fail if too large) and `-s` (payload size) flags.
- `iptables-extensions(8)` man page — confirms `TCPMSS` target with `--set-mss` and `--tcp-flags SYN,RST SYN` matcher syntax.
- `tcpdump(8)` / pcap-filter(7) — confirms `ip[6:2] & 0x1fff != 0` BPF expression for non-first IP fragments.
- Linux kernel `Documentation/networking/snmp_counter.rst` and `/proc/net/snmp` layout — used to verify the statistics command actually emits both header and value rows.
- StrongSwan documentation on XFRM interfaces (https://docs.strongswan.org/docs/5.9/features/routeBasedVpn.html) — confirms XFRM virtual interface use for IPsec route-based VPNs.

## Issues Found
1. **`/proc/net/snmp` fragmentation-stats command returned no values.** The original command was:

   ```bash
   cat /proc/net/snmp | grep -A 1 Ip | grep -i frag
   ```

   The `grep -A 1 Ip` returns the two-line `Ip:` block (header line + numeric values line), but the trailing `grep -i frag` then only matches the header line because the values line has no "frag" substring — so the user sees field names with no actual counters. Replaced with `grep "^Ip:" /proc/net/snmp`, which prints both rows so the reader can read the FragOKs / FragFails / FragCreates / Reasm* columns. Updated the comment to point at the relevant column names.

## Review Notes
- The WireGuard table row lists the IPv4 underlay overhead as ~60 bytes but the recommended tunnel MTU as 1420. Strict math gives 1500 − 60 = 1440 for an IPv4-only underlay; 1420 is the WireGuard kernel default (`DEFAULT_MTU`) chosen as a conservative value that also accommodates an 80-byte IPv6 underlay overhead. Left as-is because 1420 is the universally cited WireGuard recommendation and matches the in-post `MTU = 1420` example, but readers operating exclusively over IPv4 underlay can safely use 1440.
- OpenVPN's `mssfix N` does not directly set the TCP MSS to `N`; it caps the outgoing wire (UDP/TCP) packet size at `N` bytes and OpenVPN derives the announced MSS from that. The post's comment ("Clamp TCP MSS …") is accurate in spirit because the practical effect is to clamp MSS, and the chosen value (1300) is conservative relative to `tun-mtu 1400`, so no change made.
- The `tcpdump` filter `ip[6:2] & 0x1fff != 0` matches non-first fragments (those with a non-zero offset). It does not catch the first fragment of a fragment train (which has offset 0 but the More Fragments flag set). For most diagnostic purposes this is sufficient because seeing any non-first fragment proves fragmentation is occurring; a stricter filter would be `'(ip[6:2] & 0x1fff) != 0 or ip[6] & 0x20 != 0'`. Left as-is since the post's claim ("If this shows output, packets are being fragmented") remains correct.
- The MSS clamp value of 1380 in the iptables example correctly matches `MTU 1420 − 20 (IPv4) − 20 (TCP) = 1380`.
- The `+ 28 bytes (IP+ICMP headers)` note for `ping -s` is correct (20-byte IPv4 header + 8-byte ICMP echo header).
