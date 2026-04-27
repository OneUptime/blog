# Validation Summary: How to Configure IPv4 Interfaces on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (FreeBSD-based firewall/router)
- IPv4 interface configuration (WAN, LAN, OPT, VLAN)
- DHCP and static IPv4 addressing
- FreeBSD interface naming (em0, em1, em1.10)
- pfSense web GUI workflows (Interfaces, Firewall > Rules, Firewall > Aliases)
- FreeBSD CLI utilities: `ifconfig`, `netstat`, `ping`, `arp`

## Sources Consulted
- pfSense official documentation - Interface Configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/index.html
- pfSense Console Setup: https://docs.netgate.com/pfsense/en/latest/config/console-menu.html
- pfSense VLAN configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/vlans.html
- pfSense Firewall Rules and Aliases: https://docs.netgate.com/pfsense/en/latest/firewall/aliases.html
- FreeBSD Handbook (ifconfig, netstat, arp): https://docs.freebsd.org/en/books/handbook/
- RFC 5737 (TEST-NET-3 / 203.0.113.0/24 documentation prefix)
- RFC 1918 (Private address space — 10.0.0.0/8, 192.168.0.0/16)

## Issues Found

1. **Firewall rule for multiple ports (80,443) was misleading.** The original text suggested adding a single rule with `Port=80,443`. pfSense's "Destination Port Range" field does not accept comma-separated lists; multiple discrete ports require either two separate rules or a Ports alias (Firewall > Aliases) referenced from one rule. Updated the example to spell out both correct approaches.

## Review Notes
- pfSense CE is FreeBSD-based; pfSense Plus also derives from FreeBSD. The post's "FreeBSD-based" framing is accurate.
- Default LAN address `192.168.1.1/24` matches the pfSense factory default.
- `203.0.113.0/24` is the RFC 5737 TEST-NET-3 documentation block — appropriate for examples.
- VLAN naming as `em1.10` (parent.tag) is the standard pfSense/FreeBSD convention.
- The CLI commands (`ifconfig`, `netstat -rn`, `ping -c 4`, `arp -an`) are all valid on FreeBSD/pfSense.
- The Initial Console Setup section is a simplified summary; the actual console menu offers richer options (assign interfaces, set interface IP for both WAN and LAN, reset password, etc.), but the simplification is not technically wrong for an introductory walkthrough.
- The static IPv4 example uses `/30` with `.1` as gateway and `.2` as the WAN address — valid for a 4-address point-to-point subnet.
