# Validation Summary: How to Generate IPv6 Conversation Statistics in Wireshark

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Wireshark (GUI)
- tshark (CLI)
- IPv6 (RFC 8200)
- Wireshark display filter language (`ipv6`, `ipv6.src`, `ipv6.dst`, `ipv6.addr`, `ipv6.nxt`, `tcp.port`)
- tshark statistics taps (`-z conv,ipv6`, `-z endpoints,ipv6`)
- awk/sort for text post-processing
- IANA Protocol Numbers (TCP=6, UDP=17, ICMPv6=58)

## Sources Consulted
- Wireshark tshark manual: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Statistics documentation: https://www.wireshark.org/docs/wsug_html_chunked/ChStatistics.html
- Wireshark Display Filter Reference (IPv6): https://www.wireshark.org/docs/dfref/i/ipv6.html
- IANA Protocol Numbers: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- RFC 8200 (IPv6 specification, Next Header field)

## Issues Found
1. **Invalid IPv6 address literal**: `2001:db8:clients::/64` is not a valid IPv6 address — letters `l`, `i`, `n`, `t`, `s` are not valid hexadecimal digits. Replaced with `2001:db8:1::/64`, a valid documentation prefix that matches the author's intent.
2. **Incorrect awk column indexes in the security use-case section**: `tshark -z conv,ipv6` outputs columns in this order: `$1` source address, `$2` `<->`, `$3` destination address, `$4`/`$5` `<-` frames/bytes, `$6`/`$7` `->` frames/bytes, `$8` total frames, `$9` total bytes, `$10` relative start, `$11` duration. The original commands compared `$3` (destination address) as a packet count and `$7` (bytes `->`) as duration, which does not match the author's stated intent. Updated the filters to use `$8` (total frames) and `$11` (duration), and added a comment documenting the column layout.
3. **Wrong sort column for endpoint bytes**: `tshark -z endpoints,ipv6` emits columns `$1` address, `$2` packets, `$3` bytes, `$4` tx packets, `$5` tx bytes, `$6` rx packets, `$7` rx bytes. The original `sort -k4 -rn` with the comment "column 4 is bytes" actually sorted by tx packets. Changed to `sort -k3 -rn` and updated the comment.

## Review Notes
- The Wireshark GUI navigation (Statistics → Conversations, IPv6 tab, Statistics → I/O Graph) is accurate for current Wireshark 4.x releases.
- The tshark `-z conv,ipv6` / `-z endpoints,ipv6` taps, `-q` silent mode, and `-Y` display filter flag are all current and correct.
- The protocol numbers used in the `ipv6.nxt` example (6=TCP, 17=UDP, 58=ICMPv6) match IANA's assignments. Note that `ipv6.nxt` reflects the value of the Next Header field in the IPv6 header itself, so when IPv6 extension headers are present (e.g., Fragment, Routing, Hop-by-Hop) it will show the extension-header protocol number rather than the ultimate upper-layer protocol. This is acceptable for an introductory blog post.
- The `gsub(/<->/,"")` step in the CSV export relies on awk re-splitting `$0` after field modification (standard behavior in POSIX awk and gawk), which is correct.
- `NR>5` as a header skip is a reasonable heuristic for current tshark output but may require adjustment if future versions change the header line count. Not worth flagging in the post.
