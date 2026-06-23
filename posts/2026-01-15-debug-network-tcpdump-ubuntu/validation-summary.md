# Validation Summary: How to Debug Network Issues with tcpdump on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcpdump (packet analyzer)
- libpcap / Berkeley Packet Filter (BPF) expression syntax
- Ubuntu / apt package management
- Linux capabilities (setcap)
- TCP/IP, ICMP, ARP, UDP protocols and TCP flags
- DNS, HTTP, TLS/SSL protocol analysis
- pcap file format and rotation
- Related tooling: Wireshark, tshark, tcpflow, ngrep

## Sources Consulted
- tcpdump man page and `tcpdump --version` output on the local system (tcpdump 4.99.4, libpcap 1.10.4) — https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter(7) man page (BPF expression syntax, operator precedence, primitives like `len`, `greater`, `less`, `portrange`, `vlan`, `tcp[tcpflags]`) — https://www.tcpdump.org/manpages/pcap-filter.7.html
- Local verification: compiled every non-trivial BPF expression in the post with `tcpdump -d` to confirm syntactic validity, and inspected the generated BPF assembly for the SYN-ACK filter to confirm correct operator precedence
- RFC 9293 (TCP) for TCP flag semantics (SYN/ACK/FIN/RST/PSH/URG)
- RFC 8446 / RFC 5246 (TLS) for record content types (0x16 Handshake, 0x15 Alert) and version codes (0x0301–0x0304)
- setcap / capabilities(7) for `cap_net_raw,cap_net_admin=eip`

## Issues Found
- **Mislabeled RST count as "retransmissions" (in `performance_debug.sh`).** A block was commented `# Retransmissions (duplicate ACKs)` and printed `Potential retransmissions (RST packets):`, but the underlying filter (`tcp[tcpflags] & tcp-rst != 0`) counts TCP RST packets. RST packets are connection resets, not retransmissions or duplicate ACKs — and retransmissions cannot be detected with a simple flag filter (they require sequence-number analysis, e.g. in Wireshark). Changed the comment to `# Connection resets (often a sign of trouble)` and the label to `Connection resets (RST packets):` so the description matches what the command actually measures. No command/filter was changed.

## Review Notes
- All ~15 BPF filter expressions were compile-verified with `tcpdump -d` and are valid. The byte-offset filters for HTTP method matching (`0x47455420` = "GET ", `0x504f5354` = "POST", `0x48545450` = "HTTP") and the TLS record-type/handshake-type offsets are correct.
- The SYN-ACK filter `tcp[tcpflags] & (tcp-syn|tcp-ack) == (tcp-syn|tcp-ack)` was a precedence concern (a known tcpdump gotcha), but inspecting the compiled BPF confirms `&` binds tighter than `==` here, so it correctly matches packets with both SYN and ACK set. No change needed.
- The sample `--version` output (tcpdump 4.99.4 / libpcap 1.10.4 / OpenSSL 3.0.13) matches a current Ubuntu install exactly.
- Protocol numbers (TCP=6, UDP=17, ICMP=1), IP header offsets (ip[8]=TTL, ip[9]=protocol), TLS record types and version codes, and the historical note that tcpdump dates to 1988 are all accurate.
- Minor non-blocking caveats for future improvement (left as-is, not technical errors): `-s 0` is largely redundant on modern tcpdump where the default snaplen is already 262144; the awk-based DNS/HTTP/"top talkers" heuristics are approximate parsing tricks rather than exact analyses; and `setcap cap_net_raw,cap_net_admin=eip` plus the `pcap` group is one convention among several for non-root capture. None of these are incorrect as written.
