# Validation Summary: How to Configure a Router to Send SLAAC Router Advertisements

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- IPv6 Router Advertisements and Neighbor Discovery
- Cisco IOS / IOS XE IPv6 Neighbor Discovery configuration
- Cisco stateless DHCPv6 configuration
- Linux radvd
- RFC 8106 RDNSS and DNSSL DNS options

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8106: IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106.html
- Cisco IOS IPv6 Command Reference, Neighbor Discovery commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS XE IPv6 DHCP configuration guide, stateless DHCPv6 server: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-2/ipv6-xe-2-book/ip6-dhcp.html
- Debian radvd.conf(5) man page: https://manpages.debian.org/testing/radvd/radvd.conf.5.en.html
- Ubuntu radvd(8) man page: https://manpages.ubuntu.com/manpages/trusty/man8/radvd.8.html

## Issues Found
- The Cisco IOS RA interval and lifetime examples used replaced hyphenated commands (`ipv6 nd ra-interval` and `ipv6 nd ra-lifetime`). Updated them to current Cisco syntax: `ipv6 nd ra interval` and `ipv6 nd ra lifetime`.
- The Cisco interface example showed two active alternative address commands. Commented the EUI-64 form as an alternative so the snippet works as described.
- The post implied M=0 enables SLAAC and M=1 means only DHCPv6 address assignment. Clarified that SLAAC depends on the per-prefix A flag and that stateful DHCPv6 can coexist with SLAAC.
- The stateless DHCPv6 section said hosts form SLAAC addresses with EUI-64. Changed this to a host-generated interface ID, since modern hosts may use privacy or stable opaque identifiers instead of EUI-64.
- The Linux examples wrote `/etc/radvd.conf` with unprivileged shell redirection. Replaced those commands with `sudo tee /etc/radvd.conf > /dev/null`.
- The radvd section omitted IPv6 forwarding, which radvd normally requires to start outside debug mode. Added sysctl commands to enable it persistently for the example.
- The radvd `MinRtrAdvInterval` default comment was inaccurate. Updated it to the documented default relationship to `MaxRtrAdvInterval`.
- The lifetime defaults were presented as universal. Clarified Cisco/RFC suggested defaults separately from radvd defaults, and clarified radvd's `infinity` syntax.
- The preferred-lifetime explanation said "no new" connections after deprecation. Updated it to match RFC 4862: new communication should use a preferred address when possible.
- The conclusion made the Cisco RA default behavior sound universal. Scoped it to Cisco IOS Ethernet interfaces, matching Cisco's command reference.

## Review Notes
The RDNSS and DNSSL radvd syntax is valid. The example sets DNS option lifetimes equal to `MaxRtrAdvInterval`; this is valid, but using the radvd default of `3 * MaxRtrAdvInterval` can be more resilient on lossy links.
