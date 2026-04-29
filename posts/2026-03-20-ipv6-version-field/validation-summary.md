# Validation Summary: How to Understand the IPv6 Version Field

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4
- Ethernet and EtherType
- `tcpdump` / libpcap capture filters
- Python
- C

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- IANA IP Version Numbers registry: https://www.iana.org/assignments/version-numbers/version-numbers.xhtml
- RFC 2464, "Transmission of IPv6 Packets over Ethernet Networks": https://datatracker.ietf.org/doc/html/rfc2464
- `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local command validation with `tcpdump 4.99.4` using `tcpdump -d 'ip6'` and `tcpdump -d 'ether proto 0x86DD'`

## Issues Found
- Several passages overstated who checks the Version field. I narrowed that wording to IP parsing or raw-IP handling because link-layer devices do not necessarily inspect IP headers, and EtherType often handles the first demultiplexing step on Ethernet.
- The Python `identify_ip_version()` docstring did not match the function's actual return values. I updated it to include `Unknown (version N)`.
- The conceptual C packet-dispatch example read `packet[0]` without checking `len`. I added a `len < 1` guard so the example is safe and correct.
- The `tcpdump -XX` note implied the first displayed byte of an Ethernet frame would be `0x6x`. I corrected the explanation to note that the IPv6 header begins after the 14-byte Ethernet header and adjusted the example command accordingly.
- The historical section incorrectly said values `0-15` are reserved. I updated it to match the IANA registry: the field can encode `0-15`, with some values assigned, some reserved/historic, and some unassigned.

## Review Notes
- The Ethernet hex-offset explanation is specific to Ethernet captures. Other link-layer types can place the IPv6 header at a different offset.
- After these corrections, no remaining technical issues were found in the post.
