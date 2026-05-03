# Validation Summary: How to Create a VLAN Interface with an IPv4 Address on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel 802.1Q VLAN support (`8021q` module)
- iproute2 (`ip link`, `ip addr`)
- Netplan (YAML network configuration)
- ifupdown (`/etc/network/interfaces`, `vlan-raw-device`)
- Cisco IOS trunk port configuration (dot1q)

## Sources Consulted
- iproute2 `ip-link(8)` man page — VLAN link type syntax (https://man7.org/linux/man-pages/man8/ip-link.8.html)
- Linux kernel networking documentation on 802.1Q VLAN support / `net/8021q` module
- Netplan reference documentation — `vlans` section (https://netplan.readthedocs.io/en/stable/netplan-yaml/)
- Debian/Ubuntu `vlan` package and `interfaces(5)` man page — `vlan-raw-device` stanza
- Cisco IOS configuration guide — `switchport mode trunk`, `switchport trunk encapsulation dot1q`, `switchport trunk allowed vlan`
- `/proc/net/vlan/` interface in the Linux kernel

## Issues Found
- The post originally referred to "the kernel's `vlan` module" in the introduction and conclusion. The actual Linux kernel module name is `8021q` (loaded with `modprobe 8021q`). The userspace `vlan` package contains the older `vconfig` tool, which is a separate component. I updated both occurrences to `8021q` and clarified in the conclusion that the module is auto-loaded when invoking `ip link add ... type vlan`.

## Review Notes
- All `ip` commands (`ip link add link <parent> name <name> type vlan id <vid>`, `ip link set ... up`, `ip addr add ...`, `ip -d link show ...`, `ip link del`) are syntactically correct per current iproute2.
- The Netplan YAML correctly places `vlans:` as a sibling of `ethernets:` under `network:`, which matches the official schema.
- The `/etc/network/interfaces` snippet uses `vlan-raw-device`, which is the correct stanza provided by the Debian `vlan` package's ifupdown hooks. The dotted naming (`eth0.10`) also implicitly conveys the parent and VID, but `vlan-raw-device` makes it explicit.
- The Cisco trunk configuration is correct; on switches that only support dot1q, the `switchport trunk encapsulation dot1q` line is unnecessary but harmless.
- `/proc/net/vlan/<iface>` is the legacy interface; it remains supported, but `ip -d link show` is the more modern way to inspect VLAN metadata.
