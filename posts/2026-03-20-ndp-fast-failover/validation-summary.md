# Validation Summary: How to Configure NDP for Fast IPv6 Failover

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP / RFC 4861)
- Linux kernel sysctl `net.ipv6.neigh.*` parameters
- VRRP / VRRPv3 (RFC 5798) via keepalived
- radvd (Router Advertisement Daemon)
- iproute2 (`ip -6 neigh`)
- ndisc6 / `ndsend`
- Scapy (Python packet crafting, `ICMPv6ND_NA`, `ICMPv6NDOptDstLLAddr`)
- iputils `ping6`

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 5798 — Virtual Router Redundancy Protocol (VRRP) Version 3 for IPv4 and IPv6: https://datatracker.ietf.org/doc/html/rfc5798
- Linux kernel networking docs — `Documentation/networking/ip-sysctl.rst` (`net.ipv6.neigh.*`)
- Live `/proc/sys/net/ipv6/neigh/default/*` values verified on this host
- radvd source / radvd.conf(5) man page (`DFLT_MaxRtrAdvInterval = 600`)
- keepalived.conf(5) man page — `vrrp_instance` and `virtual_ipaddress` syntax
- ndisc6 package documentation — `ndsend(8)`
- Scapy IPv6 layer (`scapy.layers.inet6`) — `ICMPv6ND_NA`, `ICMPv6NDOptDstLLAddr`
- iproute2 `ip-neighbour(8)` — valid `nud` states

## Issues Found

1. **Invalid IPv6 placeholder address `2001:db8::vip`** — "vip" is not a valid hex character, so the literal would fail to parse in keepalived, scapy, and `ping6`. Replaced all three occurrences (keepalived `virtual_ipaddress`, the `VIP` shell variable in the failover script, and the `TARGET` in `measure-failover.sh`) with `2001:db8::100`, a valid IPv6 address from the documentation prefix.

2. **`ucast_solicit` / `mcast_solicit` set to default value despite "Reduce" comment** — The section heading and inline comment "Reduce number of NS probes" indicate intent to lower the probe count, but both were assigned `=3`, which is the kernel default (verified against `/proc/sys/net/ipv6/neigh/default/{ucast,mcast}_solicit`). Changed both to `=2` so the snippet actually reduces probes as advertised.

3. **Incorrect radvd `MaxRtrAdvInterval` default** — Comment claimed "Default 200s". Per the radvd source (`DFLT_MaxRtrAdvInterval = 600`) and radvd.conf(5), the default is 600 seconds. Updated the comment to `Default 600s`.

## Review Notes

- The documented Linux NDP defaults (30s reachable, 5s delay_first_probe, 1s retrans_time, 3 mcast/ucast_solicit) match the live kernel values on the verification host and the kernel `ip-sysctl.rst` documentation.
- Note that `base_reachable_time_ms` is randomized by the kernel between 0.5x and 1.5x the configured value (per `neigh_rand_reach_time` in the kernel), so a 10000ms setting yields actual REACHABLE durations of 5–15s. The post's "~12s" total detection figure is an approximation; the worst case with the tuned values is closer to 15s + 2s + 3×0.5s ≈ 18.5s. This is a simplification the author chose intentionally and is not technically incorrect.
- `ping6` is deprecated on most modern distributions in favour of `ping -6` (iputils merged the binaries), but `ping6` still works and remains a symlink on most systems. Acceptable for now; could be modernised in a future revision.
- The keepalived snippet relies on auto-detection of VRRPv3 from the IPv6 `virtual_ipaddress`. Modern keepalived (≥1.3) handles this correctly; older versions may require explicit `version 3`.
- The Scapy NA construction is correct: Ethernet destination `33:33:00:00:00:01` is the multicast MAC for `ff02::1`, and `ICMPv6NDOptDstLLAddr` (despite its scapy name) is the Target Link-Layer Address option (Type 2) used in NAs per RFC 4861 §4.6.1.
- `ip -6 neigh change <addr> ... nud probe` requires the entry to already exist in the cache; if it doesn't, the command will fail. Using `replace` instead would be more robust, but the author's usage assumes the gateway is cached after recovery, which is reasonable.
