# Validation Summary: How to Diagnose TCP Duplicate ACK Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Wireshark
- TShark
- tcpdump
- Linux `nstat` / TCP SNMP counters

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP) — https://www.rfc-editor.org/rfc/rfc9293
- RFC 5681: TCP Congestion Control — https://www.rfc-editor.org/rfc/rfc5681.html
- RFC 8985: The RACK-TLP Loss Detection Algorithm for TCP — https://www.rfc-editor.org/rfc/rfc8985.html
- Wireshark User’s Guide — https://www.wireshark.org/docs/wsug_html/
- Wireshark Display Filter Reference: TCP — https://www.wireshark.org/docs/dfref/t/tcp
- `tshark(1)` man page — https://www.wireshark.org/docs/man-pages/tshark.html
- `tcpdump(8)` man page — https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Linux kernel SNMP counter documentation — https://docs.kernel.org/networking/snmp_counter.html
- `nstat(8)` man page — https://man7.org/linux/man-pages/man8/nstat.8.html

## Issues Found
- The post described duplicate ACKs as re-acknowledging the last in-order segment and used ACK values that did not match TCP cumulative ACK semantics. I corrected the explanation and updated the packet diagram so ACKs represent the next expected sequence number.
- The live `tcpdump | awk` example used a non-portable `awk` form (`match(..., array)`) that fails on common default `awk` implementations, and it omitted `tcpdump -l`, which can prevent line-buffered real-time output. I rewrote the extraction logic with POSIX-compatible `sub()` calls and added `-l`.
- The Wireshark wording around `tcp.analysis.duplicate_ack_num >= 3` implied it counts confirmed loss events. I corrected the wording so it accurately describes duplicate ACKs at or beyond the fast-retransmit threshold.
- The TShark aggregation by `tcp.ack` alone could conflate multiple flows because ACK numbers are tracked per stream. I changed the example to aggregate by `tcp.stream` and `tcp.ack`.
- The `nstat` guidance treated generic out-of-order queue and fast-retransmit counters as direct duplicate-ACK indicators. I replaced that guidance with reorder-specific counters and clarified that `TcpExtTCPFastRetrans` is a sender-side fast retransmit proxy, not a duplicate-ACK counter.

## Review Notes
Modern TCP stacks may also use time-based loss detection such as RACK/TLP (RFC 8985), so duplicate ACKs remain diagnostically useful but are not the only loss-detection signal in current implementations.
