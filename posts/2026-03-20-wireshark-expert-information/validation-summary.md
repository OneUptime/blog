# Validation Summary: How to Use Wireshark Expert Information to Find Network Problems

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (GUI packet analyzer)
- tshark (command-line packet analyzer)
- Wireshark Expert Information subsystem
- Wireshark display filters
- TCP protocol analysis (retransmissions, RSTs, window management)

## Sources Consulted
- Wireshark User Guide, Chapter 7.4 "Expert Information": https://www.wireshark.org/docs/wsug_html_chunked/ChAdvExpert.html
- Wireshark source code (`epan/dissectors/packet-tcp.c`) on GitLab for authoritative severity assignments: https://gitlab.com/wireshark/wireshark/-/raw/master/epan/dissectors/packet-tcp.c
- Wireshark Wiki "Development/ExpertInfo": https://moin-wiki.wireshark.org/Development/ExpertInfo
- Ask Wireshark community Q&A on retransmission severity classification

## Issues Found

Multiple severity-level classifications in the post conflicted with the authoritative values defined in the Wireshark TCP dissector source (`packet-tcp.c`). Fixed the following:

1. **Severity Levels table — colors and examples were wrong.**
   - Chat color: changed "Gray" → "Blue" (per official Wireshark docs).
   - Note color: changed "Light blue" → "Cyan" to match official docs.
   - Error example: "retransmissions, RSTs" was incorrect — these are not Errors. Replaced with "malformed packets, dissector errors".
   - Warning example: added accurate examples (RSTs, zero window, out-of-order).
   - Note example: "SYN, FIN" was wrong — SYN/FIN are Chat severity. Replaced with "retransmissions, duplicate ACKs".
   - Chat example: changed to "SYN, FIN, window updates" which are all actual Chat-level events.
   - Also renamed "Warning" → "Warn" to match Wireshark's own terminology.

2. **Common Expert Information Messages table — severity classifications corrected** against `ei_register_info` in `packet-tcp.c`:
   - TCP Retransmission: Error → **Note** (PI_NOTE)
   - Previous segment lost: Error → **Warn** (PI_WARN)
   - TCP ACKed unseen segment: Note → **Warn** (PI_WARN)
   - Duplicate ACK: Warning → **Note** (PI_NOTE)
   - TCP Fast Retransmission: Error → **Note** (PI_NOTE)
   - Connection reset (RST): Error → **Warn** (PI_WARN)
   - Zero Window: Error → **Warn** (PI_WARN)
   - TCP Window Update: Note → **Chat** (PI_CHAT)
   - Also downgraded Application response time, DNS NXDOMAIN, and HTTP 5xx to **Note** to align with Wireshark's dissector behavior (application-layer dissectors typically use Note for common error responses; the user guide explicitly states Note is for "notable events, e.g., an application returned a common error code such as HTTP 404"). Warn is reserved for unusual protocol-level issues.

3. **tshark output example** — previously showed `tcp.analysis.retransmission` under an "Errors" section, which would never occur because retransmissions are Notes. Rewrote the example output to correctly place each analysis flag under its actual severity category (retransmission/duplicate_ack under Notes; out_of_order/ack_lost_segment/connection.rst under Warnings). Also replaced the misleading "grep -c Errors" health-check example with the correct and more useful `tshark -z expert,warn` severity-filter form.

## Review Notes
- The `tshark -z expert[,{error|warn|note|chat|comment}]` tap filter is correct per the tshark man page. Severity filters are cumulative (e.g., `warn` reports error + warn).
- Display filter expressions (`tcp.analysis.flags`, `tcp.analysis.retransmission`, `tcp.flags.reset == 1`, `tcp.analysis.zero_window`, `tcp.analysis.window_full`, `expert`) were all verified and are valid.
- The menu path "Analyze → Expert Information" and bottom-left status-bar colored indicator are accurate for modern Wireshark (3.x and 4.x).
- "Prepare Filter" in the Expert Information dialog is a real feature and works as described.
- The general workflow advice (open, sort by severity, click to jump, Follow TCP Stream, IO Graphs) reflects standard Wireshark usage and is accurate.
- Severity colors may render slightly differently depending on OS and theme, but the documented canonical colors are Red/Yellow/Cyan/Blue.
