# Validation Summary: How to Use tcpdump BPF Filter Expressions Effectively

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- tcpdump
- libpcap / pcap-filter expressions
- Berkeley Packet Filter (BPF)
- IPv4 packet headers
- TCP header fields and flags
- ICMP message types
- HTTP request payload matching
- DSCP / Differentiated Services

## Sources Consulted
- Local `man pcap-filter` from libpcap 1.10.4 and tcpdump 4.99.4; online counterpart: https://www.tcpdump.org/manpages/pcap-filter.7.html
- Local `tcpdump --version` output; online tcpdump manual: https://www.tcpdump.org/manpages/tcpdump.1.html
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- RFC 2474, Definition of the Differentiated Services Field: https://www.rfc-editor.org/rfc/rfc2474
- RFC 3246, An Expedited Forwarding PHB: https://www.rfc-editor.org/rfc/rfc3246
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- IANA Assigned Internet Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml

## Issues Found
- The IPv4 header offset table placed DSCP/ECN at byte offset 4. RFC 791 shows the original Type of Service octet immediately after Version/IHL, and RFC 2474 redefines that octet as the DS field, so this was corrected to byte offset 1.
- The TCP header table labeled byte 12 only as `data offset`. RFC 9293 shows byte 12 contains the 4-bit data offset plus reserved bits, so the label was made more precise.
- The DSCP EF filter compared `(ip[1] & 0xfc)` to decimal `46`. DSCP 46 is the upper six-bit value; masking byte 1 leaves it shifted in the octet. The example now uses `ip[1] >> 2 = 46`, which compares the actual six-bit DSCP value.
- The `greater` and `less` examples were described as built-in keyword alternatives without noting their inclusive packet-length semantics. The comments now state that `greater 1400` is `len >= 1400` and `less 64` is `len <= 64`, matching `pcap-filter`.
- The broad HTTP method example used `tcp[tcp[12] >> 2] >= 0x40`, which did not mask the TCP data offset byte and matched many non-method payload bytes. It now masks the TCP data offset and checks for an uppercase ASCII first byte as a clearer heuristic.
- The ICMP section heading comment said only `echo request` while the examples included both echo request and echo reply. The comment now says `echo request/reply`.

## Review Notes
The tcpdump filter expressions were syntax-checked with `tcpdump -d` on tcpdump 4.99.4 / libpcap 1.10.4. The HTTP payload examples apply to cleartext HTTP on TCP port 80; they do not decode TLS-encrypted HTTPS traffic.
