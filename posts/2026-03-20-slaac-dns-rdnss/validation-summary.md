# Validation Summary: How to Configure DNS via RDNSS in SLAAC Router Advertisements

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 Router Advertisements
- SLAAC
- RDNSS and DNSSL
- RFC 8106
- radvd
- Cisco IOS XE IPv6 RA DNS configuration
- Linux DNS verification tools: systemd-resolved, NetworkManager, tcpdump

## Sources Consulted
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106
- Debian radvd.conf(5) man page for radvd 2.20: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- Cisco IOS IPv6 Command Reference for `ipv6 nd ra dns server`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS XE IPv6 Unicast Routing guide for RDNSS/DNSSL syntax and `show ipv6 nd ra dns` commands: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-16/configuration_guide/rtng/b_1716_rtng_9400_cg/configuring_ipv6_unicast_routing.html
- systemd.network(5) documentation for IPv6 RA DNS handling: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- Microsoft networking blog on Windows 10 Creators Update RFC 6106/RDNSS support: https://techcommunity.microsoft.com/blog/networkingblog/core-network-stack-features-in-the-creators-update-for-windows-10/339676/
- Local CLI help output for `resolvectl`, `nmcli device show`, and `tcpdump`.

## Issues Found
1. **Incorrect RDNSS length formula**: The post stated that RDNSS option length is `2 + 2*n`. RFC 8106 defines the one-address minimum as 3 and the number of addresses as `(Length - 1) / 2`, so the correct formula is `1 + 2*n`. Updated the formula.
2. **Incorrect RFC 8106 lifetime recommendation**: The post used `2 * MaxRtrAdvInterval` as the recommendation. RFC 8106 and current radvd documentation use a default of at least `3 * MaxRtrAdvInterval`. Updated the RDNSS/DNSSL example lifetimes, best-practice text, and conclusion from 1200 seconds to 1800 seconds for a 600-second RA interval.
3. **radvd command would fail for non-root users**: The example used `cat > /etc/radvd.conf` while later using `sudo` for service restart. Replaced it with `sudo tee /etc/radvd.conf > /dev/null` so the command can actually write to `/etc/radvd.conf`.
4. **DNSSL encoding was oversimplified**: The post described DNSSL contents as null-terminated DNS strings. RFC 8106 requires RFC 1035 domain-name encodings ending in a zero octet, padded to an 8-byte boundary, and not compressed. Updated the explanation.
5. **Cisco syntax was inaccurate and over-specific**: The Cisco example used a non-matching `lifetime` keyword and claimed a broad IOS 15.3+/IOS-XE 3.9+ support boundary. Updated the example to Cisco IOS XE style with numeric lifetime and `sequence`, changed verification commands to `show ipv6 nd ra dns ...`, and replaced the version claim with a platform/release syntax caveat.
6. **Linux OS support claim was misleading**: The post tied Linux RDNSS support to a kernel version and claimed Windows Server 2008+ support. Updated the wording to refer to modern Linux network managers and Windows 10 Creators Update and later.
7. **`/etc/resolv.conf` verification was too absolute**: On systems using systemd-resolved, `/etc/resolv.conf` may be a stub rather than the direct upstream DNS list. Added a qualifier that the file check applies when the resolver writes DNS directly there.

## Review Notes
- `radvd` and `radvdump` were not installed in the local environment, so radvd syntax was validated against the current man page rather than by running the daemon's config parser.
- The Linux verification commands were checked against installed `resolvectl`, `nmcli`, and `tcpdump` help output.
- Cisco RA DNS syntax varies materially across IOS XE, IOS XR, NX-OS, and Catalyst release trains; the post now avoids presenting one command form as universal.
