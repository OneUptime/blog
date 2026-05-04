# Validation Summary: How to Configure IPv6 on Google Wifi/Nest Wifi

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 (DHCPv6, SLAAC, Router Advertisements, Prefix Delegation)
- Google Wifi / Nest Wifi / Nest Wifi Pro
- Google Home app (Advanced Networking, Port Management, DNS)
- Google Public DNS (IPv4 and IPv6)
- Shell verification tools (ifconfig, ipconfig, findstr)
- test-ipv6.com online verification

## Sources Consulted
- [Google Nest Help - IPv6](https://support.google.com/googlenest/answer/6361450) — Confirms DHCPv6, SLAAC, prefix delegation, dual-stack only, no 6to4/6rd, custom IPv6 DNS support
- [Google Nest Help - Port forwarding / Port opening](https://support.google.com/googlenest/answer/6274503) — Confirms IPv6 Port Opening exists alongside IPv4 Port Forwarding under Port Management
- [Google Nest Help - Change your DNS server](https://support.google.com/googlenest/answer/6274141) — Confirms Custom DNS supports separate primary/secondary entries for IPv4 and IPv6
- [Google Public DNS docs](https://developers.google.com/speed/public-dns/docs/using) — Confirms `2001:4860:4860::8888` / `2001:4860:4860::8844` as the IPv6 DNS endpoints
- RFC 4291 (IP Version 6 Addressing Architecture) — Confirms global unicast 2000::/3 range covers addresses starting with hex `2` or `3`

## Issues Found

1. **"What you cannot configure directly" — Firewall rules for IPv6 (Step 2)**
   - The original claim that IPv6 firewall rules cannot be configured was inaccurate. Google Wifi/Nest Wifi exposes **Port Opening (IPv6)** under Port Management, which is effectively a firewall pinhole rule.
   - Updated the bullet to clarify only the default deny-inbound policy is non-configurable; you can punch holes via Port Opening. Also added a note that only dual-stack is supported (no IPv6-only, 6to4, or 6rd transition protocols), which is documented in Google's IPv6 help.

2. **Custom DNS IPv6 support note (Step 4)**
   - The original note claimed "Custom DNS in Google Home only accepts IPv4 addresses in some app versions" and suggested falling back to ISP DNS. According to Google's official DNS docs, Custom DNS supports both IPv4 and IPv6 primary/secondary entries.
   - Updated the note to reflect current behavior and to advise updating the Google Home app if the IPv6 fields are missing.

3. **Port Forwarding terminology and path (Step 5)**
   - The original stated "Use the Port Forwarding feature in Google Home app (this works for both IPv4 and IPv6 in newer firmware)" — Google actually uses distinct terminology: **Port forwarding (IPv4)** vs **Port opening (IPv6)**, both reached under **Advanced Networking → Port management**.
   - Replaced with the correct path and terminology, plus a note that IPv6 doesn't use NAT (pinhole rather than translation).

## Review Notes

- The shell snippets (`ifconfig | grep "inet6" | grep -v "fe80" | grep -v "::1"` and `ipconfig | findstr "IPv6 Address"`) are correct and produce the intended output on macOS/Linux and Windows respectively. Note that on modern Linux distributions `ifconfig` may not be installed by default; `ip -6 addr show scope global` is the modern equivalent but the original command works where `net-tools` is installed.
- The global IPv6 prefix description ("starting with `2xxx:` or `3xxx:`") is technically correct per RFC 4291's 2000::/3 global unicast block, though in practice nearly all currently allocated space is within 2000::/4 (so addresses begin with `2`).
- The Google Public DNS addresses (`8.8.8.8`, `8.8.4.4`, `2001:4860:4860::8888`, `2001:4860:4860::8844`) are correct.
- The claim that Nest Wifi Pro handles prefix delegation more reliably is anecdotal but consistent with community reports; left as-is.
- The troubleshooting tip about Google Wifi "preferring IPv4 DNS may slow AAAA resolution" is somewhat speculative — DNS preference doesn't typically affect AAAA query latency materially. Left as-is since it is presented as a tip rather than a hard claim.
