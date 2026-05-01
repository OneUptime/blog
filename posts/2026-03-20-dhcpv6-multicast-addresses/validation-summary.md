# Validation Summary: How to Understand DHCPv6 Multicast Addresses (ff02::1:2, ff05::1:3)

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6 multicast
- RFC 9915 / RFC 8415
- Cisco IOS DHCPv6 relay configuration
- ISC DHCP `dhcrelay`
- Linux `ip` / `iproute2`
- `ip6tables`

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc9915.html
- IANA IPv6 Multicast Address Space registry - https://www.iana.org/assignments/ipv6-multicast-addresses
- Cisco IOS IPv6 Command Reference: `ipv6 dhcp relay destination` - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_05.html
- ISC DHCP 4.4 Manual Pages: `dhcrelay` - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- `ip-maddress(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-maddress.8.html

## Issues Found
- The post cited RFC 8415 as the defining DHCPv6 reference even though RFC 9915 obsoletes RFC 8415. I updated the RFC tag and overview text to reference RFC 9915 and note the obsoletion.
- The `ff02::1:2` usage table and explanation implied only a subset of client messages used that address. RFC 9915 states DHCPv6 clients send their messages to `ff02::1:2`, so I corrected the table and explanatory text.
- The multicast-membership examples incorrectly implied a DHCPv6 client should join `ff02::1:2`. RFC 9915 defines servers and relay agents as members of that group; clients send to it but do not need to join it. I corrected the command comments and verification text.
- The firewall example was too loose for reply traffic and too restrictive for relay/server receive traffic. I changed the client reply rule to match UDP source port 547 and destination port 546, and changed the relay/server receive example to match traffic destined for `ff02::1:2`.

## Review Notes
- The Cisco relay configuration example is valid for a unicast relay destination in interface configuration mode.
- The ISC DHCP `dhcrelay -6 -l eth0 -u 2001:db8::1%eth1` example is syntactically valid per the ISC `dhcrelay` manual, where `-u` accepts `[address%]ifname`.
- RFC 9915 recommends relay destination lists that include unicast addresses; using `ff05::1:3` remains valid for site-scoped relay-to-server multicast.
