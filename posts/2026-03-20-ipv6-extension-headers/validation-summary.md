# Validation Summary: How to Understand IPv6 Extension Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 extension headers and Next Header values
- RFC 8200 and RFC 7045 behavior
- IPsec AH and ESP
- Python packet parsing
- `tcpdump`/libpcap capture filters
- `ip6tables` firewall rules

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200
- RFC 7045, "Transmission and Processing of IPv6 Extension Headers": https://www.rfc-editor.org/rfc/rfc7045.html
- RFC 4302, "IP Authentication Header": https://www.rfc-editor.org/rfc/rfc4302
- RFC 4303, "IP Encapsulating Security Payload (ESP)": https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 6275, "Mobility Support in IPv6": https://www.rfc-editor.org/rfc/rfc6275.html
- IANA, "Internet Protocol Version 6 (IPv6) Parameters": https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- `pcap-filter` manual page: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local `ip6tables -m frag -h` output from `ip6tables v1.8.10 (nf_tables)`

## Issues Found
- The post stated that Hop-by-Hop Options "MUST be processed by EVERY router along the path". RFC 8200 no longer says that; it notes nodes along the path are expected to process Hop-by-Hop options only if explicitly configured. I corrected the table, the comparison section, and the conclusion.
- The post said the Routing header is processed by "Routers in the path + destination". RFC 8200 defines it for nodes explicitly listed in the header, not arbitrary transit routers. I corrected that wording.
- The post said Destination Options are processed only by the destination. RFC 8200 allows a Destination Options header before a Routing header so that listed intermediate destinations also process it. I corrected the table and summary text.
- The "common extension header format" text was too broad. AH uses a different length field, and ESP does not expose its Next Header in the first two bytes. I narrowed the description and added the necessary note.
- The Python parser treated AH, ESP, and other chained headers as if they all used the generic `Hdr Ext Len` formula. That was incorrect. I rewrote the snippet so AH uses its RFC 4302 length rule, ESP is treated as opaque, generic TLV-style extension headers are parsed separately, and basic truncation checks are performed.
- The `tcpdump` examples used `ip6[6] == ...`, which only checks the base IPv6 header's Next Header field and can miss headers farther down the chain. I changed those examples to `ip6 protochain ...`, which follows the IPv6 header chain.
- The firewall commentary said certain headers "must" be allowed in a blanket sense. I narrowed that language to "if you expect" the relevant traffic, which is technically accurate as a policy statement.

## Review Notes
- The `tcpdump` `ip6 protochain` primitive is more accurate for chained-header matching, but the `pcap-filter` documentation notes that it is slower than simple fixed-offset checks.
- The post remains intentionally high-level; it does not cover newer routing-header variants such as SRH, which is acceptable for this scope.
