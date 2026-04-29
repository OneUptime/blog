# Validation Summary: How to Configure IPv6 Router Advertisements on MikroTik

## Status
validated

## Post Type
Guide

## Technologies Covered
- MikroTik RouterOS
- IPv6 Neighbor Discovery
- IPv6 Router Advertisements
- SLAAC
- DHCPv6
- RDNSS / IPv6 DNS advertisement

## Sources Consulted
- MikroTik RouterOS IPv6 Neighbor Discovery documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6%2BNeighbor%2BDiscovery
- MikroTik RouterOS IP Settings documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/103841817/IP%2BSettings
- MikroTik RouterOS IP Addressing documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/328247/IP%2BAddressing
- MikroTik RouterOS DNS documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/37748767/DNS
- MikroTik RouterOS DHCP documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/24805500/DHCP
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html

## Issues Found
- The original prerequisites and package check implied that an `ipv6` package must be verified generally. I corrected this to a version-safe form: older RouterOS 6 builds may require checking the `ipv6` package, and the post now also checks `/ipv6 settings` directly.
- The RDNSS section used incorrect or nonexistent RouterOS property names (`dns` and `dns-server`) and included a stray `/ipv6 nd prefix` line. I replaced this with the documented `dns-servers` property and clarified the supported `advertise-dns=yes` workflow.
- The initial RA configuration used `/ipv6 nd set [find interface=bridge1]`, which is not reliable on a fresh configuration where no per-interface ND entry exists yet. I changed the setup examples to use `/ipv6 nd add interface=bridge1`.
- The DHCPv6 flag section overstated what the M/O flags alone do. I corrected the text to reflect RFC 4861 and MikroTik behavior: the flags advertise DHCPv6 availability, but if an autonomous prefix is still advertised, many clients will use both SLAAC and DHCPv6.
- The manual `/ipv6 nd prefix` customization example could have caused duplicate prefix advertisement when combined with `advertise=yes` on the address. I clarified that automatic prefix advertisement should be disabled on the address first when switching to a manual ND prefix entry.
- The verification comments were too specific. I corrected `/ipv6 neighbor print` to refer to the neighbor table generally and noted that the sniffer command captures ICMPv6 traffic, including Router Advertisements.

## Review Notes
- MikroTik’s official documentation applies to the latest stable RouterOS release, so older RouterOS 6 package layout and behavior are the main version-specific caveat in this post.
- MikroTik’s DHCPv6 documentation notes that DHCPv6-only client behavior can vary by operating system; some clients may still require `autonomous=no` or other adjustments if SLAAC is being avoided.
