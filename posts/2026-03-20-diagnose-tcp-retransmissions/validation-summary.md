# Validation Summary: How to Diagnose TCP Retransmissions and Window Zero Events

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Linux networking tools (`netstat`, `ss`, `nstat`, `ping`, `sysctl`)
- Packet capture and analysis tools (`tcpdump`, `tshark`, Wireshark)
- Linux TCP sysctls

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP), https://www.rfc-editor.org/rfc/rfc9293
- RFC 6298: Computing TCP's Retransmission Timer, https://www.rfc-editor.org/rfc/rfc6298
- Wireshark User's Guide: TCP Analysis, https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html
- Wireshark User's Guide: TCP Stream Graphs, https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs
- Wireshark Display Filter Reference for TCP, https://www.wireshark.org/docs/dfref/t/tcp.html
- `tshark(1)` man page, https://www.wireshark.org/docs/man-pages/tshark.html
- Linux kernel IP sysctl documentation, https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ss(8)` man page, https://man7.org/linux/man-pages/man8/ss.8.html
- `tcpdump(8)` man page, https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `ping(8)` man page, https://man7.org/linux/man-pages/man8/ping.8.html
- `netstat(8)` man page, https://man7.org/linux/man-pages/man8/netstat.8.html
- `nstat(8)` man page, https://man.archlinux.org/man/core/iproute2/nstat.8.en
- GNU Coreutils `timeout` manual, https://www.gnu.org/software/coreutils/timeout

## Issues Found
- Corrected the zero-window explanation. The original wording implied the sender stops transmitting entirely; RFC 9293 requires zero-window probing/retransmission behavior, so the post now says new data stops while probes or retransmissions can continue.
- Tightened the retransmission-cause wording. High latency alone is too broad; the post now refers to latency spikes or severe jitter causing ACKs to arrive after the RTO expires.
- Fixed the `nstat` example. The original regex did not match several counters the post later told readers to inspect. The updated regex now matches the named counters.
- Fixed the `ss -tin` examples. The original text used `Retrans` and `retrans=` patterns that do not match current `ss` output. The updated commands use the actual lowercase `retrans:` and `bytes_retrans:` fields.
- Fixed the tcpdump capture command. The original command claimed to capture for 60 seconds but had no time limit. It now uses `timeout --signal=INT 60 tcpdump ...` so the command matches the comment.
- Tightened the TShark/Wireshark analysis guidance. The retransmission and zero-window examples now use Wireshark TCP analysis fields more precisely, and the duplicate-ACK / fast-retransmit descriptions are less absolute.
- Removed the aggressive `tcp_rto_min_us=10000` tuning advice. Linux kernel documentation recommends keeping `tcp_rto_min_us` at or below 200000 microseconds, and pushing it down to 10 ms can increase spurious retransmissions.
- Fixed the loss-vs-application heuristics. The original flood-ping example and hard `0.1%` threshold were too absolute, and the Nginx log example assumed `$request_time` was always the last field. The post now treats ICMP loss as a hint and conditions the log example on the log format.

## Review Notes
- `netstat` is still valid, but its own man page marks it as mostly obsolete. `ss` and `nstat` are better primary tools on modern Linux systems.
- `tshark` is part of the Wireshark toolset and may need separate installation on minimal server images.
- Increasing `tcp_rmem` can help when the receiver is buffer-limited, but it will not fix an application that is simply not reading from the socket quickly enough.
