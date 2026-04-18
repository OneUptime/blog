# Validation Summary: How to Configure VXLAN on Red Hat Enterprise Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN)
- Red Hat Enterprise Linux (RHEL)
- NetworkManager
- nmcli
- iproute2 (`ip` command)
- firewalld (`firewall-cmd`)
- Linux bridges

## Sources Consulted
- NetworkManager VXLAN settings reference: https://networkmanager.dev/docs/api/latest/settings-vxlan.html
- NetworkManager source `nm-setting-vxlan.c` (libnm-core) for property names and ranges
- `nmcli` man page and `nm-settings-nmcli` reference
- RFC 7348 (VXLAN): IANA-assigned UDP port 4789
- Red Hat documentation on configuring VXLAN using nmcli
- `ip-link(8)` man page for VXLAN type parameters
- `firewall-cmd(1)` documentation

## Issues Found
1. **Incorrect nmcli property name `vxlan.mac-learning`.** NetworkManager's VXLAN setting exposes the MAC-learning toggle as `vxlan.learning` (see `NM_SETTING_VXLAN_LEARNING` in `nm-setting-vxlan.c`); there is no `vxlan.mac-learning` property and the shown command would fail. Replaced both occurrences (the create command and the properties reference list) with `vxlan.learning`.
2. **Incorrect VNI range `1-16777215`.** NetworkManager accepts the full 24-bit range `0-16777215` for `vxlan.id` (default 0). Updated the reference comment to `0-16777215`.

## Review Notes
- UDP port 4789 is correct per RFC 7348 / IANA. Note that NetworkManager's internal default for `vxlan.destination-port` is 8472 (Linux kernel legacy); the post explicitly sets 4789, which is the right choice for interoperability.
- The bridge example omits an IP on the VXLAN slave (correct — the bridge holds the L3 address) and uses `bridge.stp no`, which is a reasonable choice for a small VXLAN fabric but worth reconsidering if multiple bridges are interconnected.
- `vxlan.learning yes` is the default on new VXLAN connections, so specifying it explicitly is harmless but redundant.
- The `ip link add ... type vxlan` example is non-persistent (will not survive reboot), which the post correctly notes.
- `firewall-cmd --permanent` commands require `--reload` to take effect, which the post includes.
