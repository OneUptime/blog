# Validation Summary: How to Configure IPv6 Privacy Extensions on pfSense

## Status
validated

## Post Type
Guide

## Technologies Covered
- pfSense
- FreeBSD IPv6 sysctls
- IPv6 SLAAC and DHCPv6 WAN configuration
- IPv6 temporary/privacy addresses

## Sources Consulted
- pfSense Documentation, IPv6 Configuration Types: https://docs.netgate.com/pfsense/en/latest/interfaces/configure-ipv6.html
- pfSense Documentation, System Tunables: https://docs.netgate.com/pfsense/en/latest/config/advanced-tunables.html
- pfSense Documentation, Interface Status: https://docs.netgate.com/pfsense/en/latest/monitoring/status/interfaces.html
- pfSense Documentation, Versions of pfSense software and FreeBSD: https://docs.netgate.com/pfsense/en/latest/releases/versions.html
- FreeBSD source tree, `sys/netinet6/in6.h`: https://cgit.freebsd.org/src/tree/sys/netinet6/in6.h?h=stable/14
- FreeBSD source tree, `sys/netinet6/in6_proto.c`: https://cgit.freebsd.org/src/tree/sys/netinet6/in6_proto.c?h=stable/14
- FreeBSD source tree, `sys/netinet6/nd6_rtr.c`: https://cgit.freebsd.org/src/tree/sys/netinet6/nd6_rtr.c?h=stable/14
- FreeBSD source tree, `sbin/ifconfig/af_inet6.c`: https://cgit.freebsd.org/src/tree/sbin/ifconfig/af_inet6.c?h=stable/14
- FreeBSD source tree, `UPDATING`: https://cgit.freebsd.org/src/tree/UPDATING
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- Corrected the FreeBSD sysctl names from `net.inet6.ip6.preferred_tempaddr` to `net.inet6.ip6.prefer_tempaddr` and from `net.inet6.ip6.tempmaxlifetime` to `net.inet6.ip6.tempvltime`. The original names do not match current FreeBSD OIDs.
- Added the missing persistent `net.inet6.ip6.tempvltime` tunable so the persistent configuration matches the runtime example.
- Replaced undocumented pfSense GUI checkbox instructions. Current pfSense documentation describes the supported GUI path as `System > Advanced > System Tunables`, not a per-interface `Use Temporary Addresses` or `Use Privacy Extensions` checkbox.
- Narrowed the scope from generic WAN or DHCPv6 behavior to SLAAC/autoconfigured addresses, which is where FreeBSD temporary address generation applies. On DHCPv6 WANs, the feature only matters if the interface also forms a SLAAC address from router advertisements.
- Corrected the pfSense UI path for cycling a DHCPv6 WAN lease from `Interfaces > WAN` to `Status > Interfaces`.
- Reworded the tracking/privacy claims so they reflect RFC guidance more accurately. Temporary addresses reduce address-based correlation for outbound traffic, but they do not make the firewall untrackable or necessarily replace the stable autoconfigured address.
- Corrected the example `ifconfig` output flag order to match FreeBSD output formatting.

## Review Notes
- RFC 8981 obsoletes RFC 4941 for IPv6 temporary addresses. The post is still about the same feature class, but future updates may want to reference RFC 8981 explicitly.
- Newer FreeBSD branches have changed default SLAAC behavior toward stable opaque identifiers (`net.inet6.ip6.use_stableaddr`) instead of hardware-derived interface identifiers. The revised post now avoids assuming EUI-64 behavior for every pfSense release.
