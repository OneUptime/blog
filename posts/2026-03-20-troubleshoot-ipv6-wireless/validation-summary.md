# Validation Summary: How to Troubleshoot IPv6 on Wireless Networks

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 (SLAAC, DHCPv6, NDP, ICMPv6, Router Advertisements/Solicitations)
- Linux networking (`ip`, `sysctl`, `tcpdump`, `ip6tables`, `ebtables`)
- ndisc6 package tools (`rdisc6`, `ndisc6`, `tracepath6`)
- radvd (Router Advertisement Daemon)
- ISC DHCP server (DHCPv6)
- macOS (`networksetup`, `ifconfig`)
- Windows (`netsh`)
- Android (`adb`)
- Linux bridge multicast snooping
- NetworkManager

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (NS/NA, RS/RA semantics)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (SLAAC)
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6, ports 546/547)
- RFC 4291 — IP Version 6 Addressing Architecture (multicast scope, ff02::1 all-nodes)
- ndisc6 package documentation (https://www.remlab.net/ndisc6/) — confirms `rdisc6` is the Router Solicitation tool, `ndisc6` is the Neighbor Solicitation tool
- Linux kernel `Documentation/networking/ip-sysctl.txt` (accept_ra, disable_ipv6, use_tempaddr semantics)
- iproute2 man pages (`ip-address(8)`, `ip-route(8)`, `ip-neighbour(8)`)
- tcpdump filter expression syntax (`pcap-filter(7)`) — `ip6[40]==134` correctly indexes ICMPv6 type after the 40-byte IPv6 header
- radvd man page (`radvdump(8)`)
- ISC DHCP documentation (Debian/Ubuntu `isc-dhcp-server6.service`)

## Issues Found

1. **Incorrect tool for Router Solicitation** (Steps 2 and 5):
   The post used `ndisc6 -1 wlan0` to send a Router Solicitation. `ndisc6` actually sends Neighbor Solicitations and requires a target IPv6 address. The correct tool from the ndisc6 package for sending an RS is `rdisc6`. Replaced both occurrences with `sudo rdisc6 -1 wlan0` and added a clarifying comment about the package source.

2. **Incorrect macOS `ifconfig` filter** (Step 1):
   The post suggested `ifconfig en0 | grep "inet6.*global"` for macOS. macOS `ifconfig` output does NOT include the keyword "global" on IPv6 lines — that's Linux `ip` command terminology. The grep would have returned nothing on macOS. Replaced with `ifconfig en0 inet6 | grep -v fe80`, which correctly filters out link-local addresses to expose global ones.

## Review Notes

- `ping6` is technically deprecated in modern iputils in favor of `ping -6` / unified `ping`, but `ping6` remains available as a compatibility shim on most distributions, so the examples will still work.
- `ip -6 route show dev wlan0 | grep "^default"` works on most kernels but a more idiomatic alternative is `ip -6 route show default dev wlan0`.
- `accept_ra=2` requires `forwarding=1` in order to actually accept RAs while forwarding — the post mentions this implicitly but a future revision could be more explicit.
- DHCPv6 service unit names vary across distros. `isc-dhcp-server6.service` is correct on Debian/Ubuntu; on RHEL/CentOS the unit is typically `dhcpd6.service`. The current note is accurate for the Debian-family example shown.
- The `ebtables -L | grep icmpv6` command works only if ebtables rules explicitly mention `icmpv6` as a protocol match — many bridges drop multicast via other mechanisms (e.g., AP isolation, ProxyARP/ND, multicast-to-unicast conversion). This is an aside, not an inaccuracy.
