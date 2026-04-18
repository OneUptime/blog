# Validation Summary: How to Use tshark for IPv6 Command-Line Analysis

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- tshark (command-line Wireshark)
- Wireshark display filter syntax
- IPv6 protocol
- ICMPv6 (Neighbor Discovery Protocol, Echo Request/Reply)
- BPF (Berkeley Packet Filter) capture syntax
- pcap file format
- Bash scripting
- Python 3 JSON processing

## Sources Consulted
- tshark(1) manual page — https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Display Filter Reference for IPv6 — https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark Display Filter Reference for ICMPv6 — https://www.wireshark.org/docs/dfref/i/icmpv6.html
- Wireshark User's Guide — Statistics (`-z`) options — https://www.wireshark.org/docs/wsug_html_chunked/ChStatistics.html
- pcap-filter(7) BPF syntax (ip6 primitive)
- RFC 4443 — ICMPv6 message types (Echo Request 128, Echo Reply 129)
- RFC 4861 — Neighbor Discovery for IP version 6 (Router Solicitation 133, Router Advertisement 134, Neighbor Solicitation 135, Neighbor Advertisement 136)

## Issues Found
No technical issues found.

All tshark flags (`-i`, `-f`, `-Y`, `-V`, `-c`, `-r`, `-w`, `-T fields`, `-e`, `-E header=y`, `-E separator=`, `-q`, `-z`) are correct and current. Display filter field names (`ipv6.src`, `ipv6.dst`, `ipv6.nxt`, `ipv6.plen`, `ipv6.addr`, `icmpv6.type`, `icmpv6.code`, `icmpv6.nd.ns.target_address`, `frame.time`, `frame.number`, `tcp.dstport`, `http.request`, `http.host`, `http.request.uri`) match the Wireshark dissector definitions. Statistics tap syntax (`conv,ipv6`, `endpoints,ipv6`, `io,stat,<interval>,<filter>...`, `io,phs`) is correct. The BPF capture primitive `ip6` is valid pcap-filter syntax. ICMPv6 type numbers match IANA/RFC assignments. The JSON output structure (`_source.layers.ipv6["ipv6.src"]`) matches tshark's `-T json` format.

## Review Notes
- The JSON processing example in the "Live Capture to JSON for Processing" section uses `json.load(sys.stdin)`, which requires the full JSON array to be received before parsing. For live captures, tshark buffers and emits the closing bracket only when the capture ends (e.g., on Ctrl+C or when `-c` limit is reached). For true streaming live analysis, `-T ek` (newline-delimited Elasticsearch JSON) would be more appropriate, but the example still works correctly for bounded captures — this is a usability note, not a technical error.
- The `ipv6.nxt` field represents the IPv6 Next Header value (protocol number for the next header), which is correctly used in the field extraction example.
- On modern Linux systems the primary interface name may be `ens33`, `enp0s3`, etc. rather than `eth0`; readers should substitute the appropriate interface name shown by `tshark -D`. This is standard for any tshark/tcpdump tutorial.
- Capturing live traffic generally requires root privileges or appropriate capabilities (`CAP_NET_RAW`, `CAP_NET_ADMIN`) or membership in the `wireshark` group; the post does not mention this, but it is standard tshark practice.
