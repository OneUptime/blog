# Validation Summary: How to Configure VLAN Trunking on a Linux Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking (iproute2 / `ip` command)
- 802.1Q VLAN tagging
- `8021q` kernel module
- Netplan (systemd-networkd backend)
- Cisco IOS trunk port configuration (reference)
- tcpdump
- Linux IP forwarding via sysctl

## Sources Consulted
- iproute2 `ip-link(8)` man page — VLAN link type syntax (`ip link add link DEV name NAME type vlan id VID`)
- Linux kernel 8021q module documentation (`Documentation/networking/vlan.rst`)
- Netplan reference documentation — `vlans` schema (https://netplan.readthedocs.io/en/latest/netplan-yaml/)
- tcpdump pcap-filter(7) — `vlan` filter expression
- Cisco IOS command reference — `switchport mode trunk`, `switchport trunk allowed vlan`, `switchport trunk native vlan`
- Linux kernel networking sysctl documentation — `net.ipv4.ip_forward`

## Issues Found
No technical issues found.

All technical content was verified:
- `modprobe 8021q` correctly loads the VLAN kernel module.
- `ip link add link eth0 name eth0.10 type vlan id 10` is the correct iproute2 syntax for creating a VLAN subinterface.
- `ip addr add` and `ip link set ... up` usage is correct.
- Cisco IOS trunk configuration (`switchport mode trunk`, `switchport trunk allowed vlan`, `switchport trunk native vlan`) is syntactically correct.
- The explanation that the parent interface on Linux handles untagged (native VLAN) traffic is accurate — by default, frames arriving without a VLAN tag are delivered to the parent device.
- Netplan `vlans` schema with `id`, `link`, and `addresses` fields is correct.
- `tcpdump -i eth0 -e vlan -n -c 20` uses valid flags and a valid `vlan` pcap filter expression.
- `net.ipv4.ip_forward = 1` and `sysctl -p` usage for enabling inter-VLAN routing is correct.

## Review Notes
- The post does not cover QoS (802.1p priority) mapping via `egress-qos-map`/`ingress-qos-map` options of `ip link add ... type vlan`, which is fine given the scope.
- Modern kernels auto-load the `8021q` module when a VLAN interface is created; explicit `modprobe 8021q` is still a reasonable belt-and-braces step and is commonly recommended.
- The native VLAN section is correct but readers should be aware that if the switch is configured to tag the native VLAN (`vlan dot1q tag native` globally on Cisco), the Linux parent interface would not receive those frames untagged — the guide's default assumption (untagged native) matches the Cisco snippet shown.
- Netplan example uses `renderer: networkd`; the same VLAN schema works with the NetworkManager renderer as well.
- For production, consider MTU considerations on the parent interface (VLAN subinterfaces inherit MTU minus tag overhead handled by the driver), but this is out of scope for a trunking intro.
