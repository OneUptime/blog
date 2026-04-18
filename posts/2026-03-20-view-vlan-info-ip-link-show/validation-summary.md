# Validation Summary: How to View VLAN Information with ip -d link show

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux `iproute2` (`ip` command)
- VLAN (IEEE 802.1Q)
- Linux 8021q kernel module and `/proc/net/vlan/`
- Linux bridge utility (`bridge vlan show`)
- JSON output from `ip -j`

## Sources Consulted
- iproute2 `ip-link(8)` man page (https://man7.org/linux/man-pages/man8/ip-link.8.html)
- Linux kernel source `include/uapi/linux/if_vlan.h` (VLAN name-type enums)
- Linux kernel `net/8021q/vlanproc.c` (output format of `/proc/net/vlan/config`)
- iproute2 `bridge(8)` man page (https://man7.org/linux/man-pages/man8/bridge.8.html)
- IEEE 802.1Q VLAN standard

## Issues Found
- The `Name-Type:` line in the `/proc/net/vlan/config` example output was listed as `VLAN_NAME_TYPE_PLUS_VID_NO_PAD`. That name type produces VLAN device names of the form `vlanN` (e.g., `vlan10`, `vlan100`), but the example entries shown are `eth0.10`, `eth0.20`, `eth0.100`, which correspond to the `VLAN_NAME_TYPE_RAW_PLUS_VID_NO_PAD` type per `include/uapi/linux/if_vlan.h`. Corrected the name type to `VLAN_NAME_TYPE_RAW_PLUS_VID_NO_PAD` so it matches the interface names shown.

## Review Notes
- The `ip -d link show` example output is a simplified representation. Modern iproute2 typically prints additional fields (e.g., `minmtu`, `maxmtu`, `numtxqueues`, `gso_max_size`, `parentbus`), but the abbreviated example is acceptable for illustrating the VLAN-specific lines.
- `/proc/net/vlan/` is only populated when the `8021q` kernel module is loaded; on kernels where VLANs are created exclusively via the rtnetlink interface (the `ip link add ... type vlan` path) the module is autoloaded when the first VLAN is created.
- The `bridge vlan show` sample output is a condensed illustration; real output often includes flags like `PVID Egress Untagged` on additional VIDs. This is fine for the purpose of the post.
- No deprecated commands are recommended. `vconfig` (deprecated) is correctly avoided.
