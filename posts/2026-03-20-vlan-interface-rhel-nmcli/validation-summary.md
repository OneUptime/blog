# Validation Summary: How to Create a VLAN Interface on RHEL Using nmcli

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL 7/8/9), CentOS, Fedora
- NetworkManager
- `nmcli` command-line tool
- IEEE 802.1Q VLAN tagging
- iproute2 (`ip` command)

## Sources Consulted
- `nmcli(1)` man page (upstream NetworkManager documentation)
- `nm-settings(5)` man page — property/alias definitions for `vlan.parent`/`dev`, `vlan.id`/`id`, `ipv4.method`, `ipv4.dns`, `connection.autoconnect`
- `nm-settings-nmcli(5)` man page
- `ip(8)` and `ip-link(8)` man pages (iproute2)
- Red Hat documentation for "Configuring and managing networking" on RHEL 8/9

## Issues Found
No technical issues found. All commands, parameters, and explanations were verified against official NetworkManager and iproute2 documentation:

- `nmcli connection add type vlan` syntax is correct.
- `dev` is a valid documented alias for `vlan.parent`.
- `id` is a valid documented alias for `vlan.id`.
- `ipv4.method auto` correctly enables DHCP.
- `ipv4.method manual` with `ipv4.addresses` is correct.
- `ipv4.dns` accepts both space- and comma-separated lists.
- `ifname` correctly forces a kernel interface name independent of `con-name`.
- `nmcli connection add` saves profiles by default (no separate save step), and `connection.autoconnect` defaults to TRUE — matching the post's claims about persistence and reboot behavior.
- `ip -d link show <iface>` is the correct command for detailed VLAN link info.

## Review Notes
- The post mentions RHEL 7. RHEL 7 reached end of Maintenance Support 2 on 2024-06-30 (only ELS thereafter). The nmcli VLAN syntax shown still works on RHEL 7, so this is not a technical error, but readers on unsupported releases should be aware.
- Minor (non-error) improvement opportunity: in the static-IP examples, also setting `ipv4.gateway` at creation time is the more typical pattern; this is shown later in the "Add DNS and Gateway" section so it is fine.
- Optional improvement: the first creation example could include `ifname eth0.100` to make the kernel interface name deterministic; without it, NetworkManager derives a name from parent + id (which yields `eth0.100` in this case anyway, so the example works as-is).
