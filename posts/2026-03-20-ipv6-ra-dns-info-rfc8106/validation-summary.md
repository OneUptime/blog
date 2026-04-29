# Validation Summary: How to Configure IPv6 RA with DNS Information (RFC 8106)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6 Router Advertisement
- RFC 8106 / RFC 6106
- `radvd`
- `rdisc6` / `ndisc6`
- `systemd-resolved` / `resolvectl`
- Cisco IOS XE
- FreeBSD `rtadvd` / `rtsold`

## Sources Consulted
- RFC 8106: https://datatracker.ietf.org/doc/html/rfc8106
- `radvd.conf(5)` Debian man page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- `rdisc6(8)` Debian man page: https://manpages.debian.org/unstable/ndisc6/rdisc6.8.en.html
- `resolvectl(1)` systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- FreeBSD `rtadvd.conf(5)`: https://man.freebsd.org/cgi/man.cgi?rtadvd.conf
- FreeBSD `rtsold(8)` / `rtsol`: https://man.freebsd.org/cgi/man.cgi?query=rtsol
- Microsoft Networking Blog, Windows 10 Creators Update RFC 6106 support: https://techcommunity.microsoft.com/blog/networkingblog/core-network-stack-features-in-the-creators-update-for-windows-10/339676/
- Cisco IOS XE 17.14 IPv6 Unicast Routing Guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-14/configuration_guide/rtng/b_1714_rtng_9300_cg/configuring_ipv6_unicast_routing.html
- Cisco IOS XE 17.14 IP Addressing Services Guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-14/configuration_guide/ip/b_1714_ip_9300_cg/dhcpv6_options_support.html

## Issues Found
- The post said RDNSS/DNSSL lifetimes should be at least `2 * MaxRtrAdvInterval`. I changed this to `3 * MaxRtrAdvInterval` because RFC 8106 raised the default and recommended lifetime, and explicitly notes that the older 2x lower bound could allow expiry.
- The Linux verification example used `systemd-resolve --status`. I changed it to `resolvectl status eth0`, which is the current documented CLI for `systemd-resolved`.
- The Cisco IOS XE example omitted the documented `sequence` parameter and used verification commands that do not specifically show RA DNS configuration. I corrected the example to documented `ipv6 nd ra dns server ... sequence ...` and `ipv6 nd ra dns search-list ... sequence ...` syntax, and updated verification to `show ipv6 nd ra dns server` and `show ipv6 nd ra dns search-list`.
- The platform support table made version-specific claims that were broader than what I could support from official vendor documentation. I narrowed those rows to conservative, documented statements and marked the unverified vendor/version claims as release-dependent.

## Review Notes
- Cisco IOS XE DNSSL CLI syntax varies across platform families and releases; Cisco also documents a newer `ipv6 nd ra dns-search-list domain ...` form in the IP Addressing Services guides.
- On Linux, whether RA-delivered DNS is actually applied depends on the client resolver stack, not just the kernel.
- `rdisc6` defaults to waiting for multiple advertisements; add `-1` if you want it to exit after the first RA.
