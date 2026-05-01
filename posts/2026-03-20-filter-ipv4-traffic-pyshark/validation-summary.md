# Validation Summary: How to Filter IPv4 Traffic by Display Filters in PyShark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- PyShark
- Wireshark display filters
- libpcap / BPF capture filters
- IPv4 packet analysis

## Sources Consulted
- PyShark LiveCapture parameters: https://pyshark-packet-analysis.readthedocs.io/en/latest/parameters/live_capture_parameters/
- PyShark LiveCapture usage: https://pyshark-packet-analysis.readthedocs.io/en/latest/capture_usage/live_capture_usage/
- PyShark FileCapture parameters: https://pyshark-packet-analysis.readthedocs.io/en/latest/parameters/file_capture_parameters/
- PyShark FileCapture usage: https://pyshark-packet-analysis.readthedocs.io/en/latest/capture_usage/file_capture_usage/
- Wireshark User's Guide, display filter expressions: https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html
- Wireshark display filter reference for IPv4: https://www.wireshark.org/docs/dfref/i/ip.html
- Wireshark display filter reference for TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark display filter reference for UDP: https://www.wireshark.org/docs/dfref/u/udp.html
- Wireshark display filter reference for HTTP: https://www.wireshark.org/docs/dfref/h/http.html
- Wireshark display filter reference for DNS: https://www.wireshark.org/docs/dfref/d/dns.html
- Wireshark display filter syntax manual: https://www.wireshark.org/docs/man-pages/wireshark-filter
- libpcap / pcap-filter syntax reference: https://www.wireshark.org/docs/man-pages/pcap-filter.html

## Issues Found
- The introduction described BPF filters as always being applied "in the kernel." I adjusted that wording to "typically in the kernel" because libpcap/Npcap can fall back to user-mode filtering on some platforms or with some filter operations.
- The TCP-by-port live-capture example filtered on `tcp.port == 443` and then unconditionally accessed `pkt.ip.*`. That can also match IPv6 traffic, so I changed the filter to `ip and tcp.port == 443` to keep the example aligned with the post's IPv4 scope.
- The "Traffic between two specific hosts" example only matched one direction (`10.0.0.1 -> 10.0.0.2`) even though the text said "between." I updated the display filter to include both directions explicitly.
- The post used `tcp.dport` and `udp.dport`, which are not valid Wireshark display filter field names. I replaced them with valid Wireshark fields and, for the DNS example, used `dns.flags.response == 0` so the example actually matches DNS queries.
- The PCAP example compared the HTTP method using `GET` without quotes. Wireshark display filters require quoted string literals, so I changed it to `http.request.method == "GET"`.
- The HTTP request and HTTP 200 examples could also match non-IPv4 traffic while printing `pkt.ip.src` and `pkt.ip.dst`. I added `ip and` to those display filters so the code remains correct for the IPv4-focused article.

## Review Notes
- PyShark still documents both `bpf_filter` and `display_filter` for `LiveCapture`, and `display_filter` for `FileCapture`; nothing in the post relied on deprecated filter parameters.
- The workspace did not have a usable local Python/PyShark/TShark setup for runtime execution, so validation was performed against the official PyShark and Wireshark documentation rather than by running the snippets locally.
