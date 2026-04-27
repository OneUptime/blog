# Validation Summary: How to Configure OSPF with VRF for Multi-Tenant Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux VRF (Virtual Routing and Forwarding)
- iproute2 (`ip link`, `ip route`, `ip addr`)
- FRRouting (FRR) — vtysh and frr.conf
- OSPFv2 (IPv4)
- Linux sysctl (rp_filter, ip_forward)

## Sources Consulted
- FRRouting OSPFv2 documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRRouting VRF documentation: https://docs.frrouting.org/en/latest/vrf.html
- Linux kernel VRF documentation: https://docs.kernel.org/networking/vrf.html
- iproute2 `ip-route(8)` man page (route SELECTOR syntax with `proto RTPROTO` filter)
- iproute2 `ip-link(8)` man page (`type vrf table`, `master VRF` syntax)
- RFC 2328 (OSPF Version 2)

## Issues Found

1. **Incorrect protocol filter syntax for `ip route show`** — The post used `ip route show vrf VRF-A ospf`, which is not valid iproute2 syntax. The protocol filter requires the `proto` keyword. Fixed to `ip route show vrf VRF-A proto ospf`, which matches the iproute2 SELECTOR grammar (`[ proto RTPROTO ]`).

2. **Misleading comment about rp_filter** — The kernel sysctl section was titled with the comment "Enable VRF-aware forwarding", but `net.ipv4.conf.*.rp_filter = 0` does not enable VRF-aware forwarding (which is provided by the kernel's CONFIG_NET_VRF / l3mdev subsystem and per-socket `tcp_l3mdev_accept`/`udp_l3mdev_accept` sysctls). It disables strict reverse-path filtering, which is needed because traffic in a VRF can fail RPF checks due to the slave-interface vs. master-VRF route lookup. Updated the comment to "Disable strict reverse path filtering (needed for asymmetric paths in VRFs)" so it accurately reflects what the sysctl does.

## Review Notes

- The `vrf VRF-A` block with `vni 100` in the FRR configuration file is technically valid FRR syntax but specifically targets EVPN-VXLAN deployments. For a plain OSPF-in-VRF setup (the topic of this post), a VNI is not required. The block is left in place since it isn't strictly incorrect, but readers running pure OSPF without VXLAN/EVPN can omit `vni` entries.
- `frr version 8.x` in the example FRR config is a placeholder; the real `/etc/frr/frr.conf` will contain a concrete version string written by the daemon (e.g., `frr version 8.5.4`).
- A safer alternative to disabling rp_filter entirely is loose-mode RPF (`rp_filter = 2`), which still drops packets that cannot be routed back via any interface but tolerates VRF asymmetry. Both approaches are common; the post's choice (0) is acceptable in lab/tenant-isolated topologies.
- Using the same `ospf router-id` across different VRFs is correctly noted as fine — each VRF runs an independent OSPF instance with its own LSDB and adjacencies.
- Overlapping IP address space across VRFs (the `10.0.0.1/24` on both `eth1` and `eth2` example) works as described because the VRF master device scopes the route lookup to a separate routing table.
