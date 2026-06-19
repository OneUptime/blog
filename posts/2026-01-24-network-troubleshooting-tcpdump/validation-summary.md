# Validation Summary: How to Handle Network Troubleshooting with tcpdump

## Status
validated

## Post Type
Technical tutorial / troubleshooting guide

## Technologies Covered
- Linux networking
- tcpdump
- libpcap / BPF filter expressions
- Packet capture files (PCAP)
- TCP, UDP, ICMP, ARP, DNS, HTTP, HTTPS/TLS, SSH, SMTP
- Bash scripting

## Sources Consulted
- tcpdump local man page and `tcpdump --help` output, tcpdump 4.99.4 / libpcap 1.10.4
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter manual page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- Linux man-pages pcap-filter reference: https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The HTTP GET example used a filter that matched any TCP packet with payload rather than GET requests specifically. Changed it to match payload beginning with ASCII `GET `.
- The TLS sequence diagram used TLS 1.2-era messages as a generic TLS handshake. Updated the labels to a modern simplified TLS handshake flow.
- The SSH connection-establishment filter used TCP flag constants without explicitly reading `tcp[tcpflags]`. Changed it to test the TCP flags field directly.
- The capture rotation comment said files were rotated by 100 MB, but the command rotates every 3600 seconds with `-G`. Updated the comment to hourly rotation.
- The performance-monitoring command was described as a packets-per-second check, but it only prints tcpdump's capture summary. Updated the comment.
- The connection-count example described active connections and used an imprecise SYN filter. Updated it to count new connection attempts and test `tcp[tcpflags]`.
- The connection tester script tried to read a quoted wildcard path, which prevents shell glob expansion and does not reliably identify the capture file. Added a `CAPTURE_FILE` variable and reused it for both writing and reading the capture.
- The connection tester script interpolated user input into a `bash -c` string. Passed the host and port as positional parameters instead.
- The traffic monitor script classified every non-ICMP, non-UDP packet as TCP. Added an explicit TCP check and an `OTHER` bucket.

## Review Notes
Most tcpdump options, protocol filters, packet-size filters, file read/write examples, and TCP flag examples were accurate. The edited BPF expressions were checked with `tcpdump -d`, and the combined shell snippets passed `bash -n`.
