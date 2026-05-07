# Validation Summary: How to Add Physical Interfaces to a Linux Bridge

## Status
validated

## Post Type
Tutorial / how-to guide

## Technologies Covered
- Linux bridge
- iproute2 (`ip`, `bridge`)
- Spanning Tree Protocol (STP)
- VLAN-aware bridging
- Ethernet forwarding database (FDB)

## Sources Consulted
- Linux kernel bridge documentation: https://docs.kernel.org/6.15/networking/bridge.html
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- `bridge(8)` manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Local iproute2 help/man output from iproute2 6.1.0: `bridge link help`, `bridge fdb help`, `bridge vlan help`, `ip -h link help`, `man 8 bridge`, `man 8 ip-link`

## Issues Found
- The introduction said bridge usage includes "aggregating interfaces." I changed this to attaching multiple interfaces to the same Layer 2 domain, because link aggregation in Linux is provided by bonding/team rather than by a bridge.
- The post used `bridge link show br br0` to verify bridge membership. I replaced it with `ip link show master br0`, because current documented `bridge link` syntax does not take that `br` filter, while `ip link show master DEV` is the documented way to list interfaces enslaved to a bridge.
- The STP explanation implied all STP-enabled ports pass through listening, learning, and forwarding. I clarified that forwarding ports follow that progression, while non-forwarding ports may remain blocking.
- The port-priority example said the valid range is `0-63` with default `32`. I corrected the valid range to `0-255` and clarified that the setting affects both root-port and designated-port selection.
- The FDB verification example used `grep "master br0"` to find learned entries. I replaced it with `bridge fdb show br br0 dynamic`, which is the documented filter for dynamic entries.
- The conclusion said an IP address "moves" to the bridge automatically. I corrected this to explain that Layer 3 configuration must be removed from the bridge port and assigned to the bridge interface explicitly when needed.

## Review Notes
- The post assumes `br0` already exists, which is acceptable for its scope.
- If the host itself needs Layer 3 connectivity on a VLAN-aware bridge, a future expansion could mention configuring the bridge device for that VLAN as well; the current post only covers making the physical interface a bridge port.
