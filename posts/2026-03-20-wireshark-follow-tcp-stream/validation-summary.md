# Validation Summary: How to Follow a TCP Stream in Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (Follow Stream feature)
- TCP (stream reassembly, handshake flags)
- HTTP (request/response debugging)
- UDP, TLS, HTTP/2, QUIC (other follow-stream protocols)
- Wireshark display filters (`tcp.stream`, `http.request.uri`)

## Sources Consulted
- [Wireshark User's Guide — 7.2 Following Protocol Streams](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html)
- Wireshark Follow Stream supported protocols reference (TCP, UDP, DCCP, TLS, HTTP, HTTP/2, QUIC, SIP)

## Issues Found
- **Reversed stream color coding.** The post originally stated that blue represents client-to-server and red represents server-to-client. Per the official Wireshark User's Guide, the defaults are the opposite: **red** is client-to-server (forward direction) and **blue** is server-to-client (reverse direction). Swapped the two labels.
- **Fabricated third color.** The post listed `Black → Bidirectional mixed` as a color-coding option. Wireshark's Follow Stream dialog only uses two direction colors (red/blue); there is no "black/bidirectional" coloring. Removed this line.
- **Example block mismatched corrected colors.** The illustrative HTTP GET example tagged the request `[Blue]` and the response `[Red]`. Updated to `[Red]` for the outbound GET and `[Blue]` for the inbound 200 OK so it matches the corrected coloring rules.

## Review Notes
- The "Show data as" list is a subset of what Wireshark actually offers (ASCII, C Arrays, EBCDIC, Hex Dump, UTF-8, UTF-16, YAML, Raw). The subset shown in the post is accurate; it just omits EBCDIC, UTF-8, and UTF-16, which is fine for an introductory tutorial.
- Menu paths (`Analyze → Follow → TCP Stream`, right-click path, `tcp.stream == N` filter) and the TCP flag descriptions (SYN, SYN-ACK, ACK, PSH-ACK, FIN-ACK, RST) are all correct.
- TLS/HTTP/2/QUIC/UDP follow options listed in the final section are all valid menu entries in current Wireshark builds.
