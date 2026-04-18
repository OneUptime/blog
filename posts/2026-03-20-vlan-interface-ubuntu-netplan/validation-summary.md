# Validation Summary: How to Create a VLAN Interface on Ubuntu Using Netplan

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (18.04+)
- Netplan (YAML network configuration)
- systemd-networkd / NetworkManager (Netplan renderers)
- 802.1Q VLAN tagging
- Linux `8021q` kernel module
- `iproute2` utilities (`ip`, `networkctl`)

## Sources Consulted
- Netplan official documentation and YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan VLAN examples: https://netplan.readthedocs.io/en/stable/examples/
- Ubuntu Server networking docs: https://ubuntu.com/server/docs/network-configuration
- `systemd-networkd` / `networkctl` man pages
- `ip-link(8)`, `ip-address(8)`, `ip-route(8)` man pages
- IEEE 802.1Q standard (VLAN ID range 0–4094)

## Issues Found
No technical issues found.

The post accurately describes:
- Netplan's `vlans:` top-level key with `id:` and `link:` fields.
- Correct renderer values (`networkd`, `NetworkManager`).
- Correct YAML structure (`network.version: 2`, `ethernets:`, `vlans:`).
- Valid use of `addresses:`, `nameservers:`, `routes:` (with `to:`/`via:`), and `dhcp4:`.
- Proper apply workflow: `netplan generate` for validation, `netplan apply` to activate.
- Accurate verification commands (`ip addr show`, `ip -d link show`, `ip route show dev`, `networkctl status`, `lsmod | grep 8021q`).
- Support for custom VLAN interface names (not tied to `parent.id` form).
- All VLAN IDs in examples (10, 20, 30, 100) are within the valid 1–4094 range.

## Review Notes
- Ubuntu 18.04 is cited as the minimum; this is accurate as the first LTS release shipping Netplan as the default (Netplan landed in 17.10).
- `netplan try` could be mentioned as a safer alternative to `netplan apply` for remote sessions (it rolls back on no confirmation), but omitting it is not an error.
- The `8021q` module is auto-loaded by Netplan when a VLAN is declared; the prerequisite note about this is correct.
- `renderer: NetworkManager` capitalization matches Netplan's accepted values.
