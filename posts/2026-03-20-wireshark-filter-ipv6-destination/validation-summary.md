# Validation Summary: How to Filter IPv6 Packets by Destination Address in Wireshark

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Wireshark display filters
- IPv6 addressing (RFC 4291)
- IPv6 multicast addresses (RFC 4291, RFC 7346)
- BPF capture filters (pcap-filter syntax)
- tshark CLI
- ICMPv6, OSPFv3, MLDv2, DNS

## Sources Consulted
- [Wireshark Display Filter Reference – ipv6](https://www.wireshark.org/docs/dfref/i/ipv6.html)
- [Wireshark User's Guide – Building Display Filter Expressions](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)
- [pcap-filter(7) man page](https://www.tcpdump.org/manpages/pcap-filter.7.html)
- [tshark(1) man page](https://www.wireshark.org/docs/man-pages/tshark.html)
- [RFC 4291 – IP Version 6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291)
- [RFC 3849 – IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)](https://www.rfc-editor.org/rfc/rfc3849)
- [RFC 3810 – Multicast Listener Discovery Version 2 (MLDv2)](https://www.rfc-editor.org/rfc/rfc3810)
- [RFC 5340 – OSPF for IPv6](https://www.rfc-editor.org/rfc/rfc5340)
- [RFC 4193 – Unique Local IPv6 Unicast Addresses](https://www.rfc-editor.org/rfc/rfc4193)
- [IANA IPv6 Multicast Address Space Registry](https://www.iana.org/assignments/ipv6-multicast-addresses/ipv6-multicast-addresses.xhtml)

## Issues Found

Several IPv6 addresses in the original post used alphabetic labels containing characters that are not valid hexadecimal digits. IPv6 addresses only accept digits `0-9` and letters `a-f`, so these addresses were syntactically invalid and would be rejected by the Wireshark display filter parser.

- `2001:db8:web::1` → replaced with `2001:db8:abcd::1` (the letter `w` is not a valid hex digit).
- `2001:db8:web::/64` → replaced with `2001:db8:abcd::/64` (two occurrences: one in the display filter section and one in the BPF capture filter section).
- `2001:db8::webserver` → replaced with `2001:db8::beef` (`w`, `s`, `r` are not valid hex digits; also `webserver` exceeds the 4-hex-digit limit for a single group).
- `2001:db8::dns` → replaced with `2001:db8::53` (`n`, `s` are not valid hex digits).
- `2001:db8:clients::/64` → replaced with `2001:db8:1::/64` (`l`, `i`, `n`, `t`, `s` are not valid hex digits).
- `2001:db8:servers::/64` → replaced with `2001:db8:2::/64` (`s`, `r`, `v` are not valid hex digits).
- `2001:db8::web` → replaced with `2001:db8::beef` (`w` is not a valid hex digit).

Also corrected one wording inaccuracy: the filter `ipv6.dst == ff02::1:ff00:0/104` was described as matching "a specific solicited-node multicast address" when the `/104` prefix actually matches the entire solicited-node multicast address range. Updated the comment to read "any solicited-node multicast address".

## Review Notes

- The documentation prefix `2001:db8::/32` is correctly used throughout (per RFC 3849).
- Multicast group addresses are all accurate: `ff02::1` (all-nodes), `ff02::2` (all-routers), `ff02::5` (OSPFv3 AllSPFRouters), `ff02::6` (OSPFv3 AllDRouters), `ff02::16` (MLDv2 reports), `ff00::/8` (all IPv6 multicast).
- Wireshark supports CIDR notation on `ipv6.dst` and `ipv6.src` display filters (verified against official docs).
- BPF primitives `ip6 dst`, `ip6 dst net`, and `ip6 multicast` are all valid per pcap-filter.
- `tshark -r ... -Y ... -w ...` works in modern tshark (3.0+) without requiring the `-2` two-pass flag for simple display filters of this kind.
- The RFC 1918 reference in the comment on line about ULA traffic is slightly imprecise (RFC 1918 is IPv4-only; the relevant IPv6 RFC is RFC 4193), but the filter itself (`fc00::/7`) is correct and the comment mentions RFC 4193, so it was left unchanged.
- OSPFv3 `ff02::5`/`ff02::6` are labeled "all-routers" in the post; strictly `ff02::5` is AllSPFRouters and `ff02::6` is AllDRouters, but the grouping under a common header is acceptable shorthand and not technically wrong.
