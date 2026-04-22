# Validation Summary: How to Secure IPv6 on Home Networks

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- IPv6 home networking
- Stateful firewalls and router firewall policy
- nftables
- ip6tables
- ebtables / Linux bridge filtering
- ICMPv6, NDP, Router Advertisements, and RA Guard
- Linux IPv6 privacy sysctls
- OpenWrt odhcpd and firewall4
- UniFi, ASUS, Windows, and macOS IPv6 privacy/firewall behavior

## Sources Consulted
- RFC 4864, Local Network Protection for IPv6: https://datatracker.ietf.org/doc/html/rfc4864
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/rfc4890/
- RFC 8981, Temporary Address Extensions for SLAAC in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- RFC 7217, Semantically Opaque Interface Identifiers with SLAAC: https://datatracker.ietf.org/doc/html/rfc7217
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.8/networking/ip-sysctl.html
- nftables manual page: https://netfilter.org/projects/nftables/manpage.html
- iptables-extensions manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- ebtables manual page: https://www.man7.org/linux/man-pages/man8/ebtables.8.html
- OpenWrt firewall4 default config source: https://lxr.openwrt.org/source/firewall4/root/etc/config/firewall
- OpenWrt odhcpd README source: https://lxr.openwrt.org/source/odhcpd/README.md
- ASUS official IPv6 firewall FAQ: https://www.asus.com/us/support/faq/1013638/
- Ubiquiti UniFi zone-based firewall documentation: https://help.ui.com/hc/en-us/articles/115003173168-Zone-Based-Firewalls-in-UniFi
- Microsoft netsh interface documentation: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface
- GitHub author profile: https://github.com/nawazdhandala
- Local validation with `nft -c -f -`, `ip6tables-translate`, `ebtables-translate`, `ss --help`, `ip -6 neigh help`, and Linux `sysctl`

## Issues Found
- The post implied NAT itself provides IPv4 security and that every IPv6 device has a globally routable address. Updated the wording to distinguish NAT from the stateful filtering commonly bundled with home routers, and changed the IPv6 claim to "devices can receive globally routable addresses."
- The router firewall checks were partly outdated or incomplete. Updated the UniFi wording to current zone/firewall terminology, corrected ASUS to `Firewall` -> `General` -> `IPv6 Firewall`, and clarified that OpenWrt users should check the `wan` zone `input` and `forward` policies and ensure IPv6 rules are not disabled.
- The nftables example used invalid IPv6 syntax: `2001:db8:home::/64`. Replaced it with the RFC 3849 documentation prefix `2001:db8:1234::/64` and added a note to replace it with the real LAN prefix.
- The nftables example used `ip6 nexthdr icmpv6`, which misses ICMPv6 packets with IPv6 extension headers. Replaced it with `meta l4proto ipv6-icmp`, as recommended by nftables documentation.
- The SLAAC privacy explanation stated that default SLAAC generates MAC-derived addresses. Updated it to say traditional SLAAC could do this, while many current systems use stable opaque interface IDs and temporary privacy addresses for outbound connections.
- The OpenWrt Router Advertisement snippet used `radvd` and `/etc/config/radvd`. Modern OpenWrt uses `odhcpd` configured in `/etc/config/dhcp`, so the snippet was replaced with an odhcpd LAN section.
- The ebtables RA Guard example used the `INPUT` chain for bridge transit filtering and numeric ICMPv6 values. Updated it to use the bridge `FORWARD` chain and documented names: `--ip6-proto ipv6-icmp` and `--ip6-icmp-type router-advertisement`.
- The ip6tables ICMPv6 example used invalid range syntax (`--icmpv6-type 133-136`) and omitted important ICMPv6 messages such as Time Exceeded, Parameter Problem, and MLD. Replaced it with individually valid rules for required error messages, NDP, MLD, and an optional Redirect rule.
- The monitoring section described `ss -6 -tuln` as listing active connections, but `-l` lists listening sockets. Replaced it with `ss -6 -tuna` and adjusted the surrounding text to describe IPv6 sockets and neighbor state accurately.

## Review Notes
The updated nftables snippet passed syntax parsing until `nft` attempted live netlink cache initialization, which failed due to local permissions rather than a syntax error. The updated ip6tables and ebtables examples were validated with translation tools. Windows, macOS, and router defaults can vary by OS version, firmware, and managed-device policy, so the post now includes verification guidance where appropriate.
