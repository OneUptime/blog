# Validation Summary: How to Understand the Differences Between IPv6 and IPv4 Packet Handling

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- ICMPv6
- Path MTU Discovery
- Linux networking tools (`ip`, `nstat`)
- Python

## Sources Consulted
- RFC 791, "Internet Protocol" - https://www.rfc-editor.org/rfc/rfc791
- RFC 1812, "Requirements for IP Version 4 Routers" - https://www.rfc-editor.org/rfc/rfc1812
- RFC 4293, "Management Information Base for the Internet Protocol (IP)" - https://www.rfc-editor.org/rfc/rfc4293
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc4443
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201, "Path MTU Discovery for IP version 6" - https://www.rfc-editor.org/rfc/rfc8201
- RFC 9673, "IPv6 Hop-by-Hop Options Processing Procedures" - https://www.rfc-editor.org/rfc/rfc9673.html
- Linux kernel documentation, "SNMP counter" - https://docs.kernel.org/networking/snmp_counter.html
- Local `iproute2` CLI help/output checked with `ip link help`, `ip -s link show`, and `nstat -h`

## Issues Found
- The IPv6 flow diagram and extension-header section said Hop-by-Hop options must be processed by all routers. I changed this to say on-path processing happens only when routers are configured for it, which matches current IPv6 behavior in RFC 8200 and RFC 9673.
- The IPv4 fragmentation section said intermediate fragmentation was transparent to endpoints. I corrected this to say the destination reassembles fragments, because fragmentation is visible at the receiving endpoint even when the source did not fragment.
- The IPv4 DF-bit note was too broad. I changed it to say classical Path MTU Discovery relies on `DF=1` plus ICMP "Fragmentation Needed", which is the accurate relationship.
- The IPv6 PMTU wording was too strong. I changed "must discover path MTU before sending large packets" to "adjusts packet size based on path MTU discovery", which better reflects RFC 8201 and the fact that minimal IPv6 nodes may simply send packets no larger than 1280 bytes.
- The comparison table used an imprecise "Minimum MTU" row and an inaccurate "DHCP required" label. I changed these to "Minimum size rule" and "DHCP for addressing" so the table aligns with RFC 791 / RFC 8200 terminology and avoids implying DHCP is protocol-mandatory in IPv4.
- The Linux example `ip -s -6 link show eth0` was described as showing forwarded packet counts, which is incorrect. I changed it to describe interface RX/TX counters and replaced the forwarding example with `nstat -az Ip6OutForwDatagrams Ip6InHdrErrors`, which targets relevant IPv6 forwarding/header counters.
- The conclusion said IPv6 routers do "no variable-length header parsing", which was too absolute because IPv6 still has extension headers. I narrowed this to "no IPv4-style variable-length base header parsing in the common case."

## Review Notes
- The Python example is syntactically valid and its behavior matches the corrected high-level explanation.
- The IPv4 checksum discussion is conceptually correct for a forwarding comparison, although RFC 1812 allows incremental checksum updates when TTL is the only header field that changes.
- The Linux command examples are Linux-specific and assume `iproute2` tooling such as `nstat` is available.
