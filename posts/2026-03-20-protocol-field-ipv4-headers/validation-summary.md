# Validation Summary: How to Identify the Protocol Field in IPv4 Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- Python `socket` module
- Linux packet sockets (`AF_PACKET`)
- `tcpdump` / libpcap filter syntax
- `iptables`
- Linux `/etc/protocols`
- IANA Protocol Numbers registry

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Linux `packet(7)` manual: https://man7.org/linux/man-pages/man7/packet.7.html
- RFC 894, A Standard for the Transmission of IP Datagrams over Ethernet Networks: https://datatracker.ietf.org/doc/html/rfc0894
- libpcap `pcap-filter(7)` manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `iptables(8)` manual: https://man7.org/linux/man-pages/man8/iptables.8.html
- Linux `protocols(5)` manual: https://www.man7.org/linux/man-pages/man5/protocols.5.html

## Issues Found
- The Python raw-socket example used `socket.AF_INET` with `socket.IPPROTO_TCP`, which only captures TCP packets and therefore could not demonstrate identifying arbitrary IPv4 Protocol field values. I replaced it with a Linux `AF_PACKET` example that captures IPv4 packets correctly and noted the required privileges.
- The Python parser assumed a valid IPv4 header without checking length. I added a minimum-header-length guard so the example fails cleanly on undersized input instead of indexing blindly.
- The Python snippet imported `struct` but did not use it. I removed the unused import.
- The post described `/etc/protocols` as the full IANA-assigned list. I corrected that wording to describe it as a local mapping file and pointed readers to IANA's registry as the authoritative complete source.
- The introductory registry reference was updated to point to IANA's current Protocol Numbers registry rather than an imprecise RFC-only reference.

## Review Notes
- The `tcpdump` capture filters such as `ip proto 1` and `ip proto 47` are valid libpcap syntax.
- The `iptables` examples are valid with current `iptables` syntax, including protocol names sourced from `/etc/protocols`.
- Interface names like `eth0` are environment-specific and may differ on many modern Linux systems, but that does not affect the correctness of the filter syntax shown.
