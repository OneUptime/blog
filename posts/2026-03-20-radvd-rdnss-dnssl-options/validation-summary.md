# Validation Summary: How to Configure radvd RDNSS and DNSSL Options

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Router Advertisements
- `radvd`
- RFC 8106 RDNSS and DNSSL options
- `systemd-resolved` / `resolvectl`
- `rdisc6` from `ndisc6`
- macOS DNS resolver inspection with `scutil`

## Sources Consulted
- RFC 8106, "IPv6 Router Advertisement Options for DNS Configuration": https://www.ietf.org/rfc/rfc8106.html
- Official `radvd` project repository, `radvd.conf(5)` source/manpage: https://github.com/radvd-project/radvd and https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.conf.5.man
- Official `systemd` `resolvectl` documentation: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Official `systemd-resolved.service` documentation: https://www.freedesktop.org/software/systemd/man/253/systemd-resolved.html
- Apple Support, "Change DNS settings on Mac": https://support.apple.com/sr-rs/guide/mac-help/mh14127/mac
- `networksetup(8)` man page reference: https://www.manpagez.com/man/8/networksetup/osx-10.9.php
- `rdisc6(8)` reference: https://manpages.debian.org/testing/ndisc6/rdisc6.8.en.html

## Issues Found
- The introduction claimed RDNSS/DNSSL are supported by all modern operating systems. I changed this to a narrower RFC 8106 client-implementation caveat because the original claim was too broad to state categorically.
- The standalone examples used `AdvRDNSSLifetime 600` / `AdvDNSSLLifetime 600` without setting `MaxRtrAdvInterval`, while both RFC 8106 RDNSS and DNSSL lifetimes should by default be at least `3 * MaxRtrAdvInterval`. I updated the standalone examples to `1800` seconds so they align with radvd's default `MaxRtrAdvInterval` of `600`.
- The combined example said the lifetime should be `2-3x MaxRtrAdvInterval`. RFC 8106 specifies a default recommendation of at least `3 * MaxRtrAdvInterval`, so I corrected the guidance and the example commentary to use `3x`.
- The combined example enabled `AdvRouterAddr on` in a generic SLAAC/RDNSS/DNSSL configuration. The `radvd.conf(5)` documentation describes `AdvRouterAddr` as a Mobile IPv6-specific behavior and defaults it to `off`, so I removed it from the generic example.
- The Linux verification section used `systemd-resolve --status`. Current official `systemd` documentation uses `resolvectl status`, so I updated the command and clarified that `/etc/resolv.conf` may only show a local stub resolver rather than the upstream RDNSS servers.
- The macOS verification section implied `networksetup -getdnsservers` was the right place to confirm active RDNSS/DNSSL-derived resolver state. I changed this to `scutil --dns`, which is the more appropriate command for inspecting the active resolver configuration.

## Review Notes
- The post is technically sound after the fixes above.
- Runtime DNS presentation varies by client resolver stack. On Linux, `systemd-resolved` may expose a local stub in `/etc/resolv.conf`, so `resolvectl status` is the better verification command when available.
- Some distributions may still ship `systemd-resolve`, but current upstream `systemd` documentation centers on `resolvectl`.
