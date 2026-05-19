# Validation Summary: How to Configure IPVLAN Interfaces on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking
- Linux IPVLAN and MACVLAN
- iproute2 `ip link`, `ip addr`, `ip route`, and `ip netns`
- Linux network namespaces
- systemd-networkd `.netdev` and `.network` files
- Netplan
- iptables / nftables netfilter behavior

## Sources Consulted
- Linux kernel IPVLAN Driver HOWTO: https://www.kernel.org/doc/html/v5.12/networking/ipvlan.html
- iproute2 `ip-link(8)` local man page
- systemd.netdev official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd.network official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Docker IPvlan network driver documentation: https://docs.docker.com/engine/network/drivers/ipvlan/
- Red Hat IPVLAN documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/system_design_guide/getting-started-with-ipvlan_system-design-guide

## Issues Found
- The post said IPVLAN has two primary modes while also documenting L3S. Updated the wording to describe L2 and L3 as primary modes with L3S as an L3 variant, matching Linux kernel and systemd documentation.
- The L2 description said IPVLAN works like a MAC-level bridge. Adjusted this because IPVLAN uses IP address filtering and shares the parent MAC; L2 mode is bridge-like for endpoint connectivity but is not MAC-based multiplexing.
- The L3 description overstated direct host-to-container communication and implied each IPVLAN interface has its own routing domain. Revised it to describe routing through the parent namespace, non-overlapping subnets, and the lack of broadcast/multicast in L3/L3S.
- The MacVLAN comparison table said promiscuous mode is never required. Changed it to note that MacVLAN usually does not require promiscuous mode except passthru mode, which iproute2 documents as enabling promiscuous mode by default.
- The L3 namespace example added the return route after the ping command. Moved that route before the ping so the example has a valid return path when tested.
- The Netplan section implied that arbitrary systemd-networkd files coexist cleanly with netplan. Clarified that Netplan has no IPVLAN YAML device type and that the parent `.network` file must actually be the one networkd applies for `IPVLAN=` to take effect.
- The L3S firewall example used interface-specific iptables rules that could be misleading for routed IPVLAN traffic. Generalized the example to match source and destination addresses and told readers to match the real routed interface directions for their policy.

## Review Notes
The command syntax for `ip link add ... type ipvlan mode l2/l3/l3s`, namespace creation, address assignment, and systemd-networkd `Kind=ipvlan`, `[IPVLAN] Mode=L2`, and parent `IPVLAN=` attachment were validated against current documentation and local man pages. The examples still use placeholder interface names and RFC1918 addresses, so readers must adapt `eth0`, gateways, routes, and firewall interface matches to their host.
