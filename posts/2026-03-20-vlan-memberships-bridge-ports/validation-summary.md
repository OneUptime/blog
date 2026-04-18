# Validation Summary: How to Add VLAN Memberships to Bridge Ports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux bridge (VLAN-aware / 802.1Q filtering)
- iproute2 (`ip link`, `bridge vlan`)
- 802.1Q VLAN tagging (trunk and access ports, PVID, egress untagged)
- Linux VLAN interfaces (8021q kernel module)
- systemd-networkd (`.netdev` / `.network` units; `[Bridge]`, `[BridgeVLAN]` sections)

## Sources Consulted
- `bridge(8)` man page — https://man7.org/linux/man-pages/man8/bridge.8.html
- `ip-link(8)` man page — https://man7.org/linux/man-pages/man8/ip-link.8.html
- iproute2 source (`bridge/vlan.c`) — https://github.com/iproute2/iproute2/blob/main/bridge/vlan.c
- systemd.network(5) — https://www.freedesktop.org/software/systemd/man/systemd.network.html
- systemd.netdev(5) — https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- IEEE 802.1Q (VLAN tagging semantics)

## Issues Found
1. **Invalid `tagged` keyword in `bridge vlan add`.** The original post used commands like `bridge vlan add dev eth0 vid 10 tagged`. Per the `bridge(8)` man page and the iproute2 source (`bridge/vlan.c`), the only valid flags for `bridge vlan add` are `pvid`, `untagged`, `self`, `master`, and `tunnel_info`. `tagged` is not a recognized keyword and would cause iproute2 to reject the command with an "unknown" error. Tagged is the default behavior when neither `pvid` nor `untagged` is specified. Fixed by removing `tagged` from the three trunk-port commands in the "Configuring VLAN Memberships" section and adding a brief comment explaining the default.
2. **Key Takeaways bullet repeated the same invalid syntax.** Updated the bullet to use `bridge vlan add dev <port> vid <id>` and note that VLANs are tagged by default when neither `pvid` nor `untagged` is specified.

## Review Notes
- The `ip link add link br0 name br0.10 type vlan id 10` approach for IP assignment is valid, but on a VLAN-aware bridge (`vlan_filtering=1`) the bridge device itself must be a member of the relevant VLAN for traffic to reach the CPU. Depending on kernel version and setup, users may additionally need `bridge vlan add dev br0 vid 10 self` (and likewise for VID 20) for routing through `br0.10` / `br0.20` to work reliably. The post does not mention this; it is not strictly incorrect but is a known gotcha worth adding in a future revision.
- The example output of `bridge vlan show` is an abbreviated representation. Real output typically shows `PVID Egress Untagged` on each bridge port's default VLAN line (including `br0` itself, which by default is a member of VLAN 1 as PVID untagged). This is cosmetic, not technically wrong.
- systemd-networkd `[BridgeVLAN]` fields (`VLAN=`, `PVID=`, `EgressUntagged=`) and `[Bridge] VLANFiltering=yes` are correct per `systemd.network(5)`.
- `ip link set br0 type bridge vlan_filtering 1` is the correct syntax for toggling VLAN filtering on an existing bridge; also verified.
