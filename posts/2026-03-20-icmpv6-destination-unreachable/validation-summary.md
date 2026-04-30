# Validation Summary: How to Understand ICMPv6 Destination Unreachable

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6
- RFC 4443
- RFC 6554
- Python
- `tcpdump` / libpcap filter syntax
- `nc` / netcat

## Sources Consulted
- RFC 4443: https://www.rfc-editor.org/rfc/rfc4443
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- RFC 6554: https://www.rfc-editor.org/rfc/rfc6554
- RFC 8883: https://www.rfc-editor.org/rfc/rfc8883.html
- Python `struct` documentation: https://docs.python.org/3.11/library/struct.html
- Python `socket` documentation: https://docs.python.org/3.11/library/socket.html
- Local `pcap-filter(7)` man page
- Local `tcpdump --help` output
- Local `nc -h` output

## Issues Found
- The Code 0 explanation overstated how the error is generated. I changed it to match RFC 4443: it is sent when the forwarding node has no matching routing-table entry, and this case only occurs on nodes without a default route.
- The Code 1 explanation incorrectly equated the message with TCP RST behavior. I changed it to state that it is a network-layer administrative prohibition error, not a TCP reset.
- The Code 3 explanation was too narrow. I changed it to reflect RFC 4443, where Code 3 is the fallback for delivery failures not covered by the other codes, with Neighbor Discovery failure as an example.
- The Code 4 explanation and test command were inaccurate for TCP. I changed the text to note that Code 4 is commonly a UDP case, clarified that TCP typically uses RST instead, and changed the example from `nc -6` to `echo test | nc -6u -w1 ...` so the example can actually provoke ICMPv6 Port Unreachable.
- The Code 7 explanation incorrectly tied the error to Segment Routing Header Type 4. I corrected it to RFC 6554's RPL Source Routing Header behavior.
- The message-format note treated the 32-bit `Unused` field as universal. I scoped that statement to the base RFC 4443 Destination Unreachable format so it does not overclaim for newer extensions.
- The `tcpdump` examples used hard-coded `ip6[40]` and `ip6[41]` offsets. I replaced them with the named ICMPv6 type/code selectors documented by `pcap-filter(7)` and validated that the filters compile under the local `tcpdump`.
- The Python mapping for Code 1 used a shortened label. I updated it to the IANA/RFC wording for consistency.

## Review Notes
- The Python parsing snippet is syntactically valid, and I verified it successfully decodes a synthetic Type 1 / Code 4 message and extracts the quoted IPv6 source and destination addresses.
- The post now accurately covers the base RFC 4443 layout and the commonly discussed codes in this article. The current IANA registry also contains newer specialized Type 1 codes such as Code 8 (`Headers too long`, RFC 8883) and Code 9 (`Error in P-Route`, RFC 9914).
