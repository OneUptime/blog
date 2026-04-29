# Validation Summary: How to Configure VLAN Interfaces for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS (v7)
- 802.1Q VLAN tagging
- IPv4 addressing
- Bridge VLAN filtering
- DHCP server (RouterOS)
- Router-on-a-stick inter-VLAN routing

## Sources Consulted
- MikroTik RouterOS documentation: VLAN (https://help.mikrotik.com/docs/display/ROS/VLAN)
- MikroTik RouterOS documentation: Bridging and Switching (https://help.mikrotik.com/docs/display/ROS/Bridging+and+Switching)
- MikroTik RouterOS documentation: DHCP (https://help.mikrotik.com/docs/display/ROS/DHCP)
- MikroTik wiki: Bridge VLAN Filtering (https://wiki.mikrotik.com/wiki/Manual:Interface/Bridge#Bridge_VLAN_Filtering)
- IEEE 802.1Q-2018 standard

## Issues Found
No technical issues found.

The MikroTik RouterOS command syntax is correct throughout:
- `/interface vlan add name=... vlan-id=... interface=...` matches the documented VLAN interface syntax.
- `/ip address add address=... interface=...` is the correct IPv4 assignment syntax.
- `/ip pool add`, `/ip dhcp-server add`, and `/ip dhcp-server network add` use correct parameters.
- Bridge VLAN filtering setup (`vlan-filtering=yes`, `frame-types=admit-only-vlan-tagged`, `frame-types=admit-only-untagged-and-priority-tagged`, `pvid=`) matches the RouterOS v7 documented values.
- `/interface bridge vlan add` with `tagged` and `untagged` port lists is correct, and including `bridge1` in the `tagged` list is the documented requirement when using a VLAN sub-interface on the bridge for inter-VLAN routing.
- The `~` regex match operator in `/ip address print where interface~"vlan"` is valid RouterOS query syntax.

## Review Notes
- The post correctly recommends bridge VLAN filtering for RouterOS v7. Users on RouterOS v6 should be aware that bridge VLAN filtering syntax has differences (e.g., absence of `untagged` parameter behavior in older versions) and that hardware offload behavior depends on the device's switch chip.
- For production use, the `dns-server=8.8.8.8` example uses a single public DNS; users may want internal DNS or redundant resolvers — this is a reasonable simplification for a tutorial.
- No mention of firewall rules or `/ip firewall filter` is made; users deploying inter-VLAN routing in production will need to add filter/forward chain rules to control traffic between VLANs. This is out of scope for a VLAN configuration post but worth noting.
- The `comment="..."` parameters in the address-add commands are accepted by RouterOS and helpful for documentation.
