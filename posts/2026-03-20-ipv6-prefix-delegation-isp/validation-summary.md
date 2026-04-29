# Validation Summary: How to Understand IPv6 Prefix Delegation from ISPs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation (IA_PD)
- Router Advertisements
- SLAAC
- ISC DHCP
- wide-dhcpv6
- Linux networking tools (`dhclient`, `dhcp6c`, `ip`, `tcpdump`)

## Sources Consulted
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC Editor info for RFC 3633 (historical PD RFC, obsoleted by RFC 8415): https://www.rfc-editor.org/info/rfc3633
- ISC DHCP 4.4 `dhclient` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC knowledge base example showing `prefix6` inside `pool6`: https://kb.isc.org/docs/aa-01093
- `wide-dhcpv6` `dhcp6c.conf(5)` package source/man page: https://sources.debian.org/src/wide-dhcpv6/20080615-24/dhcp6c.conf.5/
- ISC DHCP client source used to verify actual DHCPv6 lease-file output format: https://sources.debian.org/src/isc-dhcp/4.4.1-2.3%2Bdeb11u2/client/dhclient.c

## Issues Found
- The post referenced RFC 3633 as if it were the current DHCPv6-PD specification. I updated the introduction to note that PD was originally specified in RFC 3633 and is now incorporated into RFC 9915.
- The DHCPv6 Solicit description used "broadcasts" for IPv6 traffic. I changed this to "multicasts" to `ff02::1:2`, which matches the DHCPv6 standard.
- The timer guidance incorrectly tied T1 and T2 to valid lifetime. I corrected it to the standards-based recommendation that T1 and T2 are derived from the shortest preferred lifetime.
- The `dhclient` example used a distro-specific lease-file path and showed an inaccurate DHCPv6 lease structure. I made the example self-contained with `-lf /tmp/dhclient6.leases`, removed the nonexistent `expires` field, and corrected the delegated-prefix syntax to `iaprefix ... {}`.
- The ISC DHCP server example placed `prefix6` directly under `subnet6`. I moved the delegated-prefix pool into `pool6`, which matches ISC's documented DHCPv6 configuration style.
- The `wide-dhcpv6` comments for `sla-id` implied the wrong derived subnet notation for a delegated `/56`. I corrected the comments to show the actual resulting `/64` subnets.
- The troubleshooting section implied the delegated `/56` or `/48` would appear directly on the WAN interface. I corrected the note to explain that the delegated prefix is typically visible in DHCPv6 client state or on downstream LAN interfaces, not as a WAN interface address.

## Review Notes
- ISC DHCP is marked EOL by ISC, but the post explicitly scopes that section to ISC DHCP and the corrected configuration remains technically valid for that software.
- `wide-dhcpv6` is a legacy DHCPv6 client, but the documented `dhcp6c.conf` syntax used in the post is valid for the referenced package documentation.
