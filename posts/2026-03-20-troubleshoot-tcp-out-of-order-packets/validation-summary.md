# Validation Summary: How to Troubleshoot TCP Out-of-Order Packets

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux kernel networking (sysctl `net.ipv4.fib_multipath_hash_policy`, `net.ipv4.tcp_reordering`)
- Linux ECMP (Equal-Cost Multi-Path) routing
- TCP protocol behavior (out-of-order queue, fast retransmit, duplicate ACKs)
- `nstat` / SNMP TCP extension counters (`TcpExtTCPOFOQueue`, `TcpExtTCPOFODrop`, `TcpExtTCPOFOMerge`, spurious retransmits)
- `tcpdump` and `tshark` packet capture
- Wireshark display filters (`tcp.analysis.out_of_order`)
- `iperf3` throughput measurement
- `ip route`, `traceroute`, `paris-traceroute`, `ping -I`

## Sources Consulted
- Linux kernel `Documentation/networking/ip-sysctl.rst` (fib_multipath_hash_policy, tcp_reordering)
- Linux kernel source: `net/ipv4/route.c`, `include/uapi/linux/snmp.h`
- Kernel commit `bf4e0a3db97eb` (Mar 2017, Nikolay Aleksandrov) — introduced `fib_multipath_hash_policy` in 4.12
- Kernel commit `0e884c78ee19e` (kernel 4.4) — flow-based L3 multipath hash
- Wireshark display-filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- Debian package index: paris-traceroute (sid / Ubuntu universe)

## Issues Found
- **`fib_multipath_hash_policy` value descriptions were inaccurate.** The post originally claimed value 0 (L3) "can reorder within a flow" and characterized it as "per-packet" load balancing, while value 1 was framed as the only "flow-based" option. In modern Linux (kernel 4.4+ for IPv4 ECMP, and 4.12+ for the sysctl itself), both 0 and 1 are flow-based — value 0 hashes on src/dst IP, value 1 on the 5-tuple. Neither produces per-packet spraying within a single TCP flow on the Linux forwarding plane. Updated the comments around the sysctl, the rationale comment for switching to 1, and added values 2 and 3 for completeness. Also added a note that per-packet within-flow reordering on Linux is typically caused by upstream routers, switches, or middleboxes (e.g. LACP with per-packet hashing), not by Linux itself.
- **Conclusion was rewritten** to remove the inaccurate "ECMP per-packet load balancing" framing and the incorrect claim that switching to `fib_multipath_hash_policy=1` "eliminates within-flow reordering." Replaced with the accurate motivation: better flow distribution across nexthops.

## Review Notes
- The `ping -I 192.168.1.10 ...` examples use `-I` to set the source address, not strictly "source routing" (which is a distinct, mostly-deprecated IP option). The technique works in practice when policy routing or per-source-IP routes direct traffic onto different uplinks, so the example is functionally fine, just imprecisely labeled. Left as-is to preserve author voice.
- `nstat` resets counters between invocations by default, so `watch -n 1 "nstat -z | grep OFO"` shows per-interval deltas — which is what you usually want when watching for live OOO events. Worth mentioning in a future revision but not incorrect.
- The `paris-traceroute` package is correct on Debian/Ubuntu; the tool keeps the 5-tuple constant across probes specifically so that ECMP hashing pins all probes to the same path, which is the property needed to verify flow consistency.
- All counter names (`TcpExtTCPOFOQueue`, `TcpExtTCPOFODrop`, `TcpExtTCPOFOMerge`), the `tcp_reordering` default of 3, the Wireshark filter `tcp.analysis.out_of_order`, and the `iperf3 ... | grep Retr` invocation all check out against current sources.
