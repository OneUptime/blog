# Validation Summary: How to Configure a DHCPv6 Relay Agent

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- DHCPv6 relay agents
- Cisco IOS
- ISC `dhcrelay`
- Kea DHCPv6 server
- IPv6

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 4649, DHCPv6 Relay Agent Remote-ID Option: https://www.rfc-editor.org/rfc/rfc4649.html
- RFC 4580, DHCPv6 Relay Agent Subscriber-ID Option: https://www.rfc-editor.org/rfc/rfc4580.html
- Cisco IOS IPv6 Command Reference, `ipv6 dhcp relay destination` / `ipv6 dhcp relay source-interface`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Command Reference, `show ipv6 dhcp interface` / `show ipv6 dhcp relay binding`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_13.html
- ISC DHCP 4.4 Manual Pages, `dhcrelay`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP product page and relay end-of-maintenance notice: https://www.isc.org/dhcp/ and https://www.isc.org/blogs/dhcp-client-relay-eom/
- Kea DHCPv6 server documentation, relay and subnet selection behavior: https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp6-srv.html
- Debian packaging init script for `isc-dhcp-relay` wrapper behavior: https://sources.debian.org/src/isc-dhcp/4.3.1-6/debian/isc-dhcp-relay.init.d/
- Ubuntu `isc-dhcp-relay` package 4.4.3-P1-4ubuntu2 init script and package metadata inspected locally

## Issues Found
- The post used invalid example IPv6 addresses such as `2001:db8:server::/64` and `2001:db8::server`. These were replaced with valid documentation-prefix examples under `2001:db8:100::/64`.
- The relay hop-count limit was listed as `32`. RFC 8415 reduced `HOP_COUNT_LIMIT` to `8`, so the message-format description was corrected.
- The RELAY-FORW `link-address` and `peer-address` descriptions were too absolute. They were updated to reflect RFC 8415 behavior more accurately: `link-address` identifies the client link and is typically a GUA/ULA from that link, while `peer-address` is the client's address and is often link-local in initial exchanges.
- The Cisco example incorrectly used `ipv6 dhcp relay destination ... GigabitEthernet0/0` as if the trailing interface set the relay source. Cisco documents that argument as the output interface for the relay destination. The example was corrected to use `ipv6 dhcp relay source-interface GigabitEthernet 0/0`.
- The Cisco verification command `show ipv6 dhcp relay statistics` is not the documented generic Cisco IOS verification command for this feature. It was replaced with documented IOS commands: `show ipv6 dhcp interface` and `show ipv6 dhcp relay binding`.
- The Debian/Ubuntu `/etc/default/isc-dhcp-relay` example was incorrect for DHCPv6. The package init wrapper builds a DHCPv4-style command line with `-i` and positional server arguments, while ISC documents DHCPv6 mode as requiring `-l` and `-u`. That section was rewritten to use valid `dhcrelay -6` invocations.
- The Linux and Cisco examples were updated to keep address examples internally consistent after the IPv6 address corrections.
- The client verification command was tightened from `ip -6 addr show eth0` to `ip -6 addr show dev eth0` for explicit `iproute2` syntax.

## Review Notes
- ISC has ended maintenance for the ISC DHCP relay component. The `dhcrelay` examples remain technically correct where the package is still available, but readers should verify package availability and support status on their target distribution.
