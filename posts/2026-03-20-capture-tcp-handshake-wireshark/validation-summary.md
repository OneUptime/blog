# Validation Summary: How to Capture and Analyze a TCP Handshake with Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wireshark
- TShark
- tcpdump
- TCP
- Packet capture and packet analysis

## Sources Consulted
- Wireshark Display Filter Reference: TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User's Guide, Following Protocol Streams: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html
- Wireshark User's Guide, Conversations: https://www.wireshark.org/docs/wsug_html_chunked/ChStatConversations
- Wireshark User's Guide, TCP Stream Graphs: https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs
- `tshark(1)` manual: https://www.wireshark.org/docs/man-pages/tshark.html
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293.html
- RFC 7323, TCP Extensions for High Performance: https://www.rfc-editor.org/rfc/rfc7323.html
- RFC 2018, TCP Selective Acknowledgment Options: https://www.rfc-editor.org/rfc/rfc2018.html
- Local `tcpdump(8)` and `pcap-filter(7)` manual pages

## Issues Found
- The initial Wireshark display filter used `tcp.flags.syn == 1`, which hides the third ACK of the handshake in the packet list. I changed it to `tcp.port == 80` so the full handshake remains visible while still narrowing the capture view to the target port.
- The `tcp.stream eq 0` example was described as showing only the handshake, but Wireshark uses `tcp.stream` to isolate the full TCP conversation for that stream. I corrected the description to match Wireshark behavior.
- The SYN packet details said `Maximum segment size` was "negotiated here". Per RFC 9293, MSS is advertised in SYN segments rather than negotiated as a single value in one packet. I changed the wording to "advertised by this sender".
- The timing explanation treated SYN-to-SYN-ACK delay as pure server processing time. In practice it also includes path latency and depends on capture location. I corrected the explanation accordingly.
- The graph menu label used `Time-Sequence (Stevens)`, but Wireshark documents this as `Time Sequence (Stevens)`. I corrected the UI label.
- The `tshark` example used `tcp.options.mss`, which is not the MSS value field in current Wireshark field definitions. I changed it to `tcp.options.mss_val`.
- The conclusion repeated the inaccurate server-processing interpretation and implied MSS was a negotiated option in the same way as other handshake capabilities. I revised the wording to reflect the RFC behavior.

## Review Notes
- The post is technically relevant and salvageable; only minor accuracy fixes were needed.
- The example `tshark -Y "tcp.flags.syn==1"` intentionally matches both SYN and SYN-ACK packets because both have the SYN bit set.
- Handshake timing can look different depending on whether the capture is taken on the client, server, or an intermediate device.
