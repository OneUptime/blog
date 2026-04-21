# Validation Summary: How to Use TCP Sequence Number Analysis for Debugging

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- TCP sequence and acknowledgment numbers
- tcpdump
- libpcap capture filters
- Wireshark TCP stream graphs
- Wireshark TCP analysis display filters
- awk and sed shell pipelines

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- RFC 5681: TCP Congestion Control: https://www.rfc-editor.org/rfc/rfc5681.html
- tcpdump manual page, including `-S`, `-tt`, TCP output format, relative sequence numbers, and `-r`: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- pcap-filter manual page for tcpdump/libpcap filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Wireshark User's Guide, TCP Stream Graphs: https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs
- Wireshark Display Filter Reference for TCP fields: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark Wiki, TCP Analyze Sequence Numbers: https://wiki.wireshark.org/TCP_Analyze_Sequence_Numbers
- Local tcpdump 4.99.4 `--help` and manual output.

## Issues Found
- Clarified ISN wording. RFC 9293 describes an ISN generator using a clock plus an unpredictable/pseudorandom component, so the post now calls it a generated 32-bit value carried in the SYN instead of simply random.
- Clarified the first data sequence after SYN. SYN consumes one sequence number, so the post now explicitly says the first data byte after SYN is `ISN + 1`.
- Fixed the ACK explanation. The original wording said ACK N means "received up to byte N, send N+1 next"; RFC 9293 defines the ACK value as the next expected sequence number, so the post now says ACK N means bytes before N were received and byte N is expected next.
- Made the tcpdump sample output internally consistent with default relative sequence numbers after the initial handshake packets.
- Fixed the retransmission tcpdump pipeline. The original `awk '{print $5}'` reads the destination field in normal tcpdump output, not the TCP sequence range. The replacement extracts data `seq start:end` ranges from one TCP direction.
- Removed the overclaim that duplicate sequence numbers always mean retransmission. Pure ACKs, duplicate capture points, keepalives, zero-window probes, and other cases can repeat sequence values. The post now treats duplicate data sequence ranges as retransmission candidates that need ACK/timing confirmation.
- Changed the Wireshark graph block from `sql` to `text`; it is a UI walkthrough, not SQL.
- Clarified `tcp.analysis.lost_segment`. Wireshark labels this as previous segment(s) not captured, which can mean packet loss, capture loss, or starting the capture midstream.
- Fixed the reordering tcpdump example. The original command sorted by a parsed field, which destroys arrival order and cannot prove reordering. The replacement checks for lower sequence ranges appearing after later bytes in capture order for one direction.
- Fixed the throughput calculation. The original command used default time-of-day timestamps and `$8`, which is not the sequence number in normal tcpdump output. The replacement uses `-tt`, extracts sequence ranges with `sed`, tracks the highest ending sequence value, and guards against zero-duration samples.

## Review Notes
The corrected shell snippets assume a single TCP stream direction. For real captures with multiple clients or reused ports, narrow the filter further with the peer host and port. Wireshark TCP analysis flags are heuristics and depend on capture completeness, capture location, and TCP preference settings.
