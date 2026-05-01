# Validation Summary: How to Configure Dual-Stack on MikroTik Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- MikroTik RouterOS
- IPv4
- IPv6
- Dual-stack networking
- Router Advertisement / Neighbor Discovery
- DHCPv6
- BGP
- RouterOS firewall filters

## Sources Consulted
- MikroTik RouterOS Packages documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/40992872/Packages
- MikroTik RouterOS IP Settings documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/103841817/IP%2BSettings
- MikroTik RouterOS IPv6 Neighbor Discovery documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6%2BNeighbor%2BDiscovery
- MikroTik RouterOS DHCP documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/24805500/DHCP
- MikroTik RouterOS BGP documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/331612228/routing%20bgp
- MikroTik RouterOS Filter documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/48660574/Filter
- MikroTik RouterOS IP Routing documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/328084/IP%20Routing

## Issues Found
- The post treated IPv6 as a separately installable package. I changed that section to reflect current RouterOS 7 behavior, where IPv6 is part of the main `routeros` package, and added `/ipv6 settings print` because IPv6 can be disabled system-wide.
- Several example IPv6 addresses were syntactically invalid because they used non-hex tokens like `wan`, `lan`, `peer`, and `mgmt`. I replaced them with valid documentation-prefix examples so the commands are copyable.
- The Router Advertisement example used `dns=` under `/ipv6 nd`. I changed it to `dns-servers=` to match the current Neighbor Discovery properties.
- The comment describing `advertise=yes` on an IPv6 address was too broad. I corrected it to state that the flag causes the prefix to be advertised through RA, which matches MikroTik's ND behavior.
- The DHCPv6 server example used an `address-pool` backed by a `/64` pool, which is incorrect for DHCPv6 address delegation in RouterOS. I changed it to a `/128` address pool and added the matching `managed-address-configuration=yes` ND setting required for stateful host address assignment.
- The IPv6 firewall SSH management prefix and one IPv4 SSH management prefix did not match the rest of the example network, and one IPv6 prefix was invalid. I corrected those prefixes so the management rules align with the configured LAN subnets.
- The BGP section used outdated `address-families=` syntax and did not define a local AS context. I updated it to current RouterOS 7 syntax with an explicit BGP instance and `afi=ip` / `afi=ipv6`.
- The summary repeated the outdated BGP syntax and overstated what `advertise=yes` does. I aligned the summary with the corrected commands.

## Review Notes
RouterOS 7 syntax and behavior were used for validation. Older RouterOS 6 systems differ, especially around package layout and BGP configuration. The firewall section is technically valid as a basic example, but production deployments should usually tighten it further with interface-based restrictions and more explicit forward-chain policy.
