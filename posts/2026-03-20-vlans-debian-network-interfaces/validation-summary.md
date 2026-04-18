# Validation Summary: How to Configure VLANs on Debian Using /etc/network/interfaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Debian Linux networking
- 802.1Q VLAN tagging
- `vlan` package / `8021q` kernel module
- `/etc/network/interfaces` (ifupdown)
- `ip`/`iproute2` commands
- `systemctl` / `ifup`

## Sources Consulted
- Debian VLAN wiki: https://wiki.debian.org/VLAN
- Debian NetworkConfiguration wiki: https://wiki.debian.org/NetworkConfiguration
- `vlan-interfaces(5)` man page: https://manpages.debian.org/bookworm/vlan/vlan-interfaces.5.en.html
- `interfaces(5)` man page (ifupdown)
- `/etc/network/if-pre-up.d/vlan` hook behavior (from `vlan` package)

## Issues Found
- **Removed invalid `vlan_id 10` directive** in the "Alternative Naming" section. Stock Debian ifupdown (with the `vlan` package) does not recognize a `vlan_id` (or `vlan-id`) directive — the `vlan-interfaces(5)` man page only documents `vlan-raw-device`, `ip-proxy-arp`, `ip-rp-filter`, and `hw-mac-address`. The VLAN ID is auto-derived from the numeric suffix of the interface name (`vlan10` → VLAN 10) by the `/etc/network/if-pre-up.d/vlan` hook, making any such directive redundant. Replaced with a clarifying comment that the ID is derived from the name.

## Review Notes
- The `mtu 9000` example on `eth0.30` assumes the parent `eth0` already has an MTU ≥ 9000. The post's Key Takeaways correctly note that a VLAN interface's MTU cannot exceed its parent's, so this caveat is covered.
- For truly arbitrary VLAN interface names (not matching `ethX.N` or `vlanN` patterns), stock ifupdown cannot specify a VLAN ID via a directive; an iproute2 `pre-up ip link add ... type vlan id N` approach or `ifupdown2`/`systemd-networkd`/Netplan would be needed. This is outside the scope of the post.
- All other commands and directives (`vlan-raw-device`, `modprobe 8021q`, `/etc/modules`, `ip -d link show`, `/proc/net/vlan/config`, `systemctl restart networking`, `ifup`, etc.) are correct for Debian (current through Bookworm/Trixie).
