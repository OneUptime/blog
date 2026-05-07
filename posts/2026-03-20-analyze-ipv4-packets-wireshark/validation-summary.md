# Validation Summary: How to Analyze IPv4 Packets with Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wireshark
- TShark
- IPv4
- ICMP
- libpcap/BPF capture filters

## Sources Consulted
- Wireshark User's Guide, "Filtering while capturing": https://www.wireshark.org/docs/wsug_html_chunked/ChCapCaptureFilterSection.html
- `wireshark-filter(4)` manual page: https://www.wireshark.org/docs/man-pages/wireshark-filter
- Wireshark Display Filter Reference for IPv4: https://www.wireshark.org/docs/dfref/i/ip.html
- `tshark(1)` manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark User's Guide, "Checksums": https://www.wireshark.org/docs/wsug_html_chunked/ChAdvChecksums.html
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers
- IANA DSCP registry: https://www.iana.org/assignments/dscp-registry

## Issues Found
- The JSON `tshark` example piped output to `head -60`, which truncates the JSON stream and can leave invalid JSON. I replaced that with `-c 10` and updated the description so the example emits a complete, bounded JSON document.
- The IPv4 header section said the checksum field is a "green = valid" indicator. Wireshark documents checksum annotations such as `[correct]` and `[invalid]`, and whether validation appears depends on checksum validation settings, so I corrected that description.
- The TTL filter note said a low TTL "may indicate spoofing or loop." That interpretation is not reliably supported by the protocol specification or Wireshark documentation, so I removed the unsupported claim and kept the filter itself.
- The section heading referred to retransmissions, but the example only filtered ICMP destination-unreachable traffic. I renamed the heading to match the actual command.
- The key takeaway claimed the IPv4 header panel shows all fields with validity indicators. I narrowed that statement to checksum validation annotations, which is what Wireshark actually documents.

## Review Notes
The remaining capture and display filter examples match current Wireshark field names and filter syntax. The live `tshark -i eth0` example is syntactically correct, but interface names and capture permissions vary by operating system and local setup.
