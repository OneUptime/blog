# Validation Summary: How to Use Wireshark to Diagnose Slow HTTP Response Times

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (display filters, TCP Stream Graphs, HTTP statistics, Expert Info)
- tcpdump (packet capture)
- TCP (3-way handshake, window, retransmissions, zero-window events)
- HTTP (request/response timing, TTFB)
- curl (timing write-out variables: time_namelookup, time_connect, time_starttransfer, time_total)
- nginx / Apache access log timing ($request_time, $upstream_response_time)

## Sources Consulted
- Wireshark Statistics → HTTP: https://www.wireshark.org/docs/wsug_html_chunked/ChStatHTTP.html
- Wireshark Service Response Time: https://www.wireshark.org/docs/wsug_html_chunked/ChStatSRT.html
- Wireshark TCP Stream Graphs: https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs.html
- Wireshark HTTP display filter reference: https://www.wireshark.org/docs/dfref/h/http.html
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- tcpdump man page (for `-i`, `-n`, `-w`, capture filter expressions)
- curl `--write-out` variable reference: https://curl.se/docs/manpage.html

## Issues Found
1. **Incorrect menu path: "Statistics → Service Response Time → HTTP"** — Wireshark's Service Response Time feature does not support HTTP. Supported protocols are AFP, CAMEL, DCE-RPC, Diameter, Fibre Channel, GTP, GTPv2, H.225 RAS, LDAP, MEGACO, MGCP, NCP, ONC-RPC, PFCP, RADIUS, SCSI, SMB, SMB2, SNMP. Replaced the entry in Step 7 with two valid HTTP statistics options: `Statistics → HTTP → Requests` (per-URL request statistics) and `Statistics → HTTP → Load Distribution` (request distribution across HTTP hosts and servers).
2. **Incorrect menu label: "Time-Sequence (Stevens)"** — The official Wireshark label uses a space, not a hyphen. Changed every occurrence to `Time Sequence (Stevens)` (in Step 4 and the Conclusion).
3. **Imprecise zero-window filter: `tcp.window_size == 0`** — While this filter compiles, it matches any packet whose calculated window value is 0 (including ACKs where the field incidentally is 0). The semantically correct filter for the zero-window expert event is `tcp.analysis.zero_window`. Updated the example filter in Step 6.

## Review Notes
- The `http.time` field is correct for filtering slow responses; it represents the delta between the HTTP request and the matching response.
- All curl `--write-out` variables (`time_namelookup`, `time_connect`, `time_starttransfer`, `time_total`) are accurate and current.
- The tcpdump capture command and capture filter syntax (`'port 80 or port 8080'`) are valid.
- Scenario A's description ("850ms handshake") is slightly informal — the SYN → SYN-ACK interval reflects one RTT, not the full 3-way handshake time. Left as-is because the educational intent (network latency) is accurate.
- The post focuses on plaintext HTTP (port 80). For HTTPS traffic, Wireshark would need TLS keys (`SSLKEYLOGFILE`) to inspect application-layer timing. Mentioning this could be a useful future enhancement.
