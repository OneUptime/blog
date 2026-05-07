# Validation Summary: How to Configure ARP Proxy for Subnets Without Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel IPv4 networking sysctls
- ARP
- Proxy ARP
- Linux IP forwarding
- `iproute2`
- `tcpdump`

## Sources Consulted
- Linux Kernel documentation: IP sysctls, including `proxy_arp`, `proxy_arp_pvlan`, and `proxy_delay` - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `arp(7)` man page - https://man7.org/linux/man-pages/man7/arp.7.html
- Linux `ip-neighbour(8)` man page - https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- RFC 1027, "Using ARP to Implement Transparent Subnet Gateways" - https://www.rfc-editor.org/rfc/rfc1027.html
- Cisco IOS XE ARP documentation for default-gateway vs remote-network ARP behavior - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_arp-config-arp-0.html

## Issues Found
- The original example topology was conceptually incorrect. It said both LANs used the router as the default gateway, but then showed Host A ARPing for a host in `192.168.2.0/24`. With correct `/24` masks and a default gateway, the host would ARP for the gateway, not the remote host. I corrected the example to a transparent-subnetting case consistent with Proxy ARP: Host A and Host B use `/16` masks across separate `/24` physical segments.
- The `arp_proxy_delay` section used the wrong kernel setting and the wrong `/proc` path. Linux uses `proxy_delay` under `net.ipv4.neigh.<iface>.proxy_delay`; `proxy_arp_pvlan` is a separate Private VLAN feature. I corrected the section heading, description, and command.
- Several commands that modify kernel settings omitted `sudo`, and the persistent configuration example used shell redirection that would fail for a non-root shell. I updated the commands to use `sudo` consistently and changed the persistent example to `sudo tee -a /etc/sysctl.conf`.
- The verification example used `arp -n` and showed an output shape that did not match the command shown. I replaced it with `ip neigh show`, which is the current iproute2 tool for the neighbor/ARP table, and updated the expectation text.
- The caveat claiming proxy ARP increases the Layer 2 broadcast domain size was inaccurate. Proxy ARP can make separate segments appear like one logical IP network to hosts, but it does not merge the physical broadcast domains. I corrected that wording.
- The description and overview were tightened so they describe the real use case: end hosts that cannot be updated with proper subnet masks or routing information, rather than implying Proxy ARP replaces normal routing.

## Review Notes
- The post now matches the classic transparent subnet gateway behavior described in RFC 1027.
- `proxy_arp_pvlan` is a valid Linux setting, but it is for same-interface Private VLAN style proxying and should not be confused with `proxy_delay`.
- Proxy ARP remains a niche compatibility mechanism. In normal environments with correct subnet masks and default gateways, plain routing is preferred.
