# Validation Summary: How to Analyze TCP Window Size and Throughput in Wireshark

## Status
validated

## Post Type
Tutorial / Technical how-to guide

## Technologies Covered
- Wireshark (GUI packet analyzer)
- tshark (CLI for Wireshark)
- tcpdump (packet capture)
- TCP protocol (window size, window scaling, retransmissions, zero-window)
- TCP Window Scaling option (RFC 7323 / RFC 1323)

## Sources Consulted
- Wireshark User's Guide - TCP Stream Graphs (https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs.html)
- Wireshark Display Filter Reference for TCP (https://www.wireshark.org/docs/dfref/t/tcp.html)
- RFC 7323 - TCP Extensions for High Performance (https://datatracker.ietf.org/doc/html/rfc7323) — obsoletes RFC 1323
- tcpdump man page / official docs (https://www.tcpdump.org/manpages/tcpdump.1.html)
- tshark man page (https://www.wireshark.org/docs/man-pages/tshark.html)

## Issues Found

1. **Throughput calculation unit error (fixed).** The post stated `Max throughput = 65535 / 0.010 = 6.5 Mbit/s`. The arithmetic 65535 / 0.010 yields 6,553,500 bytes/s, which is ~6.5 MB/s or ~52.4 Mbit/s, not 6.5 Mbit/s. The author conflated megabytes and megabits. Corrected the comment to show the actual bytes/s result and both MB/s and Mbit/s conversions.

2. **Outdated RFC reference (fixed).** The post cited "RFC 1323" as the Window Scaling specification. RFC 1323 was obsoleted by RFC 7323 (September 2014). Updated the reference to cite RFC 7323 while noting it obsoletes RFC 1323 for historical clarity.

## Review Notes

- The tcpdump commands (`sudo tcpdump -i eth0 -w capture.pcap host 10.0.0.5 and tcp` and `sudo tcpdump -i eth0 -w capture.pcap tcp port 443`) are syntactically correct.
- All Wireshark display filters used (`tcp.stream`, `tcp.flags.ack`, `tcp.window_size`, `tcp.window_size_value`, `tcp.analysis.window_full`, `tcp.analysis.zero_window`, `tcp.analysis.retransmission`, `tcp.analysis.fast_retransmission`, `tcp.flags.syn`, `tcp.options.wscale`) are valid fields in current Wireshark.
- tshark field names (`frame.time_relative`, `ip.src`, `tcp.window_size`, `tcp.len`, `tcp.options.wscale_val`) are valid. Note: `tcp.options.wscale_val` still works but Wireshark also exposes `tcp.options.wscale.shift` in newer versions; both refer to the shift count.
- Menu paths (Statistics > TCP Stream Graphs > Time-Sequence / Window Scaling / Round-Trip Time / Throughput, Statistics > IO Graph) match the current Wireshark UI.
- The "Window Scaling" graph description ("Blue line: Sequence numbers sent (throughput), Red line: Window size advertised by receiver") is a reasonable interpretation of the graph, though the exact colors and line meanings can vary by Wireshark version and theme. This is a minor stylistic point, not a technical error.
- The formula `throughput ≤ window_size / RTT` (the Bandwidth-Delay Product relationship) is correct.
- Zero-window and window-full detection via `tcp.analysis.zero_window` / `tcp.analysis.window_full` are the standard Wireshark expert-analysis fields.
