# Validation Summary: How to Identify TCP Packet Loss with tcpdump

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- tcpdump
- TShark
- Wireshark
- awk
- Bash

## Sources Consulted
- `tcpdump(8)` local manual page on the review host (`tcpdump` 4.99.4), for `-n`, `-r`, `-S`, and `-w`
- `pcap-filter(7)` local manual page on the review host, for capture filter syntax such as `tcp and host ... and port ...`
- `mawk(1)` local manual page on the review host, plus local `awk --version`, to verify `match(s, r, array)` portability
- Wireshark `tshark(1)` manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Display Filter Reference for TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User’s Guide, TCP Analysis: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html
- RFC 5681, TCP Congestion Control: https://www.rfc-editor.org/rfc/rfc5681.html
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293

## Issues Found
- The original sequence-gap `awk` example treated changes in `tcp.seq` as direct proof of packet loss. That is not reliable on its own, and it ignored Wireshark's actual TCP analysis rules. I replaced it with a `tshark` example that shows sequence numbers alongside `tcp.analysis.*` flags.
- The original duplicate-ACK parser used `awk`'s `match(..., array)` form, which is not supported by the local `mawk` implementation, and it reimplemented logic Wireshark already exposes. I replaced it with a `tshark` example based on `tcp.analysis.duplicate_ack` and `tcp.analysis.duplicate_ack_num`.
- The post described `tcp.analysis.lost_segment` as evidence of loss. Wireshark documents this as "previous segment(s) not captured", which can also happen because the capture started late or the capture point missed packets. I corrected the explanation and related filter comments.
- The post said `tshark -Y "tcp.analysis.retransmission"` counts loss events. That filter counts suspected retransmitted packets, not distinct loss events, and it omits `fast_retransmission` and `spurious_retransmission`. I corrected the conclusion, filters, and automation snippet accordingly.
- The automation script killed `tcpdump` and immediately analyzed the file, which can race the capture process before the pcap is fully flushed. I added `wait $TCPDUMP_PID` before analysis.

## Review Notes
- The post now reads correctly from a packet-analysis perspective, but interpretation still depends on capture location and capture quality.
- The title emphasizes `tcpdump`, while the deeper analysis relies on TShark/Wireshark TCP analysis fields. That is technically fine, but readers still need those tools for the analysis steps shown.
