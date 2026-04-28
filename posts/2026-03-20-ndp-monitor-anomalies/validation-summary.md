# Validation Summary: How to Monitor NDP Anomalies on IPv6 Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP, RFC 4861)
- ICMPv6 message types 133-137 (RS, RA, NS, NA, Redirect)
- tcpdump / libpcap (BPF capture filters)
- NDPMon (NDP monitoring daemon)
- Wireshark (capture and display filters)
- Linux kernel neighbor cache (`ip -6 neigh`, `/proc/net/stat/ndisc_cache`)
- SNMP (IPV6-ICMP-MIB, RFC 2466)
- IPFIX/NetFlow with ICMPv6 (proto=58)
- Cisco IOS RA Guard / SNMP traps

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 2466 — IPV6-ICMP-MIB definitions: https://www.rfc-editor.org/rfc/rfc2466
- RFC 4293 — IP-MIB (note: obsoletes parts of RFC 2466): https://www.rfc-editor.org/rfc/rfc4293
- Linux kernel `net/core/neighbour.c` (`neigh_stat_seq_show`): source-of-truth for `/proc/net/stat/ndisc_cache` columns
- Wireshark documentation on capture vs. display filter syntax: https://wiki.wireshark.org/CaptureFilters and https://wiki.wireshark.org/DisplayFilters
- NDPMon project: https://ndpmon.sourceforge.net/ (config_ndpmon.xml sample)
- tcpdump expression manual (BPF byte-offset filters such as `ip6[40] == 134`)

## Issues Found

1. **Incorrect SNMP OIDs (IPV6-ICMP-MIB, RFC 2466).** The post listed three wrong column indices under base `1.3.6.1.2.1.56.1.1.1`:
   - `ipv6IfIcmpOutMsgs` was listed as `.2`; the correct column is `.18` (`.2` is `ipv6IfIcmpInErrors`).
   - `ipv6IfIcmpInRouterAdvertisements` was listed as `.10`; the correct column is `.11` (`.10` is `ipv6IfIcmpInRouterSolicits`).
   - `ipv6IfIcmpInNeighborAdvertisements` was listed as `.16`; the correct column is `.13` (`.16` is `ipv6IfIcmpInGroupMembResponses`).
   Updated to the correct sequential ordering and added a note that the table is indexed by ifIndex (the full instance OID appends the interface index).

2. **Wrong description of `/proc/net/stat/ndisc_cache` columns.** The post said the columns were "interval, total_entries, ...". Per the Linux kernel's `neigh_stat_seq_show` output, there is no `interval` column and the first column is `entries`. Replaced with the actual column list (entries, allocs, destroys, hash_grows, lookups, hits, res_failed, rcv_probes_mcast, rcv_probes_ucast, periodic_gc_runs, forced_gc_runs, unresolved_discards, table_fulls) and noted that values are printed in hex with one row per CPU.

3. **Wireshark "Capture Filter" used display filter syntax.** The block labeled "Capture Filter (for live capture)" used Wireshark display-filter syntax (`icmp6.type == 133`), which is invalid for capture filters. Capture filters in Wireshark/tshark/dumpcap use libpcap/BPF syntax. Added a correct BPF capture filter (`icmp6 and (ip6[40] == 133 or ...)`) and clearly relabeled the dfilter form as a Display Filter so both can be used appropriately.

4. **NDPMon XML config snippet did not match upstream schema.** The illustrative XML used `<prefix_list>` and a single string-form `<prefix>2001:db8::/64</prefix>`, plus a `<param name="curlft">` at router scope. NDPMon's `config_ndpmon.xml` actually uses `<prefixes>` containing `<prefix>` elements with nested `<address>` / `<mask>` and per-prefix `<param>` children (e.g. `param_curlft`), wrapped in a `<config_ndpmon>` root. Rewrote the snippet to match the upstream sample and replaced the made-up `<plugins>`/`<plugin>` block (NDPMon syslog/output behavior is configured via its main config file rather than an XML `<plugin>` element).

## Review Notes
- RFC 2466 (IPV6-ICMP-MIB) is technically obsoleted/superseded by RFC 4293 (IP-MIB), which integrates IPv4 and IPv6 ICMP statistics into `icmpStatsTable`/`icmpMsgStatsTable`. Most modern Cisco/Linux SNMP agents still expose the RFC 2466 OIDs, so keeping them is fine for practical monitoring; a future revision could mention RFC 4293 as the modern alternative.
- The Cisco command `snmp-server enable traps ipv6 nd raguard` is shown as an illustrative example; the exact trap name and availability vary by Cisco platform/IOS version, so readers should consult `snmp-server enable traps ?` on their device.
- The threshold guidance ("~1 RA per 200 seconds per router", "more than 5 RAs/sec = flooding") is consistent with the RFC 4861 default `MinRtrAdvInterval` of 200 s / `MaxRtrAdvInterval` of 600 s and reasonable for anomaly detection.
- The tcpdump BPF filter `icmp6 and ip6[40] == 134` correctly inspects the ICMPv6 type byte at offset 40 of the IPv6 packet, which is valid only when no IPv6 extension headers precede the ICMPv6 header — usually true for NDP traffic but worth noting in production environments that may use extension headers.
- The `grep -oP 'fe80::[a-f0-9:]+(?= >)'` source-extraction regex is fragile and depends on the precise tcpdump output format; a future revision could use `tcpdump -e -ttt` plus structured parsing or `scapy`/`tshark -T fields` for robustness.
