# Validation Summary: How to Create a VLAN Interface with ip link add type vlan

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Linux iproute2 (`ip` command)
- 802.1Q VLAN tagging
- 802.1ad (QinQ / S-VLAN) double tagging
- Linux kernel `8021q` module

## Sources Consulted
- `ip-link(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip-link.8.html
- iproute2 source (`iplink_vlan.c`) for accepted keywords and protocol values
- IEEE 802.1Q standard (VLAN ID range, tagging semantics)
- IEEE 802.1ad standard (Provider Bridges / QinQ)
- Linux kernel documentation for the `8021q` module

## Issues Found
No technical issues found.

Verified items:
- `ip link add link <parent> name <name> type vlan id <vid>` is the correct iproute2 syntax.
- VLAN ID range 1-4094 is accurate (0 and 4095 are reserved by 802.1Q).
- `ip -d link show <iface>` correctly displays VLAN-specific details, and the sample output line `vlan protocol 802.1Q id 10 <REORDER_HDR>` matches real output (REORDER_HDR is on by default).
- `proto 802.1ad` is accepted: iproute2's `matches()` allows unique prefix matching of `protocol`, and `802.1Q`/`802.1ad` are the supported protocol values.
- The QinQ stacking example (outer S-VLAN with `proto 802.1ad`, inner C-VLAN with `proto 802.1Q` on the outer interface) is correct.
- Kernel module name `8021q` and the `modprobe`/`lsmod` workflow are correct.
- `ip link set <iface> down` followed by `ip link delete <iface>` is the correct teardown sequence.
- The custom-name example (`name mgmt`) correctly notes that the interface name is independent of `<parent>.<id>`.

## Review Notes
- The documented keyword in `ip-link(8)` is `protocol`; `proto` works as a shorthand because iproute2 accepts unique prefixes, but readers copying from official docs may see `protocol` instead. Both are valid.
- `<REORDER_HDR>` appears in `ip -d link show` output because `reorder_hdr` defaults to `on`; this is the expected default and worth noting only if a future revision wants to discuss the flag.
- The post correctly notes the configuration is non-persistent and points to Netplan / nmcli / systemd-networkd for persistence — a useful pointer.
- For the QinQ example, some switches and NICs require hardware support / offload tweaks (e.g., disabling `rx-vlan-filter` or `rx-vlan-stag-hw-parse` via `ethtool -K`) for double-tagged frames to traverse correctly. Out of scope for a basic introduction but a common gotcha worth mentioning in a future expansion.
