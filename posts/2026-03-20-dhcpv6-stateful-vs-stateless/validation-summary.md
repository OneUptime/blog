# Validation Summary: How to Understand Stateful vs Stateless DHCPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6 Router Advertisements (RA)
- SLAAC
- `radvd`
- Cisco IOS IPv6 ND flags
- Kea DHCPv6
- `tcpdump`
- ISC `dhclient`

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- `radvd.conf(5)` man page: https://manpages.debian.org/stretch/radvd/radvd.conf.5.en.html
- Cisco IOS IPv6 command reference for `ipv6 nd managed-config-flag` and `ipv6 nd other-config-flag`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- ISC DHCP end-of-maintenance notice: https://www.isc.org/dhcp/
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/stable/arm/dhcp6-srv.html
- `kea-dhcp6` manual page: https://kea.readthedocs.io/en/kea-2.1.3/man/kea-dhcp6.8.html
- ISC DHCP option syntax reference: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC `dhclient` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient

## Issues Found
- The post said RA M and O flags "tell clients which mode to use" and "control" behavior. I changed this to reflect the standards more accurately: the flags indicate whether DHCPv6 addresses and/or other configuration are available, and SLAAC can still coexist if the prefix A flag is on.
- The stateful section implied `M=1` alone means DHCPv6-only addressing. I clarified that clients may still form SLAAC addresses if the advertised prefix keeps `A=1`.
- The stateless section said the server keeps no per-client state and returns the same options to all clients. I narrowed this to "no per-client address state" and noted that option values can still vary by subnet or policy.
- The example NTP address `2001:db8::ntp1` was not a valid IPv6 literal. I replaced it with a valid documentation-prefix IPv6 address.
- The `radvd` examples were incomplete for real use: they omitted `AdvSendAdvert on;` and the closing braces for the interface blocks. I fixed the snippets and clarified that `O=1` is optional when `M=1` because the M flag already implies DHCPv6 can provide other configuration.
- The DHCPv6 server section used ISC DHCP (`dhcpd`), which ISC marks as end-of-maintenance for new implementations. I replaced that section with a current Kea DHCPv6 configuration and matching `kea-dhcp6` test/start commands.
- The `tcpdump` example depended on a specific decode format (`grep "msgtype"`). I changed it to a more portable capture example and described what packet types to look for instead.
- The lease-file example implied that the absence of `/var/lib/dhclient/dhclient6.leases` proves SLAAC. I qualified it as an ISC `dhclient`-specific check and noted that other DHCPv6 clients store lease state elsewhere.

## Review Notes
- The post is now technically accurate, but client behavior still varies by OS and DHCPv6 client implementation. In particular, which options are requested in an Information-request message and where lease state is stored can differ across Linux distributions and network managers.
- The statement that RA is still needed for the default gateway is correct: DHCPv6 does not supply the IPv6 default router.
