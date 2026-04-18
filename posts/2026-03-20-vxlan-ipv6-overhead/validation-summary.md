# Validation Summary: How to Calculate and Optimize VXLAN IPv6 Overhead

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VXLAN (RFC 7348) over IPv6 underlay
- IPv6 (RFC 8200) and IPv6 PMTUD (RFC 8201)
- Linux `ip` / iproute2
- Linux `ethtool` offload features (`tx-udp_tnl-segmentation`, `rx-udp-gro-forwarding`)
- `sysctl` (`net.ipv6.route.*`)
- `ping` / `ping6` PMTU probing
- `iperf3` (JSON output) with Python parsing
- `nstat` IPv6 SNMP counters (`Ip6FragCreates`)

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN)
- RFC 8200 — IPv6 specification (no in-network fragmentation)
- RFC 8201 — IPv6 Path MTU Discovery (mandatory)
- Linux kernel VXLAN documentation: https://docs.kernel.org/networking/vxlan.html
- Linux kernel segmentation offloads: https://www.kernel.org/doc/html/latest/networking/segmentation-offloads.html
- Linux kernel IP sysctl reference: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ethtool(8)` man page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- iputils `ping(8)` (`-M` PMTUD flag semantics)
- iperf3 JSON output schema
- Linux kernel commit introducing `NETIF_F_GRO_UDP_FWD` (v5.12)

## Issues Found

1. **Inconsistent 70-byte overhead breakdown in the ASCII diagram.**
   The diagram labeled a 14-byte "Outer Ethernet header" as part of the 70-byte total and then annotated the sum as "(includes inner Ethernet)", which contradicts the diagram. Outer Ethernet is not counted against the physical IP MTU, whereas the inner Ethernet header (also 14 bytes) *is* consumed inside the outer IP payload. The bash MTU calculator in the next section correctly uses `INNER_ETH=14`, so the prose was the inconsistent part. Rewrote the summary under the diagram to reflect the MTU semantics the rest of the post relies on (`40 + 8 + 8 + 14 = 70`, with outer Ethernet explicitly called out as excluded) and corrected "Tunnel overhead" to describe the 56-byte figure as outer IP + UDP + VXLAN.

2. **`sysctl -w net.ipv6.conf.all.disable_policy=0` misrepresented as enabling IPv6 PMTUD.**
   `disable_policy` is an IPsec/XFRM knob (SPD lookup bypass for the interface); it has nothing to do with Path MTU Discovery. IPv6 PMTUD is mandatory per RFC 8201 and always on in the Linux stack — routers do not fragment, and the host processes ICMPv6 "Packet Too Big" messages automatically. Replaced with an accurate comment and a `net.ipv6.route.mtu_expires` example, which is the real tunable for PMTU cache behavior.

3. **`ethtool -K eth0 tx-vxlan-segmentation on` is not a real feature.**
   There is no `tx-vxlan-segmentation` flag in the Linux kernel — VXLAN hardware offload is exposed through the generic UDP-tunnel flags (`NETIF_F_GSO_UDP_TUNNEL` → `tx-udp_tnl-segmentation` and `NETIF_F_GSO_UDP_TUNNEL_CSUM` → `tx-udp_tnl-csum-segmentation`). Removed the invalid line and added the companion `tx-udp_tnl-csum-segmentation` toggle instead. Also tightened the `ethtool -k` filter so users actually see the relevant flags, and noted that `rx-udp-gro-forwarding` requires Linux 5.12+.

## Review Notes
- The 70-byte overhead figure for VXLAN-over-IPv6 and the 20-byte delta vs. VXLAN-over-IPv4 (50 bytes) are correct and match vendor documentation.
- The `iperf3 -J` JSON path `d['end']['sum_received']['bits_per_second']` is the correct schema key; valid for single-stream and bidirectional tests.
- `ping6` is retained as a legacy alias for `ping` on modern iputils; `ping -6 -M do -s ...` is the more forward-compatible form but `ping6 -M do ...` still works on the distributions this post is aimed at.
- `ip -6 route show cache` still works even though the IPv6 route *cache* per se was removed long ago — the command now displays route exceptions, which includes PMTU exceptions, so the guidance remains valid.
- The post assumes the reader has a kernel/driver combination that actually advertises UDP-tunnel offloads; NICs without those flags will fall back to software GSO, which the `|| echo "... not supported"` fallbacks already handle gracefully.
