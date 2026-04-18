# Validation Summary: How to Troubleshoot IPv6 in Virtual Machine Environments

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 (SLAAC, DHCPv6, NDP)
- Linux networking (iproute2, sysctl)
- KVM / libvirt / virsh
- Proxmox
- Linux bridge (bridge-utils, netfilter)
- tcpdump
- NetworkManager / systemd-networkd
- ndisc6 package (rdisc6, ndisc6)
- VXLAN / Geneve overlays (MTU considerations)

## Sources Consulted
- RFC 4861 (Neighbor Discovery for IPv6) — https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4443 (ICMPv6) — ICMPv6 type 2 (Packet Too Big), type 134 (Router Advertisement)
- RFC 4291 (IPv6 Addressing Architecture) — multicast scopes ff02::1, ff02::2
- RFC 8415 (DHCPv6) — UDP ports 546 (client) and 547 (server)
- Linux kernel documentation: Documentation/networking/ip-sysctl.txt (accept_ra values 0/1/2, forwarding, bridge-nf-call-ip6tables)
- iproute2 man pages (ip-address, ip-route, ip-neigh, ip-link)
- libvirt documentation (virsh net-destroy / net-start)
- NetworkManager nm-settings documentation (ipv6.method values)
- iputils ping/ping6 man page (-M do, -s options)
- Linux bridge sysfs documentation (/sys/.../multicast_snooping)

## Issues Found
No technical issues found.

Verified specifics:
- ICMPv6 type 134 = Router Advertisement (correct per RFC 4861)
- ICMPv6 type 2 = Packet Too Big (correct per RFC 4443)
- DHCPv6 UDP ports 546/547 (correct per RFC 8415)
- ff02::1 (all-nodes) and ff02::2 (all-routers) link-local multicast (correct per RFC 4291)
- accept_ra values: 0 = disabled, 1 = accept (but not when forwarding), 2 = accept always (correct per Linux kernel ip-sysctl documentation)
- MTU calculation: 1500 − 40 (IPv6 header) − 8 (ICMPv6 Echo header) = 1452 bytes max payload (correct)
- VXLAN overhead (~50 bytes) and Geneve (~50-74 bytes) fall within the "50-100 bytes" range stated (correct)
- `sysctl net.bridge.bridge-nf-call-ip6tables` path is correct for Linux bridge netfilter
- `/sys/devices/virtual/net/br0/bridge/multicast_snooping` path is correct
- `virsh net-destroy` / `virsh net-start` correctly toggles libvirt's default network (which includes radvd and dnsmasq for DHCPv6)
- `nmcli connection show <conn>` output format and `ipv6.method` values (auto, dhcp, manual, etc.) are correct

## Review Notes
- `ping6` is a legacy wrapper; modern iputils provides unified `ping` that accepts IPv6 addresses. Both still work on most distros, but on very new systems users may need to use `ping` directly.
- `arping6` is not part of the standard iputils `arping` (which is IPv4-only). It may come from `ndisc6` or distro-specific packages. The post appropriately qualifies this with "If arping6 is available".
- The "DF-bit set" comment for `ping6 -M do -s 1452` uses IPv4 terminology — IPv6 has no DF flag; intermediate routers never fragment. However, `-M do` correctly enables PMTU discovery behavior, so the practical effect described is accurate.
- `dhclient -6` behavior (SOLICIT/ADVERTISE/REQUEST/REPLY exchange) is correct for DHCPv6-stateful mode.
- The advice to disable `bridge-nf-call-ip6tables` (setting to 0) is a common and correct workaround when iptables rules unexpectedly drop bridged IPv6 traffic.
