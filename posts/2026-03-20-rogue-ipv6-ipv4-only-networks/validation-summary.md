# Validation Summary: How to Understand Rogue IPv6 on IPv4-Only Networks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol
- Router Advertisements and SLAAC
- RFC 6724 address selection
- THC-IPv6 fake_router6
- Scapy
- tcpdump, radvdump, and NDPMon
- Linux sysctl and ip6tables
- Cisco RA Guard and DHCPv6 Guard
- Juniper Junos RA Guard
- Windows IPv6 router discovery controls

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6724: Default Address Selection for IPv6: https://datatracker.ietf.org/doc/html/rfc6724
- RFC 6105: IPv6 Router Advertisement Guard: https://datatracker.ietf.org/doc/html/rfc6105
- RFC 7113: Implementation Advice for IPv6 Router Advertisement Guard: https://datatracker.ietf.org/doc/html/rfc7113
- Scapy IPv6/ICMPv6 API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- THC-IPv6 fake_router6 manual page: https://www.mankier.com/8/fake_router6
- Debian NDPMon manual page: https://manpages.debian.org/stretch/ndpmon/ndpmon.8.en.html
- Ubuntu NDPMon configuration manual page: https://manpages.ubuntu.com/manpages/trusty/man8/config_ndpmon.xml.8.html
- radvdump manual page: https://www.mankier.com/8/radvdump
- Cisco IOS XE RA Guard configuration example: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-6/configuration_guide/ipv6/b_166_ipv6_9500_cg/b_166_ipv6_9500_cg_chapter_0100.html
- Cisco IPv6 First Hop Security / DHCPv6 Guard documentation: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3650/software/release/3e/consolidated_guide/configuration_guide/b_consolidated_3650_3e_cg/b_consolidated_3650_3e_cg_chapter_01011010.pdf
- Juniper Junos RA Guard documentation: https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/task/port-security-ra-guard.html
- Local command checks: `tcpdump -ddd 'icmp6 and ip6[40] == 134'` and `ip6tables -p icmpv6 -h`

## Issues Found
- The post said a rogue RA could redirect "all traffic." Changed this to IPv6-capable or IPv6 traffic, because IPv4-only destinations are not redirected by an IPv6 default route.
- The RA behavior description was unconditional. Clarified that SLAAC and default-route installation require a valid RA with an autonomous prefix and a non-zero router lifetime.
- The `fake_router6` example used `2001:db8:evil::/64`, which is not valid IPv6 syntax because `evil` is not hexadecimal. Replaced it with `2001:db8:bad::/64`.
- The Scapy RA example did not set a link-local IPv6 source address or IPv6 hop limit 255, both required for valid Neighbor Discovery packets. Added `src='fe80::1'`, `hlim=255`, a source MAC, and a Source Link-Layer Address option.
- The sample route output used `fe80::attacker`, which is not valid IPv6 syntax. Replaced it with `fe80::1` and made the advertised prefix match the example.
- The IPv6 address detection note implied any non-link-local address must come from an RA. Updated it to say the host has IPv6 configured, often via RA/SLAAC, because DHCPv6 or manual configuration are also possible.
- The NDPMon command used `-c /etc/ndpmon/config.xml`; the documented config-file option is `-f`, and Debian/Ubuntu use `/etc/ndpmon/config_ndpmon.xml`.
- The Juniper RA Guard snippet used undocumented/incorrect syntax for the cited platform. Replaced it with the documented Junos `forwarding-options access-security router-advertisement-guard ... mark-interface block` form.
- The DHCPv6 section claimed DHCPv6 snooping/guard prevents rogue RAs and configured `device-role server` on the example access port. Renamed the section to DHCPv6 Guard, clarified it is complementary to RA Guard, and changed the host-port role to `device-role client`.
- The summary said a single RA is sufficient. Changed this to a valid RA to match RFC 4861 validation requirements.

## Review Notes
- The `tcpdump` BPF expression is valid for ordinary RA packets, but header-chain or fragmentation evasion can require more robust inspection, as discussed in RFC 7113.
- The `ip6tables` rule syntax is valid on the checked system, where `ip6tables` is backed by nf_tables.
