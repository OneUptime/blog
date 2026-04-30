# Validation Summary: How to Debug ICMPv6 Issues with Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6 Neighbor Discovery (NDP)
- IPv6 Path MTU Discovery (PMTUD)
- Wireshark
- TShark
- tcpdump/libpcap capture filters

## Sources Consulted
- Wireshark Display Filter Reference: ICMPv6: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- Wireshark User’s Guide: https://www.wireshark.org/docs/wsug_html/
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- pcap-filter(7): https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The post referred to `Analyze → Follow → ICMPv6 Stream`, but Wireshark documents ICMPv6 support in `Statistics → Flow Graph` rather than a dedicated ICMPv6 follow-stream view. I replaced that workflow with the correct Flow Graph guidance.
- The PMTU section said a source should use `1280 with Fragment Header` after a PTB reporting MTU below 1280. Current IPv6 PMTU guidance in RFC 8200 and RFC 8201 says nodes must not reduce PMTU below the IPv6 minimum link MTU of 1280, so I corrected that explanation.
- The `tshark` example used `-e ipv6.dst` while claiming it showed the destination from the invoking packet inside an ICMPv6 error. I corrected it to `ipv6.dst#2`, which matches the embedded second IPv6 layer when Wireshark dissects one.
- A few explanations were too absolute or imprecise. I softened the “no PTB means PTB is blocked” claim, changed the packet-size check to `<= PTB MTU`, tightened the DAD filter with `ipv6.src == ::`, and fixed IPv6-specific placeholders in the filter examples.
- The statistics section overstated what some Wireshark views show. I corrected `Protocol Hierarchy` so it no longer claims to break traffic down by ICMPv6 type, and clarified that `Conversations → IPv6` should be interpreted with an `icmpv6` display filter applied.

## Review Notes
- TShark was not installed in the local review environment, so command and field validation was performed against Wireshark’s official Display Filter Reference and User’s Guide rather than by local execution.
- The display-filter fields used in the post, including `icmpv6.mtu` and `icmpv6.nd.ns.target_address`, are present in current Wireshark display-filter documentation.
- The `ipv6.dst#2` example depends on Wireshark decoding the original packet embedded in the ICMPv6 error as a second IPv6 layer; when that embedded header is absent or truncated, the field will be empty.
