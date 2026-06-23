# Validation Summary: How to Troubleshoot Network Latency Using tcpdump and Wireshark

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- tcpdump (BPF capture filters, output formatting)
- Wireshark / tshark (display filters, TCP stream graphs, expert info, statistics)
- TCP/IP (handshake timing, retransmissions, window sizing, RTT)
- Scapy (Python packet analysis)
- Docker / Kubernetes (in-container packet capture, ephemeral debug containers, nsenter)
- curl, mtr, mergecap (supporting tooling)
- Bash scripting (automated capture/analysis)

## Sources Consulted
- pcap-filter(7) manual — https://www.tcpdump.org/manpages/pcap-filter.7.html (BPF operator precedence, fragment-offset and TCP flag filter examples)
- tcpdump(1) manual — https://www.tcpdump.org/manpages/tcpdump.1.html (`-B`, `-G`, `-W`, `--time-stamp-precision`, `-tttt`/`-ttt` flags)
- Wireshark Display Filter Reference — https://www.wireshark.org/docs/dfref/ (`tcp.analysis.*`, `tcp.time_delta`, `tcp.window_size_value`, `http.time`, `dns.time`)
- Scapy documentation — https://scapy.readthedocs.io/en/latest/usage.html (TCP flag string comparison `'S'`/`'SA'`, `pkt.time`)

## Issues Found
No technical issues found.

Key claims that were specifically verified:
- BPF expressions `tcp[tcpflags] & tcp-syn != 0` and `ip[6:2] & 0x1fff != 0` rely on bitwise `&` binding tighter than relational operators. Confirmed against pcap-filter(7), which uses the same idiom in its own examples (`ip[6:2] & 0x1fff = 0`, `tcp[tcpflags] & (tcp-syn|tcp-fin) != 0`).
- The scapy handshake script's `tcp.flags == 'S'` / `tcp.flags == 'SA'` string comparisons are valid modern Scapy idioms; `'SA'` is the correct flag-string ordering (SYN then ACK) for a SYN-ACK packet, and the SYN/SYN-ACK key/reverse-key matching logic is correct.
- The canonical IPv4 HTTP payload capture filter (`tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)`) matches the official tcpdump example.
- TCP window-size field offset (`tcp[14:2]`) and Wireshark analysis field names are accurate.

## Review Notes
- The fragment filter `ip[6:2] & 0x1fff != 0` matches only non-first fragments (fragment offset > 0); the comment "packets larger than MTU (fragmentation issues)" is a reasonable shorthand but does not capture the first fragment (which has MF set but offset 0). This is a common and acceptable simplification, not an error.
- `tcp[14:2] < 1000` captures small advertised window sizes; note that with TCP window scaling the raw header value may not reflect the effective window. The post's framing as a heuristic is fine.
- The automated bash script uses both `timeout ... &` and a subsequent `sleep $CAPTURE_DURATION; wait` — slightly redundant but functionally correct.
- Ephemeral `kubectl debug` containers share the target pod's network namespace, so capturing with `-i any` works as described; for capturing a specific container's interface, `--target` can be added, but this is an enhancement rather than a correction.
