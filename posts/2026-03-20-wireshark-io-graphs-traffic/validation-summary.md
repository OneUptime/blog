# Validation Summary: How to Use Wireshark IO Graphs for Traffic Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (GUI)
- Wireshark IO Graphs (Statistics → I/O Graph)
- Wireshark display filter syntax
- tshark (command-line Wireshark) with `-z io,stat` statistics
- TCP retransmission analysis (`tcp.analysis.retransmission`)

## Sources Consulted
- Wireshark User's Guide — I/O Graphs: https://www.wireshark.org/docs/wsug_html_chunked/ChStatIOGraphs.html
- tshark man page (Statistics / `-z io,stat`): https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark display filter reference (for `tcp.port` syntax): https://www.wireshark.org/docs/dfref/t/tcp.html

## Issues Found
1. **Incorrect interval range** — The post claimed the IO Graph interval ranges from "0.01s to 10s". Per the Wireshark User's Guide and GUI dropdown, intervals span 1ms to 10min. Changed to "1ms to 10min".
2. **"BPF/display filter" wording** — The IO Graph filter field only accepts Wireshark display filter syntax, not BPF (capture filter) syntax. Changed to "Wireshark display filter for each graph line".
3. **`tcp port 443` filter example** — This is BPF/capture filter syntax and would not be valid in an IO Graph filter field, which requires display filter syntax. Changed to `tcp.port == 443`.
4. **tshark io,stat output format** — The shown output was an oversimplified two-column table. Actual tshark output uses ASCII box formatting with `=` rule lines, pipe-separated columns, and time shown as interval ranges (e.g., `0.000 <> 1.000`). Updated the example to reflect the real format while preserving the "spike at second 3" narrative.

## Review Notes
- The `wireshark` language identifier used on the fenced code block for display filters is non-standard but harmless (most renderers fall back to plain text). Not worth changing.
- The menu path "Statistics → I/O Graph" is correct for current Wireshark 4.x.
- The tshark command `tshark -r capture.pcap -q -z io,stat,1` and the filter variant `tshark -r capture.pcap -q -z io,stat,1,"tcp.analysis.retransmission"` are syntactically correct.
- The "Copy" / "Save As" description of exporting the IO Graph image is consistent with current Wireshark behavior.
