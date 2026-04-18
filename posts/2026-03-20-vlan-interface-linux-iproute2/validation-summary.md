# Validation Summary: How to Create a VLAN Interface on Linux Using iproute2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking
- iproute2 (`ip` command)
- 802.1Q VLAN tagging
- `8021q` kernel module
- systemd `modules-load.d`
- `/etc/rc.local`

## Sources Consulted
- iproute2 `ip-link(8)` man page (https://man7.org/linux/man-pages/man8/ip-link.8.html)
- iproute2 `ip-address(8)` man page (https://man7.org/linux/man-pages/man8/ip-address.8.html)
- Linux kernel documentation on 802.1Q VLAN (https://www.kernel.org/doc/Documentation/networking/vlan.txt)
- `modules-load.d(5)` man page (https://man7.org/linux/man-pages/man5/modules-load.d.5.html)
- IEEE 802.1Q standard

## Issues Found
No technical issues found.

All iproute2 commands are syntactically correct and current:
- `ip link add link <parent> name <name> type vlan id <vid>` is the correct syntax for creating an 802.1Q VLAN subinterface.
- `ip -d link show` correctly displays VLAN protocol details (vlan_id, vlan_protocol, parent).
- `ip link delete <name>` correctly removes the VLAN subinterface.
- `modprobe 8021q` and `/etc/modules-load.d/*.conf` are the correct mechanisms to load the kernel module and persist it on systemd-based distros.
- IP address assignment, link bring-up, and verification commands are all correct.
- The note about `ip link` configuration not being persistent across reboots is accurate.

## Review Notes
- `/etc/rc.local` is deprecated on many modern distributions (e.g., recent Debian/Ubuntu/RHEL); the post acknowledges this is a "quick" approach and recommends Netplan, nmcli, or systemd-networkd for production. This is reasonable framing.
- The post correctly notes that custom names (e.g., `mgmt`) are supported instead of the `parent.vlan` convention. This relies on the default VLAN naming type; for stricter naming control, users could pass `ingress-qos-map`/`egress-qos-map` or `protocol 802.1ad` options to `type vlan`, but those are out of scope for an introductory tutorial.
- The MTU consideration (parent MTU must accommodate the VLAN tag, typically fine at default 1500 since the tag is added without raising the payload limit on most modern NICs) is not discussed, but this is a minor omission and not incorrect.
