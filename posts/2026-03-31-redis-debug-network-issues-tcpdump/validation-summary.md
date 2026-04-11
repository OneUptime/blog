# Validation Summary: How to Debug Redis Network Issues with tcpdump

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- tcpdump (packet capture and analysis)
- tshark / Wireshark (network protocol analysis)
- Redis (in-memory data store, RESP protocol)
- TCP/IP (RST packets, retransmissions, keepalive)
- TLS (handshake failures, alert records)
- BPF (Berkeley Packet Filter syntax)
- Bash scripting (monitoring script)

## Sources Consulted
- tcpdump man page — flag definitions for `-i`, `-r`, `-A`, `-X`, `-ttt`, `-s`, `-q`, and BPF filter syntax including `tcp[tcpflags]` and `tcp-rst` constant
- Wireshark/tshark documentation — display filter `tcp.analysis.retransmission` and `tls.alert_message`
- Redis official documentation — `tcp-keepalive` configuration parameter (redis.io/docs/latest/operate/oss_and_stack/management/config/)
- Redis RESP protocol specification — RESP array, bulk string, and simple string formats (redis.io/docs/latest/develop/reference/protocol-spec/)
- RFC 5246 (TLS 1.2) — TLS record content types: 0x14 ChangeCipherSpec, 0x15 Alert, 0x16 Handshake, 0x17 Application Data
- Redis TLS documentation — conventional use of port 6380 for TLS-enabled Redis (redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/)

## Issues Found

1. **Retransmission detection command was broken (original line 61):**
   - **What was wrong:** The command `sudo tcpdump -i eth0 "port 6379" -r /tmp/redis-capture.pcap | grep -i "retransmit"` had two problems: (a) `-i eth0` and `-r` are contradictory — `-i` selects a live interface while `-r` reads from a file; tcpdump silently ignores `-i` when `-r` is present, making the command misleading. (b) tcpdump does not perform TCP stream analysis and never outputs the word "retransmit" — the grep would always return empty results.
   - **What was changed:** Replaced with `tshark -r /tmp/redis-capture.pcap -Y "tcp.analysis.retransmission"` which correctly uses tshark's TCP dissector to identify retransmitted segments. Added a note explaining that tcpdump cannot detect retransmissions on its own. The post already referenced Wireshark, so using tshark (its CLI companion) is consistent.

2. **TLS alert detection command was incorrect (original lines 103-104):**
   - **What was wrong:** The comment "byte 15 = alert" confuses hex 0x15 with decimal 15. The TLS Alert content type is 0x15 (decimal 21), not 15. Additionally, `tcpdump -X | grep -A2 "Alert"` would not work because tcpdump's hex dump output (`-X`) does not decode or label TLS record types — the word "Alert" would never appear in the output.
   - **What was changed:** Fixed the comment to "content type 0x15 = alert" and replaced the tcpdump grep command with `tshark -r /tmp/redis-tls.pcap -Y "tls.alert_message"` which properly uses tshark's TLS dissector to identify alert records.

## Review Notes
- The claim "RSTs from the client side suggest idle connection timeouts" is directionally correct for typical Redis troubleshooting but is an oversimplification — client-side RSTs can also be caused by application pool eviction, middlebox/firewall state expiration, or abrupt client termination. The phrasing uses "suggest" which is acceptably hedged for a troubleshooting guide.
- The continuous monitoring script uses `wc -l` on tcpdump output lines as a proxy for packet count. With the `-q` flag this is a reasonable approximation, though tcpdump may emit non-packet lines in some edge cases.
- The `-s 1500` snap length in the RESP reading section limits capture to 1500 bytes per packet. While modern tcpdump defaults to a much larger snaplen (262144), 1500 bytes aligns with standard Ethernet MTU and is sufficient for inspecting most Redis commands.
- The two fixes introduce a dependency on `tshark` (Wireshark CLI) which may not be installed on all systems. However, the post already references Wireshark for deeper analysis, making this a reasonable expectation.
