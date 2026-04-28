# Validation Summary: How to Scale NDP in Large L2 IPv6 Networks

## Status
validated

## Post Type
Tutorial / Operations guide (data center IPv6 NDP scaling)

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861
- Linux bridge `neigh_suppress` (per-port ARP/ND suppression)
- VXLAN with Linux bridges
- BGP EVPN (FRRouting) — Type 2 MAC/IP routes
- Linux IPv6 neighbor cache sysctls (`net.ipv6.neigh.default.gc_thresh*`)
- nftables (`ip6` family, ICMPv6 NS rate limiting)
- tcpdump filtering on ICMPv6 type
- `iproute2` / `bridge` utilities

## Sources Consulted
- [RFC 4861: Neighbor Discovery for IP version 6 (IPv6)](https://www.rfc-editor.org/rfc/rfc4861.html)
- [bridge(8) — iproute2 manpage (Debian)](https://manpages.debian.org/unstable/iproute2/bridge.8.en.html)
- [bridge(8) — Linux manual page (man7.org)](https://man7.org/linux/man-pages/man8/bridge.8.html)
- [LWN: bridge: Add per-{Port, VLAN} neighbor suppression](https://lwn.net/Articles/928999/)
- [Ethernet Bridging — The Linux Kernel documentation](https://docs.kernel.org/networking/bridge.html)
- [Red Hat: An introduction to Linux bridging commands and features](https://developers.redhat.com/articles/2022/04/06/introduction-linux-bridging-commands-and-features)

## Issues Found
1. **Incorrect NS multicast destination** — The post stated NS messages are sent to "solicited-node multicast or all-nodes". Per RFC 4861, NS for address resolution and DAD is sent to the solicited-node multicast address (FF02::1:FFXX:XXXX) only. NS is never sent to the all-nodes address (FF02::1). NA messages can be sent to all-nodes (unsolicited NA), but NS cannot. Reworded to clarify NS uses solicited-node multicast and explain why this still floods L2 (lack of IPv6 MLD snooping).

2. **Wrong kernel version for `neigh_suppress`** — The post claimed Linux 4.10+. The bridge port `neigh_suppress` flag (`IFLA_BRPORT_NEIGH_SUPPRESS`) was actually added in Linux 4.15 (commit 821f1b21cabb by Roopa Prabhu, Nov 2017). Updated to 4.15+.

3. **`neigh_suppress` set on bridge master instead of port** — The post used `ip link set br100 type bridge neigh_suppress on`, which is invalid. `neigh_suppress` is a per-port attribute applied to bridge slaves via `bridge link set dev <PORT> neigh_suppress on`. Fixed in both the Linux Bridge section and the VXLAN Fabric section.

4. **`vlan_filtering on` syntax** — `iproute2`'s `vlan_filtering` argument is parsed via `get_u8`, so it expects an integer (`0`/`1`), not `on`/`off`. Changed to `vlan_filtering 1` and folded the option into the `ip link add` invocation.

5. **`bridge link show` does not display port-level attributes by default** — Verifying `neigh_suppress` requires `bridge -d link show` (detail mode). Added the `-d` flag to the verify command.

6. **`awk '{print $5}'` is not the state field** — `ip -6 neigh show` output has a variable column count: `<addr> dev <dev> lladdr <mac> [router] STATE` for resolved entries (state at $6 or $7), and `<addr> dev <dev>  STATE` for FAILED/INCOMPLETE (state at $4). Field 5 is typically the MAC address, not the state. Changed to `awk '{print $NF}'` so the state (always the last field) is captured regardless of presence of `lladdr`/`router` tokens.

## Review Notes
- The math in "NS Scalability Problem" (10,000 VMs × 1 NS / 30s ≈ 333 NS/s) is a hand-wavy worst-case estimate based on Linux's default `base_reachable_time_ms` (30s) — Linux NUD does not actually probe REACHABLE entries on a fixed interval (entries transition through STALE → DELAY → PROBE only as needed), but the order of magnitude is reasonable for a flat busy VLAN, so the figure was left as written.
- The "FRR BGP EVPN with NDP Suppression" snippet mixes FRR vtysh syntax (`router bgp`, `address-family l2vpn evpn`) with Cumulus/ifupdown2 interface keywords (`vxlan id`, `vxlan local-tunnelip`, `bridge-access`). The block is marked as `text` and is illustrative; the BGP portion is correct FRR. Left as-is to avoid restructuring the example beyond fixing technical errors.
- VXLAN interfaces in Linux/FRR typically do not carry their own IP address (they are bridge slaves; the SVI / bridge interface holds the IP). The `ip address 2001:db8:1::1/64` line on `interface vxlan100` is conceptually unusual but appears illustrative; left alone since the section is informal.
- The tcpdump expression `ip6[40]==135 or ip6[40]==136` is correct for ICMPv6 NS/NA when there are no IPv6 extension headers (the `icmp6` filter ensures next-header is ICMPv6). An alternative more idiomatic form is `icmp6[0]==135 or icmp6[0]==136`. Left as-is — the original works.
- The nftables rules apply rate-limiting in the `forward` hook, which assumes hypervisor topology where guest traffic transits the host's forward path (e.g., bridged/routed VM networking). For OVS-based environments, equivalent rate-limiting would be in OpenFlow rules instead. Author's framing as "at the Hypervisor" is reasonable.
