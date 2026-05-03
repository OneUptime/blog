# Validation Summary: How to Create a VLAN Interface with ip link type vlan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking (iproute2 / `ip link`)
- 802.1Q VLAN tagging
- systemd-networkd (`.netdev` and `.network` files)

## Sources Consulted
- iproute2 `ip-link(8)` man page — https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-address(8)` man page — https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` man page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- systemd.netdev(5) — https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- systemd.network(5) — https://www.freedesktop.org/software/systemd/man/systemd.network.html
- IEEE 802.1Q standard (VLAN tagging concepts)

## Issues Found
No technical issues found.

The `ip link add link <parent> name <name> type vlan id <vid>` syntax is correct, as are the supporting `ip link set up`, `ip addr add`, and `ip route add` commands. The verification commands (`ip link show type vlan`, `ip -d link show`) and example output (including the `eth0.10@eth0` notation and `vlan id 10 <REORDER_HDR>` line) match real iproute2 output. The systemd-networkd configuration correctly uses `Kind=vlan` with the `[VLAN]` `Id=` field in the `.netdev` file, and the two-`.network`-file pattern (one matching the parent with `VLAN=`, one matching the VLAN device with `Address=`/`Gateway=`) is the documented approach.

## Review Notes
- Valid 802.1Q VLAN IDs are 1–4094 (0 and 4095 are reserved). The post does not make incorrect claims about this range, but readers attempting IDs outside it will see errors.
- The parent interface must support VLAN tagging and the upstream switch port must be configured as a trunk (or tagged member) for the VLAN ID; this is implicit in the post.
- For optional VLAN protocol selection (e.g., 802.1ad QinQ via `protocol 802.1ad`) and ingress/egress QoS mapping, see `ip-link(8)`. The post correctly sticks to the common 802.1Q case.
- MTU considerations (parent MTU should accommodate the 4-byte VLAN tag) are not mentioned but are not strictly required for the basic flow shown.
