# Validation Summary: How to Analyze IPv6 TCP Connections in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filters, TCP analysis, stream graphs)
- tshark (CLI packet analyzer)
- TCP protocol (handshake, flags, MSS option, analysis fields)
- IPv6 addressing (documentation prefix 2001:db8::/32 per RFC 3849)
- awk (stream processing)

## Sources Consulted
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark IPv6 display filter reference: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark User's Guide — TCP Stream Graphs: https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs.html
- tshark man page: https://www.wireshark.org/docs/man-pages/tshark.html
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation
- RFC 793 / RFC 9293 — TCP protocol specification (MSS, 3-way handshake)

## Issues Found
1. **Invalid IPv6 placeholder addresses.** The post used addresses containing non-hex characters (e.g., `2001:db8::web`, `2001:db8::client`, `2001:db8::scanner`). IPv6 hextets only accept `0-9` and `a-f`, so these would fail to parse in Wireshark display filters. Replaced with valid documentation-range addresses: `2001:db8::1`, `2001:db8::2`, and `2001:db8::bad` respectively.
2. **Deprecated `tcp.options.mss` filter.** The field `tcp.options.mss` is a label type deprecated after Wireshark 2.2.17 and no longer present in modern versions. The current field to test MSS option presence is `tcp.options.mss_val` (the unsigned 16-bit value field, which is truthy when present). Updated the presence-check filter accordingly. The subsequent `tcp.options.mss_val < 1440` and `tcp.options.mss_val == 1440` filters were already using the correct field name.

## Review Notes
- MSS arithmetic is correct: 1500 MTU − 40 byte IPv6 header − 20 byte TCP header = 1440 bytes.
- `tcp.time_relative` is measured from the first frame in the TCP stream, so averaging it across SYN-ACK packets (as in the tshark example) does yield an approximation of initial RTT per connection. Requires the "Calculate conversation timestamps" TCP preference, which is enabled by default.
- `tcp.analysis.reused_ports` is a valid expert-info filter and fires when a new SYN reuses a recently seen 4-tuple.
- The phrase "RTT: latency between SYN and SYN-ACK" describes only the initial RTT; Wireshark's TCP graphs report per-segment RTT throughout the stream. Not incorrect, but readers should know RTT is measured continuously, not just at handshake.
