# Validation Summary: How to Understand Extension Header Drop Rates in Production Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 Extension Headers
- ICMPv6
- Path MTU Discovery
- Linux networking tools (`ping`, `traceroute`, `tcpdump`, `ip6tables`)
- Python `subprocess`

## Sources Consulted
- RFC 7872, "Observations on the Dropping of Packets with IPv6 Extension Headers in the Real World" https://www.rfc-editor.org/rfc/rfc7872
- RFC 7045, "Transmission and Processing of IPv6 Extension Headers" https://www.rfc-editor.org/rfc/rfc7045
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 5095, "Deprecation of Type 0 Routing Headers in IPv6" https://www.rfc-editor.org/rfc/rfc5095
- RFC 8900, "IP Fragmentation Considered Fragile" https://www.rfc-editor.org/rfc/rfc8900
- RFC 9098, "Operational Implications of IPv6 Packets with Extension Headers" https://www.rfc-editor.org/rfc/rfc9098.html
- RFC 9288, "Recommendations on the Filtering of IPv6 Packets Containing IPv6 Extension Headers at Transit Routers" https://www.ietf.org/rfc/rfc9288.html
- RFC 3810, "Multicast Listener Discovery Version 2 (MLDv2) for IPv6" https://www.rfc-editor.org/rfc/rfc3810.html
- `ping(8)` man page https://man7.org/linux/man-pages/man8/ping.8.html
- `traceroute(8)` man page https://man7.org/linux/man-pages/man8/traceroute.8.html
- Local CLI help output: `ping6 -h`
- Local CLI help output: `ip6tables -m frag -h`
- Local CLI help output: `tcpdump --help`

## Issues Found
- The drop-rate table mixed RFC-backed measurements with unsupported Internet-wide percentages for Routing, AH, and ESP. I replaced those rows with RFC-backed policy statements and updated the measured Fragment, Hop-by-Hop, and Destination Options ranges to align with RFC 7872.
- The Hop-by-Hop row said high drop rates were "critical - breaks MLD", which was misleading in the context of Internet-path measurements because MLD is link-local and explicitly requires Hop-by-Hop Router Alert on-hop. I removed that claim.
- The `ping6 -s 1400 -M want` example did not reliably force fragmentation on a typical 1500-byte path and overstated what the test proves. I changed it to `ping -6 -s 2000 -M want` and clarified that it is only a coarse fragmentation-related probe.
- The `traceroute6 -n -f 44` example was incorrect because `-f` controls the first hop/TTL, not an IPv6 Fragment Header. I replaced it with a baseline `traceroute -6 -n` example and noted that packet crafting is required to localize extension-header-specific drops.
- The Python snippet was presented as an extension-header probe, but it only wrapped `ping6`, included an unused import, and did not test arbitrary extension headers. I rewrote it as a coarse fragmentation reachability probe whose code and output now match its actual behavior.
- The operational guidance said RFC 7045 "requires allowing most extension headers" and that TCP "handles fragmentation at the app level". I corrected both statements to match RFC 7045's default-policy language and the actual transport/PMTU behavior described in RFC 8200 and RFC 8900.
- The self-test section claimed local `ip6tables`/`tcpdump` checks could show whether external hosts or an ISP were forwarding fragments. I replaced that with a correct local capture example and an explicit note that end-to-end validation requires observation on the far side.

## Review Notes
- The post is now technically sound, but exact public-Internet drop rates remain highly measurement-dependent and should be treated as examples, not universal constants.
- The command examples are Linux-centric. Equivalent tooling and flags differ on BSD, macOS, and Windows.
