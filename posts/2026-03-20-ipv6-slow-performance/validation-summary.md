# Validation Summary: How to Troubleshoot IPv6 Slow Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4
- ICMPv6
- Path MTU Discovery (PMTUD)
- TCP diagnostics
- Happy Eyeballs
- `curl`
- `iperf3`
- `ping`
- `mtr`
- `traceroute`
- `ss`
- `ethtool`
- `ip6tables`

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201, "Path MTU Discovery for IP version 6" https://www.rfc-editor.org/rfc/rfc8201.html
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" https://www.rfc-editor.org/rfc/rfc4443
- RFC 4291, "IP Version 6 Addressing Architecture" https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 8305, "Happy Eyeballs Version 2: Better Connectivity Using Concurrency" https://www.rfc-editor.org/rfc/rfc8305.html
- curl command-line manpage, `--happy-eyeballs-timeout-ms` https://curl.se/docs/manpage.html
- libcurl `CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS` documentation https://curl.se/libcurl/c/CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS.html
- iperf3 official documentation, "Invoking iperf3" https://software.es.net/iperf/invoking.html
- `ping(8)` Linux manual page https://man7.org/linux/man-pages/man8/ping.8.html
- `ss(8)` Linux manual page https://man7.org/linux/man-pages/man8/ss.8.html
- `traceroute(8)` Linux manual page https://man7.org/linux/man-pages/man8/traceroute.8.html
- `ethtool(8)` Linux manual page https://man7.org/linux/man-pages/man8/ethtool.8.html
- `tcp(7)` Linux manual page https://man7.org/linux/man-pages/man7/tcp.7.html
- Local `mtr --help` output from the installed CLI, which confirms `-4` and `-6` are valid and `--ipv4` / `--ipv6` are not
- Local `ip6tables -p icmpv6 -h` output from the installed CLI, which confirms `--icmpv6-type 2` / `packet-too-big`
- Live `curl -4 -I` and `curl -6 -I` verification of `https://speed.cloudflare.com/__down?bytes=...` on 2026-04-29

## Issues Found
- The original `mtr --report --ipv4` and `mtr --report --ipv6` examples were invalid for current `mtr`; I changed them to `mtr -n -r -4` and `mtr -n -r -6` based on the installed CLI help.
- The MTU test treated `ping -s` as if it set total packet size. On Linux `ping -s` sets payload bytes, so I changed the test to use correct ICMPv6 payload sizes (`1232` for a 1280-byte IPv6 packet and `1452` for a 1500-byte IPv6 packet) and added `-M do` so the probe is useful for PMTUD troubleshooting.
- The original MTU section used `ping6`; I updated those examples to `ping -6`, which matches current `ping(8)` documentation and keeps the syntax consistent with the rest of the post.
- The Step 4 `ss` example filtered on `2001:4860:4860::8888`, which is a Google Public DNS address and not a realistic established TCP session target for this workflow. I changed it to inspect active established IPv6 TCP sessions instead.
- The traceroute section suggested looking for `::ffff:IPv4` hops. RFC 4291 defines those as IPv4-mapped IPv6 addresses used for address representation, not as a reliable traceroute indicator for tunneled IPv6 paths, so I replaced that guidance with accurate path-comparison language.
- The Happy Eyeballs section used `curl -6` and `curl -4` as its main test commands. Those flags force a single address family and therefore disable Happy Eyeballs behavior, so I added a dual-stack `curl` example for the actual fallback test and kept forced-family commands only for side-by-side timing comparison.
- The Happy Eyeballs timing note was too absolute. RFC 8305 recommends a 250 ms connection-attempt delay, but application defaults vary; curl's current documentation states a 200 ms default, so I corrected the wording.
- The Step 1 download URLs were not a stable documented curl download target for comparing IPv4 and IPv6 transfers. I replaced them with a live dual-stack download endpoint that I verified over both IPv4 and IPv6.
- The Step 6 text described TSO as if it were IPv6-specific, but `ethtool -K ... tso/gso` changes NIC offload features generally. I corrected the wording and aligned the `iperf3` client hostname with the earlier examples.

## Review Notes
- The post is technically sound after the corrections above.
- The guide is Linux-specific. Commands such as `ip6tables`, `ss`, `ethtool`, GNU `tail -n +2`, and the `net.ipv4.tcp_*` sysctls are not portable to macOS or BSD without adaptation.
