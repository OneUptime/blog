# Validation Summary: How to Understand the IPv4 Version Field and Its Purpose

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- IP packet headers
- `tcpdump` / libpcap filter syntax
- `iproute2`
- `curl`
- Python

## Sources Consulted
- RFC 791: Internet Protocol — https://www.rfc-editor.org/rfc/rfc791.html
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- RFC 1122: Requirements for Internet Hosts - Communication Layers — https://www.ietf.org/rfc/rfc1122
- RFC 1812: Requirements for IP Version 4 Routers — https://www.rfc-editor.org/rfc/rfc1812
- IANA IP Version Numbers registry — https://www.iana.org/assignments/version-numbers/version-numbers.xhtml
- IANA Protocol Numbers registry — https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- curl man page — https://curl.se/docs/manpage.html
- Local `tcpdump(1)` man page
- Local `pcap-filter(7)` man page
- Local `ip(8)` / `ip-route(8)` help output
- Local Python 3 interpreter for syntax validation of the example snippets

## Issues Found
- The post said the first byte of an "IP header" contains Version and IHL. That is only true for IPv4, so I changed it to "IPv4 header" to match RFC 791 and avoid conflicting with the IPv6 header layout in RFC 8200.
- The `tcpdump -XX` example implied the first dumped byte would show the IP version nibble. `-XX` includes the link-layer header, so on Ethernet captures the first dumped byte is usually not the IPv4 header. I changed the command to `tcpdump -X` and adjusted the note to say `0x45` is often seen for IPv4 packets without options.
- The version-number table used outdated and imprecise labels for values `5` and `7-15`. I updated it to match the current IANA IP Version Numbers registry: `5` and `7-9` are `Reserved (Historic)`, `10-14` are `Unassigned`, and `15` is `Reserved`.
- The dual-stack and router explanations overstated when the version field is examined. I tightened the wording so it refers to parsing at the IP layer rather than implying the version field is always the very first demultiplexing step on every interface.
- The router walkthrough said an unknown version might optionally trigger an ICMP error. RFC 1122 and RFC 1812 require silent discard for invalid IPv4 version numbers, so I changed that step to discard the packet.

## Review Notes
- The shell examples are Linux/Unix-oriented. `ip` comes from `iproute2`, and `tcpdump` behavior was checked against the current local man pages.
- The Python snippets are syntactically valid and were compile-checked locally. They are illustrative examples rather than production-hardened parsers, so future revisions could add explicit length checks before indexing raw packet bytes.
