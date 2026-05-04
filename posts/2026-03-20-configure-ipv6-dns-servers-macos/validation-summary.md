# Validation Summary: How to Configure IPv6 DNS Servers on macOS

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- macOS `networksetup` CLI
- macOS System Settings (Network preferences UI)
- `scutil --dns` resolver inspection
- `dig`, `host`, `nslookup` DNS lookup utilities
- `tcpdump` packet capture
- `dscacheutil` and `mDNSResponder` (macOS DNS cache)
- IPv6 DNS service addresses (Google Public DNS, Cloudflare, Quad9, OpenDNS)

## Sources Consulted
- macOS `networksetup(8)` man page (`-setdnsservers`, `-getdnsservers`, `-setsearchdomains`, `-getsearchdomains`, "empty" sentinel)
- Apple Support: configuring DNS in System Settings → Network → Details → DNS
- macOS `scutil(8)` man page (`--dns` option)
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using (2001:4860:4860::8888 / ::8844)
- Cloudflare 1.1.1.1 documentation: https://developers.cloudflare.com/1.1.1.1/ (2606:4700:4700::1111 / ::1001)
- Quad9 documentation: https://quad9.net/service/service-addresses-and-features (2620:fe::fe / 2620:fe::9)
- OpenDNS / Cisco Umbrella documentation for IPv6 (2620:119:35::35 / 2620:119:53::53)
- `dig(1)`, `host(1)`, `nslookup(1)` man pages
- `tcpdump(1)` man page and pcap-filter(7) BPF syntax for `port 53 and ip6`
- macOS DNS cache flush guidance: `dscacheutil -flushcache` + `killall -HUP mDNSResponder`

## Issues Found
No technical issues found.

All `networksetup` invocations use correct subcommands and argument forms. Mixing IPv4 and IPv6 DNS addresses in a single `-setdnsservers` call is supported, and `"empty"` is the correct sentinel to clear DNS overrides and fall back to DHCP/RA. The four well-known IPv6 resolver address pairs (Google, Cloudflare, Quad9, OpenDNS) are all current and correctly formatted. The `dig`, `host`, `nslookup`, `scutil --dns`, `tcpdump`, `dscacheutil`, and `killall -HUP mDNSResponder` commands are all valid on current macOS versions.

## Review Notes
- The "Configure DNS via System Settings" block is fenced as ```sql```, which is misleading because the content is plain prose, not SQL. This is purely a syntax-highlighting hint and does not affect the technical correctness of the instructions, so it was left unchanged per the "fix technical errors only" guidance.
- `networksetup` requires the network service name exactly as listed by `networksetup -listallnetworkservices`; "Wi-Fi" and "Ethernet" are the typical defaults but may differ on systems with renamed services or USB/Thunderbolt adapters. Worth a future note for readers.
- `nslookup` is considered legacy; `dig` or `host` are generally preferred. Including all three is fine for completeness.
- `dscacheutil -flushcache` alone is often insufficient on modern macOS; the post correctly pairs it with `killall -HUP mDNSResponder`.
- The tcpdump filter `'port 53 and ip6'` correctly captures DNS traffic carried over IPv6 only, which is the desired check for verifying DNS-over-IPv6 transport.
