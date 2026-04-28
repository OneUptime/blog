# Validation Summary: How to Configure Multiple VLANs on a Single Physical Interface

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Linux networking (iproute2)
- 802.1Q VLAN tagging
- `8021q` Linux kernel module
- systemd `modules-load.d`
- Netplan (renderer: networkd)
- `sysctl` (`net.ipv4.ip_forward`)
- iptables (FORWARD chain, state match)

## Sources Consulted
- iproute2 `ip-link(8)` man page (VLAN type options)
- Linux kernel documentation for the 8021q module
- IEEE 802.1Q specification (VLAN ID range 1-4094)
- systemd `modules-load.d(5)` man page
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/ (vlans section)
- iptables(8) man page (state/conntrack matches, FORWARD chain semantics)
- Linux kernel networking documentation on `net.ipv4.ip_forward`

## Issues Found
No technical issues found.

## Review Notes
- The `iptables -m state` match is older syntax; the modern equivalent is `-m conntrack --ctstate ESTABLISHED,RELATED`. Both work on current kernels, so this is not an error.
- The two iptables rules in the firewall section are syntactically correct but illustrative rather than a complete policy: the `DROP` rule from `eth0.40` to `eth0.20` will also block return traffic for connections initiated from `eth0.20`, so a real production policy would typically pair it with an `ESTABLISHED,RELATED` ACCEPT on the `eth0.40 -> eth0.20` direction. Left as written since the commands themselves are correct and the scope of the post is showing how to apply per-VLAN rules, not designing a full ruleset.
- The `grep -A 3 eth0\.` command works as intended in practice: bash strips the backslash so grep sees `eth0.` (where `.` is the regex any-character metacharacter), which still matches `eth0.10`, `eth0.20`, etc.
- The Netplan example shows `eth0.40` using `dhcp4: true` without an explicit address, which is valid (DHCP-assigned address on that VLAN).
- Switch-side trunk configuration is correctly mentioned as a prerequisite/conclusion item but not detailed (out of scope for a Linux-side guide).
