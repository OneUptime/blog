# Validation Summary: How to Identify Failed TCP Handshakes in Packet Captures

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Wireshark
- TShark
- tcpdump
- `ss`
- `nstat`
- Linux `/proc/net/snmp`

## Sources Consulted
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293
- RFC 4022, Management Information Base for the Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc4022.html
- Wireshark Display Filter Reference for TCP fields: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark display filter manual: https://www.wireshark.org/docs/man-pages/wireshark-filter
- TShark manual: https://www.wireshark.org/docs/man-pages/tshark.html
- pcap-filter manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Local CLI help output: `ss --help`
- Local CLI help output: `tcpdump --help`
- Local CLI help output: `nstat --help`
- Local system output: `/proc/net/snmp`

## Issues Found
- The original `tcpdump` SYN filters matched any packet with the SYN bit set, including `SYN,ACK`. I changed them to `tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn` so the examples target initial SYNs only.
- The `ss` examples used `state syn-received`, which is not a valid state name in current `ss`. I corrected both commands to `state syn-recv`, matching current CLI syntax.
- The automated `tshark` aggregation originally counted only `ip.src`, `ip.dst`, and `tcp.dstport`, which could merge unrelated connections and did not actually isolate retransmitted SYNs. I changed it to filter initial SYNs and group on source IP, source port, destination IP, destination port, and raw sequence number.
- The `/proc/net/snmp` command could not return `AttemptFails` because it discarded the header row before running `grep`. I replaced it with an `awk` command that maps the `Tcp:` headers to the corresponding values and prints the `AttemptFails` counter correctly.
- The explanation of `AttemptFails` was too narrow. Per RFC 4022, it is not just "SYN sent but never completed"; it covers direct transitions from `SYN-SENT` or `SYN-RCVD` to `CLOSED`, plus `SYN-RCVD` back to `LISTEN`. I updated the wording accordingly.
- Two descriptions overstated what a single filter proves on its own. I tightened the RST and `SYN-ACK with no ACK` wording so the post accurately distinguishes between what the filter shows and what the analyst must confirm in the stream.

## Review Notes
- The post is Linux-oriented because it relies on `ss`, `nstat`, and `/proc/net/snmp`.
- SYN retransmission counts are OS- and configuration-dependent, so wording that implied a fixed retry count was softened.
