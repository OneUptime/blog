# Validation Summary: How to Configure VLANs with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Netplan
- systemd-networkd
- Linux VLAN interfaces / 802.1Q
- Linux bonding / LACP
- iproute2
- tcpdump

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan CLI reference: https://netplan.readthedocs.io/en/0.106/cli/
- Netplan bonded interfaces with VLANs guide: https://netplan.readthedocs.io/en/stable/multi-nic-vm-host-with-bonds-and-vlans/
- Linux ip-link manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- tcpdump manual: https://www.tcpdump.org/manpages/tcpdump.1.html

## Issues Found
- In the "Multiple VLANs with DHCP" example, VLAN 20 used `dhcp4-overrides.use-routes: false` while also setting `route-metric: 200` and describing it as a secondary default route. Netplan's `use-routes: false` ignores DHCP-provided routes, so no secondary DHCP default route would be installed and the metric would not serve that purpose. Removed the misleading `route-metric` line and changed the comment to say DHCP routes from VLAN 20 are ignored.

## Review Notes
- The Netplan VLAN examples use documented `vlans` fields (`id`, `link`, `dhcp4`, `addresses`, `routes`, `nameservers`) and current route syntax.
- The bond example uses documented Netplan bonding parameters for 802.3ad/LACP.
- The troubleshooting commands are valid Linux networking commands. On some NICs, VLAN offload can affect whether tags are visible in packet captures on the host, but the tcpdump commands themselves are correct.
