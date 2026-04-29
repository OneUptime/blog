# Validation Summary: How to Configure IPv6 Stateful Router with DHCPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6 Neighbor Discovery and Router Advertisements
- DHCPv6
- `radvd`
- ISC DHCP (`dhcpd`)
- Kea DHCP
- Linux `sysctl`
- `systemctl`, `journalctl`, and `networkctl`

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration — https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://datatracker.ietf.org/doc/html/rfc8415
- `radvd.conf(5)` Debian manpage — https://manpages.debian.org/testing/radvd/radvd.conf.5.en.html
- ISC DHCP 4.4 `dhcpd.conf` manual — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP example `dhcpd-dhcpv6.conf` — https://sources.debian.org/src/isc-dhcp/4.4.3-P1-8/doc/examples/dhcpd-dhcpv6.conf
- Kea DHCPv6 Administrator Reference Manual — https://kea.readthedocs.io/en/kea-2.7.6/arm/dhcp6-srv.html
- Ubuntu Server documentation for `isc-dhcp-server` — https://ubuntu.com/server/docs/how-to/networking/install-isc-dhcp-server/

## Issues Found
- The post described the Router Advertisement Managed flag (`M=1`) as forcing clients to use DHCPv6. RFC 4861 and `radvd.conf(5)` describe it as signaling that managed address configuration is available, so I corrected that wording in the introduction, `radvd` comments, and conclusion.
- The DHCPv6 timer example had `dhcp-renewal-time` and `dhcp-rebinding-time` later than the preferred lifetime. I changed them to `7200` and `10800` so the example follows the usual `T1 < T2 < preferred lifetime < valid lifetime` relationship used by current DHCPv6 implementations.
- The sample IPv6 literals `2001:db8:1:1::ntp` and `2001:db8:1:1::web` were invalid IPv6 addresses. I replaced them with valid example addresses.
- The static reservation comment implied a direct link-layer-address match. In this `host-identifier option dhcp6.client-id ...` form, ISC DHCPv6 is matching the client DUID, so I clarified the comment.
- The comment above `authoritative;` implied subnet scope even though the statement is global in the shown configuration. I corrected the comment.

## Review Notes
- `isc-dhcp-server` remains usable for the `dhcpd6.conf` example syntax, but Ubuntu documents it as deprecated and unsupported since Ubuntu 24.04 LTS; Kea is the preferred current alternative.
- The Kea snippet is acceptable as shown because Kea local configuration files use an extended JSON format that permits comments.
