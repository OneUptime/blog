# Validation Summary: How to Allocate IPv6 Prefixes to Customer Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- ISC Kea DHCPv6
- ISC DHCP (`dhcpd`)
- `wide-dhcpv6-client` (`dhcp6c`)
- Python `ipaddress`

## Sources Consulted
- IETF RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc9915
- ISC Kea Administrator Reference Manual 2.7.7, DHCPv6 server and prefix delegation pools: https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp6-srv.html
- ISC DHCP 4.4 `dhcpd.conf` manual pages, including `prefix6` syntax and ISC DHCP EOL notice: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual pages, including `dhcp6.name-servers` and `dhcp6.domain-search`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- Debian manpage for `dhcp6c.conf(5)`: https://manpages.debian.org/unstable/wide-dhcpv6-client/dhcp6c.conf.5.en.html
- Debian manpage for `dhcp6c(8)`: https://manpages.debian.org/trixie/wide-dhcpv6-client/dhcp6c.8.en.html
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The introduction cited DHCPv6-PD as RFC 3633 only. Updated it to reference the current DHCPv6 standard, RFC 9915, while preserving the historical RFC 3633 reference, because RFC 9915 obsoletes RFC 8415 and RFC 3633.
- The `dhcpd` `prefix6` upper bound was `2001:db8:1fff:: /56`, which does not cover the full `2001:db8:1000::/36` delegation space. Updated it to `2001:db8:1fff:ff00:: /56`, which is the last `/56` boundary inside that `/36`.
- The ISC DHCP section presented `dhcpd` without lifecycle context. Marked it as legacy because ISC DHCP 4.4 is end-of-life in ISC's official documentation.
- The Linux verification comments implied `ip -6 addr` would directly show "a delegated /64". Updated the wording to match `dhcp6c`'s documented behavior: a derived global `/64` is configured on the LAN interface, with a connected `/64` route.

## Review Notes
- The Python example executed successfully under `python3` and produced the expected first `/56` allocations from the `/36` pool.
- The Python pool manager is intentionally simplistic: it materializes all candidate subnets in memory and does not implement prefix release or reuse. It is acceptable as a teaching example, but it is not production IPAM logic.
