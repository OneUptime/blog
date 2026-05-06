# Validation Summary: How to Configure DNS for IPv6 on Home Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS
- AAAA records
- RDNSS / Router Advertisements
- DHCPv6
- OpenWrt
- Pi-hole
- dnsmasq
- `dig`
- `resolvectl`
- `scutil`
- Unbound
- DNSSEC

## Sources Consulted
- RFC 8106: IPv6 Router Advertisement Options for DNS Configuration — https://www.rfc-editor.org/rfc/rfc8106
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://www.rfc-editor.org/rfc/rfc9915.html
- OpenWrt DHCP and DNS configuration — https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt odhcpd reference — https://openwrt.org/docs/techref/odhcpd
- Pi-hole `pihole` command docs — https://docs.pi-hole.net/main/pihole-command/
- Pi-hole upstream DNS providers — https://docs.pi-hole.net/guides/dns/upstream-dns-providers/
- Pi-hole router IPv6 guidance — https://docs.pi-hole.net/routers/fritzbox/
- dnsmasq man page — https://dnsmasq.org/docs/dnsmasq-man.html
- BIND 9 `dig` man page — https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- systemd `resolvectl` man page — https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- macOS `scutil` man page — https://keith.github.io/xcode-man-pages/scutil.8.html
- Unbound configuration reference — https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Cloudflare 1.1.1.1 IP addresses — https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- Quad9 service addresses — https://quad9.net/service/service-addresses-and-features/
- Google Public DNS FAQ — https://developers.google.com/speed/public-dns/faq?hl=en

## Issues Found
- The post cited `RFC 6106` for RDNSS and used an outdated OpenWrt example. I corrected the reference to `RFC 8106` and replaced the sample with current `/etc/config/dhcp` / `odhcpd` settings that actually advertise IPv6 DNS information on modern OpenWrt.
- The introduction implied that DNS servers must be reachable over IPv6 in order to return AAAA records. I corrected this so it accurately distinguishes between returning AAAA answers and reaching the resolver itself over IPv6.
- The DHCPv6 compatibility text overstated client support. I changed it to note that support varies and that RDNSS remains important for compatibility.
- The Pi-hole section used invalid example IPv6 literals such as `2001:db8:home::2`, pointed readers to `setupVars.conf` for IPv6 listening, and used `pihole restartdns`. I replaced those with valid documentation-prefix examples and an official `systemctl restart pihole-FTL.service` restart command after configuration changes.
- The router snippet for advertising the Pi-hole used placeholder pseudo-syntax rather than a valid configuration example. I replaced it with a valid `list dns` example.
- The `dnsmasq` example used `aaaa-record`, which is not a documented dnsmasq option, and used `rev-server` in a way that did not match the surrounding explanation. I replaced those lines with documented `host-record` entries, which add AAAA and PTR data as intended.
- The Linux verification command used `systemd-resolve --status`, while current systemd documentation centers on `resolvectl status`. I updated the test command accordingly and also corrected the invalid example IPv6 address.
- The Unbound example enabled both IPv4 and IPv6 transport but only declared an IPv6 listener. I added `interface: 0.0.0.0` so the dual-stack example is explicit.

## Review Notes
- The post is technically correct after the fixes above.
- OpenWrt IPv6 behavior varies somewhat by release, but the corrected router example matches the current `odhcpd`-based documentation rather than older `radvd`-style examples.
- The examples use `2001:db8::/32`, which is reserved for documentation. Readers should replace it with their actual global or ULA prefix when applying the configuration.
