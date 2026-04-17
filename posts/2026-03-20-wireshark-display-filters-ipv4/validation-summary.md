# Validation Summary: How to Apply Display Filters for IPv4 Traffic in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filter language)
- IPv4 networking
- TCP, UDP, ICMP, DNS protocols
- HTTP protocol inspection
- PCAP file handling

## Sources Consulted
- Wireshark Display Filter Reference - IP: https://www.wireshark.org/docs/dfref/i/ip.html
- Wireshark Display Filter Reference - TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark Display Filter Reference - Frame: https://www.wireshark.org/docs/dfref/f/frame.html
- Wireshark Display Filter Reference - HTTP: https://www.wireshark.org/docs/dfref/h/http.html
- Wireshark User's Guide, Chapter 6 "Working with captured packets" (Filtering packets while viewing): https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html
- Wireshark User's Guide, Export Specified Packets: https://www.wireshark.org/docs/wsug_html_chunked/ChIOExportSection.html
- RFC 791 (Internet Protocol) - for IPv4 header field semantics
- RFC 2474 (DSCP) - for EF (46) codepoint semantics

## Issues Found
No technical issues found.

All filter expressions and field names were verified against the official Wireshark display filter reference:

- `ip`, `ipv6`, `ip.src`, `ip.dst`, `ip.addr` — correct field names; CIDR notation (e.g. `ip.addr == 192.168.1.0/24`) is supported in the display filter language.
- `tcp`, `udp`, `icmp`, `dns`, `tcp.port`, `tcp.dstport`, `tcp.srcport` — correct.
- `tcp.flags.syn`, `tcp.flags.ack`, `tcp.flags.reset`, `tcp.flags.fin` — correct (these match Wireshark's TCP flag field names).
- `ip.ttl`, `ip.hdr_len`, `ip.dsfield.dscp`, `ip.flags.mf`, `ip.flags.df`, `ip.frag_offset` — correct field names.
- `ip.hdr_len > 20` correctly identifies packets carrying IP options (base header is 20 bytes).
- `ip.dsfield.dscp == 46` correctly corresponds to Expedited Forwarding (RFC 2474).
- `frame contains`, `frame matches "(?i)..."`, `http.request.method`, `http.response.code` — all correct syntax.
- The Export Specified Packets workflow (`File → Export Specified Packets`) is accurate.

## Review Notes
- The section "All TCP connection initiation" uses `tcp.flags.syn == 1`, which will match both SYN and SYN-ACK packets. The surrounding context makes this clear, but readers unfamiliar with the three-way handshake could misread it. Not a technical error.
- `ip.ttl == 64` is described as "Linux source TTL" — this is the commonly observed default for Linux, though the initial TTL is configurable via `/proc/sys/net/ipv4/ip_default_ttl`. The statement is accurate as a heuristic.
- The `dns` filter is described as equivalent to `udp.port == 53 or tcp.port == 53` — in practice Wireshark's `dns` dissector also matches mDNS (port 5353) and LLMNR when enabled, so the equivalence is an approximation. Not worth changing; the intent is clear.
