# Validation Summary: How to Use Wireshark TCP Stream Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (TCP analysis features, Follow TCP Stream, Expert Information, TCP Stream Graphs)
- tshark (command-line packet analysis)
- tcpdump (packet capture)
- TCP display filters (`tcp.stream`, `tcp.analysis.*`, `tcp.flags.*`, `frame.time_delta`)

## Sources Consulted
- Wireshark User's Guide, "Following Protocol Streams" (https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStream.html)
- Wireshark User's Guide, "Expert Information" (https://www.wireshark.org/docs/wsug_html_chunked/ChAdvExpert.html)
- Wireshark Wiki, "TCP Analyze Sequence Numbers" (https://wiki.wireshark.org/TCP_Analyze_Sequence_Numbers)
- Wireshark source code: `epan/dissectors/packet-tcp.c` (severity assignments `PI_ERROR`/`PI_WARN`/`PI_NOTE`/`PI_CHAT`)
- Wireshark display filter reference for `tcp`, `tcp.analysis`, and `frame` fields
- tshark(1) manual page for `-r`, `-Y`, `-T fields`, and `-e` flags

## Issues Found

1. **Follow TCP Stream color mapping was reversed.** The post said blue = client→server and red = server→client. Per the Wireshark User's Guide, traffic in the forward direction (client to server, the endpoint that sent the first packet) is colored red, and reverse direction (server to client) is colored blue. Swapped the two lines in the Follow TCP Stream code block.

2. **Expert Information severity categorizations were incorrect.** Verified severities against `epan/dissectors/packet-tcp.c` in the current Wireshark source:
   - `TCP RST observed` was listed as Error — it is actually `PI_WARN` (Warning). Moved to Warnings.
   - `TCP retransmission`, `TCP fast retransmission`, and `TCP duplicate ACK` were listed as Warnings — they are all `PI_NOTE`. Moved to Notes.
   - `Window full` and `Zero window` were listed under Notes — both are `PI_WARN`. Moved to Warnings.
   - `TCP out-of-order` (Warning) and `Keep-alive ACK` (Note) were already correct and were kept.
   - Also added `Keep-alive` to the Notes list to match `tcp.analysis.keep_alive` (`PI_NOTE`), since the filter example later in the post references it.

3. **Introduction claimed stream graphs visualize CWND.** Wireshark's TCP Stream Graphs show sequence numbers, throughput, RTT, and the receive window (Window Scaling graph) — the sender's congestion window (CWND) is sender-internal state and is not directly graphed. Changed "CWND" to "receive window" to match what the Window Scaling graph in the post actually describes.

## Review Notes

- The display filter expressions (`tcp.stream eq N`, `tcp.len > 0`, `tcp.flags.syn == 1 && tcp.flags.ack == 0`, `tcp.analysis.ack_rtt`, `tcp.analysis.flags && !tcp.analysis.keep_alive && !tcp.analysis.keep_alive_ack`, `frame.time_delta > 1.0`) are all valid Wireshark display filter syntax.
- The tshark invocations (`-r`, `-Y`, `-T fields`, `-e <field>`) and field names (`tcp.stream`, `ip.src`, `ip.dst`, `tcp.srcport`, `tcp.dstport`, `frame.time_relative`, `tcp.seq`, `tcp.ack`, `tcp.len`, `tcp.analysis.ack_rtt`) all exist and work as described.
- The TCP Stream Graph types listed (Time-Sequence (Stevens), Throughput, Round-Trip Time, Window Scaling) all exist under Statistics → TCP Stream Graphs. The post does not mention the "Time Sequence (tcptrace)" variant, which is fine for a survey and not incorrect.
- The Chat severity is sometimes shown as light grey/green rather than blue in modern Wireshark builds, but "blue" is a common informal description in tutorials and is not clearly wrong, so it was left alone.
- The tcpdump capture filter (`'tcp and port 8080'`) and invocation syntax are correct.
