# Validation Summary: How to Enable IPv6 on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (23.x or later) firewall
- IPv6 networking (DHCPv6, SLAAC, Prefix Delegation)
- ICMPv6 firewall rules
- Router Advertisements (radvd)
- Unbound DNS (AAAA records, host overrides)
- Interface tracking for delegated prefixes

## Sources Consulted
- OPNsense official IPv6 documentation: https://docs.opnsense.org/manual/ipv6.html
- OPNsense WAN/LAN interface configuration reference
- OPNsense diagnostics reference (NDP Table location)

## Issues Found
- **ARP Table vs NDP Table (Diagnostics section):** The post stated `Interfaces → Diagnostics → ARP Table  (shows IPv6 NDP)`. This is incorrect — the ARP Table in OPNsense displays IPv4 ARP entries only. IPv6 neighbor discovery has its own separate menu item: `Interfaces → Diagnostics → NDP Table`. Updated the diagnostics block to reference `NDP Table  (shows IPv6 neighbors)` so users navigate to the correct page when troubleshooting IPv6 neighbor entries.

## Review Notes
- The IPv6 configuration types listed for the WAN (DHCPv6, Static IPv6) and the Track Interface mode for LAN match the options exposed in OPNsense's interface configuration page.
- Router Advertisement modes (`Unmanaged` for SLAAC-only, `Assisted` for SLAAC + DHCPv6) are accurate names used in OPNsense's `Services → Router Advertisements` page.
- The ICMPv6 pass rule is correctly highlighted as critical — without it, neighbor discovery and PMTU discovery fail and IPv6 connectivity breaks in subtle ways.
- The example documentation addresses use the `2001:db8::/32` documentation prefix (RFC 3849), which is the correct convention for examples.
- Note for future updates: OPNsense is gradually migrating DHCP services from ISC DHCP to Kea DHCP. The `Services → DHCPv6` menu path is still valid in current 23.x/24.x releases, but readers using future releases may see this menu rename to reflect the Kea-based UI.
