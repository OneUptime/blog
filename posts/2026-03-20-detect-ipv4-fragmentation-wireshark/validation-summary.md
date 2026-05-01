# Validation Summary: How to Detect IPv4 Fragmentation in Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv4
- Wireshark
- tcpdump
- ping
- Path MTU Discovery (PMTUD)

## Sources Consulted
- Wireshark Display Filter Reference: IPv4 (`ip.flags.df`, `ip.flags.mf`, `ip.frag_offset`, `ip.len`, `ip.reassembled_in`) — https://www.wireshark.org/docs/dfref/i/ip.html
- Wireshark Display Filter Reference: Frame (`frame.len`) — https://www.wireshark.org/docs/dfref/f/frame.html
- Wireshark Display Filter Reference: TCP (`tcp.analysis.retransmission`) — https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User's Guide: Expert Info dialog — https://www.wireshark.org/docs/wsug_html/
- Wireshark User's Guide: IPv4 Statistics menu — https://www.wireshark.org/docs/wsug_html/
- Wireshark Wiki: IP Reassembly behavior — https://wiki.wireshark.org/IP_Reassembly
- RFC 791: Internet Protocol (fragment offset, MF/DF semantics, 8-byte fragment units) — https://www.rfc-editor.org/rfc/rfc791.html
- RFC 1191: Path MTU Discovery (ICMP type 3, code 4) — https://www.rfc-editor.org/rfc/rfc1191.html
- `ping(8)` man page (`-s`, `-4`, `-M dont`) — https://man7.org/linux/man-pages/man8/ping.8.html
- `pcap-filter(7)` man page (fragment filter expression details) — https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tcpdump(8)` man page (verbose IPv4 fragment output format) — https://www.man7.org/linux/man-pages/man8/tcpdump.8.html

## Issues Found
1. The post used `frame.len > 1500` as an MTU heuristic. That is not the correct IPv4 MTU indicator because `frame.len` includes link-layer framing. I changed it to `ip.len > 1500`, which matches IPv4 total length and the Ethernet MTU discussion.
2. The Wireshark fragment walkthrough showed reassembly as a separate new frame. Wireshark's documented IP reassembly defers upper-layer dissection until reassembly completes and shows the reassembled payload in the packet where reassembly completes, typically the last fragment. I corrected that explanation.
3. The `ping` example did not explicitly disable DF, so it would not reliably force local fragmentation on current Linux `ping`. I changed it to `ping -4 -M dont -s 2000 -c 5 ...` and clarified the 1500-byte IPv4 MTU assumption.
4. The `tcpdump` "expected output" example did not match how `tcpdump -v` documents IPv4 fragment formatting. I replaced it with an accurate description of the fragment pattern to look for: offset `0` for the first fragment, non-zero offsets for later fragments, and MF cleared on the last fragment.
5. The Wireshark UI text around Expert Info and IPv4 Statistics was too specific in places and partly inaccurate. I corrected the menu name to `Analyze → Expert Info`, made the reassembly warnings description generic but accurate, and fixed the IPv4 Statistics claim to packet and byte counts by address rather than fragment counts.
6. The MTU black-hole filter used `frame.len > 1400`, which again mixes link-layer and IP-layer size. I changed it to `ip.len > 1400` and updated the follow-up explanation to refer to larger IP packets rather than larger frames.
7. The conclusion implied a router specifically must be fragmenting. I adjusted that sentence to the more accurate statement that fragmentation occurred between the two capture points because the outbound MTU was smaller than the original packet.

## Review Notes
- The main Wireshark display filters in the post are valid in current Wireshark releases.
- `icmp.type == 3 and icmp.code == 4` is the correct IPv4 PMTUD filter for "fragmentation needed and DF set" messages.
- The fragment offset explanation (`185 × 8 = 1480 bytes`) is correct per RFC 791.
- MSS clamping is TCP-specific, so the conclusion now refers to reducing TCP MSS or enabling MSS clamping rather than implying it is a generic fix for all fragmented traffic.
