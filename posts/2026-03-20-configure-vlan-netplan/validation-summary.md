# Validation Summary: How to Configure a VLAN with Netplan

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Netplan (YAML-based network configuration tool for Ubuntu/Debian)
- 802.1Q VLAN tagging
- Linux `ip` command (iproute2)
- `modprobe` and `/etc/modules` for kernel module loading
- DHCP and static IP configuration
- Linux kernel `8021q` module

## Sources Consulted
- Netplan official YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan VLAN configuration documentation
- iproute2 `ip` command reference (`ip link`, `ip addr`, `-d` detail flag)
- Linux kernel `8021q` module documentation

## Issues Found
No technical issues found.

All Netplan YAML keys (`vlans`, `id`, `link`, `dhcp4`, `addresses`, `routes`, `nameservers` with `addresses`/`search`) are valid and current.
The `routes` syntax using `to: default` and `via:` is the modern Netplan syntax (replacing the deprecated `gateway4` field).
The `ip` commands (`ip link show`, `ip -d link show`, `ip addr show`) are correct.
The `modprobe 8021q` and `echo "8021q" >> /etc/modules` commands for persistent module loading are accurate.
Interface naming convention (`eth0.10` for VLAN 10 on `eth0`) follows the standard convention.

## Review Notes
- The post is concise and accurate. The examples follow Netplan's recommended patterns.
- On modern Ubuntu (22.04+), the `8021q` kernel module is typically auto-loaded when a VLAN interface is configured, so the "Load 8021q Module" section is largely a fallback for older or minimal systems — the post correctly notes this with "if needed".
- The post does not mention which Netplan renderer is in use (`networkd` vs `NetworkManager`); the YAML shown works with both, so this is fine.
- Permissions: `netplan apply`, `modprobe`, and writes to `/etc/modules` require root/sudo. The post does not call this out explicitly, but it's standard for system network configuration tutorials.
