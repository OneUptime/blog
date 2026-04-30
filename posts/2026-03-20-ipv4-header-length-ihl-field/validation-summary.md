# Validation Summary: How to Determine IPv4 Header Length Using the IHL Field

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IP header parsing
- `tcpdump`
- BPF/libpcap filter expressions
- Python (`bytes`, `struct`)

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- IANA, Internet Protocol Version 4 (IPv4) Parameters: https://www.iana.org/assignments/ip-parameters/ip-parameters.xhtml
- `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tcpdump(8)` manual page: https://man.openbsd.org/OpenBSD-7.4/tcpdump
- Python `struct` documentation: https://docs.python.org/3/library/struct.html

## Issues Found
- The packet-capture section said `tcpdump -v` prints the IPv4 header length or raw IHL directly. I changed that note because documented verbose output does not expose the raw IHL nibble directly.
- The hex-dump example used `tcpdump -XX` while treating `0x45` as the first displayed byte. I changed it to `-X`, because `-XX` includes the link-layer header on Ethernet captures and would not normally begin with the IPv4 header.
- The post described the largest IPv4 header as having "40 bytes of options". I changed that wording to "up to 40 bytes of options and padding" to match RFC 791.

## Review Notes
- The Python snippets are syntactically valid and accurate for illustrating IHL extraction on well-formed packets. They are not hardened against every malformed-packet case, which is acceptable for this post's scope.
