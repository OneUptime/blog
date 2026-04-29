# Validation Summary: How to Understand RFC 9098 Operational Implications of Extension Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 extension headers
- RFC 9098
- RFC 7872
- RFC 8200
- RFC 8201
- RFC 7045
- RFC 5095
- ICMPv6
- Linux networking tools: ping, tracepath, tcpdump

## Sources Consulted
- RFC 9098, Operational Implications of IPv6 Packets with Extension Headers: https://www.rfc-editor.org/info/rfc9098
- RFC 7872, Observations on the Dropping of Packets with IPv6 Extension Headers in the Real World: https://www.rfc-editor.org/info/rfc7872
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/info/rfc8200
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/info/rfc8201
- RFC 7045, Transmission and Processing of IPv6 Extension Headers: https://www.rfc-editor.org/info/rfc7045
- RFC 5095, Deprecation of Type 0 Routing Headers in IPv6: https://www.rfc-editor.org/info/rfc5095
- RFC 3810, Multicast Listener Discovery Version 2 (MLDv2) for IPv6: https://www.rfc-editor.org/info/rfc3810
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/info/rfc4890
- `ping(8)` iputils manual: https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` iputils manual: https://man7.org/linux/man-pages/man8/tracepath.8%40%40iputils.html
- `tcpdump(8)` manual: https://www.man7.org/linux/man-pages/man8/tcpdump.8.html
- Local command help/output checked for `ping -h`, `tracepath -h`, and `tcpdump --help`

## Issues Found
- The post attributed exact extension-header drop measurements directly to RFC 9098. I corrected the attribution so the article now states that RFC 9098 summarizes measurement work such as RFC 7872.
- The original Fragment Header explanation incorrectly said Fragment Header drops break IPv6 Path MTU Discovery. I changed this to distinguish PMTUD from source fragmentation: PMTUD depends on ICMPv6 Packet Too Big messages, while Fragment Headers matter only when the source fragments.
- The Routing Header section overstated that Types 2/3/4 "should be forwarded" without qualification. I replaced this with the RFC 5095/RFC 7045 guidance that RH0 filtering must not become a blanket NH=43 drop policy.
- The Hop-by-Hop section used outdated behavior from RFC 2460 as if it were still the current rule and cited a nonexistent "RFC 9098 Section 2.1". I corrected the text to reflect RFC 8200's relaxed processing rule and removed the bad section reference.
- The operator recommendations code block included unsupported specifics, including a made-up `~100 pps per source` rate limit, an incorrect claim that Fragment Headers are required for PMTUD, and an over-strong claim that AH is required. I replaced these with source-backed, policy-level guidance.
- The measurement commands were technically wrong. `BASELINE_LOSS=$?` and `FRAGMENT_LOSS=$?` captured exit codes, not loss rates; the chosen `ping6` sizes did not actually test what the text claimed; and `kill %1` depended on job control. I replaced the snippet with current `ping -6` / `tracepath -6` examples and a safer `tcpdump` background-process pattern, and I noted that real Fragment Header survivability testing requires crafted packets as in RFC 7872.

## Review Notes
- The post is now technically accurate for its stated scope, but two newer documents are relevant for future maintenance: RFC 9673 (October 2024) updates operational procedures for Hop-by-Hop processing, and RFC 9805 (June 2025) deprecates the IPv6 Router Alert Option for new protocols while preserving existing uses such as MLD.
