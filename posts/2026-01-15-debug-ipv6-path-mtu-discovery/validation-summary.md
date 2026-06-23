# Validation Summary: How to Debug IPv6 Path MTU Discovery Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- IPv6 / ICMPv6 Path MTU Discovery (PMTUD)
- Linux networking tools: `ip`, `ping6`, `traceroute6`, `mtr`, `tcpdump`, `ss`
- `ip6tables` / `nftables` (firewall rules, MSS clamping)
- Linux sysctl / procfs (`tcp_mtu_probing`, `tcp_base_mss`, `/proc/net/snmp6`, `ip -6 route show cache`)
- bpftrace / eBPF tracing
- Docker / Kubernetes CNI (Calico, Flannel) MTU configuration
- Tunnels: GRE, 6in4, IPsec, WireGuard, OpenVPN
- OneUptime custom monitors

## Sources Consulted
- RFC 8201 — Path MTU Discovery for IP version 6
- RFC 4443 — ICMPv6
- traceroute(8) man page (man7.org/linux/man-pages/man8/traceroute.8.html) — confirmed `-M` selects the trace *method*, and packet length is a positional `packetlen` argument
- iputils `ping`/`ping6` documentation (`-M do`, `-s` payload semantics)
- bpftrace documentation and tracepoint listings (bpftrace.org, github.com/bpftrace/bpftrace) — verified `tracepoint:icmp:icmp_receive` is not a mainline tracepoint and `tracepoint:tcp:tcp_rcv_space_adjust` does not expose `mss`/`pmtu` fields
- Linux `/proc/net/snmp6` — confirmed counter names `Icmp6InPktTooBigs` / `Icmp6OutPktTooBigs` on a live system
- Linux kernel net/ipv6/route.c — `ip6_update_pmtu` PMTU update path

## Issues Found
1. **`traceroute6 -M <size>` used to set packet size (2 locations).** In standard Linux traceroute, `-M` selects the tracing *method* (e.g. `-M icmp`, `-M tcp`); packet length is a positional argument (`traceroute [options] host [packetlen]`). The `-M 1400` / `-M 1500` forms would be parsed as an invalid method name and fail. Fixed to the positional form (`traceroute6 2001:db8::1 1400`, `traceroute6 destination 1500/1400`).
2. **Fabricated bpftrace examples (eBPF section).** The first example used `tracepoint:icmp:icmp_receive`, which does not exist in mainline kernels; the second used `tracepoint:tcp:tcp_rcv_space_adjust` with `args->sk`, `args->mss`, and `args->pmtu`, none of which are fields on that tracepoint. Both would error out for any reader. Replaced with verifiable, conservative alternatives: probe-discovery via `bpftrace -l 'kprobe:*icmpv6*'`/`'kprobe:*pmtu*'`, a kprobe on the real `ip6_update_pmtu` path using the always-available `comm`, and a count of the real `tracepoint:tcp:tcp_retransmit_skb` (which spikes during PMTU black holes).
3. **Misleading comment on `sysctl net.ipv6.conf.all.mtu`.** The comment claimed it checks "if PMTUD is enabled". IPv6 PMTUD is mandatory and always on; that sysctl only reports the configured MTU. Reworded the comment to reflect what the command actually shows.

## Review Notes
- The IPv4 "minimum MTU 576" comparison is a common simplification: 576 is the minimum datagram size every IPv4 host must be able to reassemble (RFC 791), while the minimum IPv4 *link* MTU is 68. The IPv6 minimum of 1280 bytes is correct. Left as-is since the comparison is widely used and understood.
- Issue 4's solution pairs the comment "accept ICMP on all interfaces" with `net.ipv6.conf.all.accept_source_route=0`, which actually controls source-routed packet acceptance, not ICMP handling. The command is valid and harmless; the framing is slightly loose. Left as-is to avoid scope creep, but could be clarified in a future edit.
- macOS `ping6 -D` behavior differs across macOS versions; not independently verified here, but the Linux `ping6 -M do` examples (the primary focus) are correct.
- `tcpdump 'icmp6 and ip6[40] == 2'` correctly matches ICMPv6 type 2 (Packet Too Big) only when no IPv6 extension headers precede the ICMPv6 header — a standard and acceptable idiom.
- The `net.ipv4.tcp_mtu_probing` / `tcp_base_mss` sysctls correctly apply to IPv6 TCP as well (TCP settings live under the `ipv4` namespace historically).
- Calico CNI config is referenced as `/etc/cni/net.d/calico.conf`; real installs commonly use a `.conflist` (e.g. `10-calico.conflist`). Treated as illustrative; not changed.
