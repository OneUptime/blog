# Validation Summary: How to Filter Wireshark Traffic by IPv4 Address Range

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark display filter language
- tshark command-line packet analyzer
- IPv4 / CIDR notation
- RFC 1918 private address ranges
- TCP/IP, HTTP, DNS, ICMP protocol filters

## Sources Consulted
- Wireshark Display Filter Reference (ip): https://www.wireshark.org/docs/dfref/i/ip.html
- Wireshark User's Guide, Ch. 6 Working with captured packets / Display filters: https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html
- Wireshark Wiki — DisplayFilters (CIDR / slash notation support)
- tshark(1) man page: https://www.wireshark.org/docs/man-pages/tshark.html
- RFC 1918 — Address Allocation for Private Internets
- RFC 3330 / RFC 5735 — loopback 127.0.0.0/8

## Issues Found
No technical issues found.

Verified specifically:
- `ip.addr`, `ip.src`, `ip.dst` with CIDR (`/8`, `/12`, `/16`, `/24`) are valid Wireshark display-filter syntax.
- RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and loopback (127.0.0.0/8) are correct.
- The post correctly uses `not ip.addr == X` rather than the common-gotcha `ip.addr != X` (the latter reduces to `ip.src != X or ip.dst != X`, which is almost always true).
- Fields `frame.len`, `tcp.flags.syn`, `tcp.flags.ack`, `tcp.analysis.retransmission`, `dns.flags.rcode`, `tcp.port` are all valid.
- tshark flags used (`-r`, `-Y`, `-w`, `-T fields -e`) match the documented CLI.

## Review Notes
- The CIDR form `ip.addr == 10.0.0.0/8` is supported by Wireshark's display filter engine but historically has not been supported by the libpcap capture filter language (which requires `net 10.0.0.0/8`). The post only uses display filters, so this is fine; a future revision could note the distinction for readers who try to paste the same expressions into a capture filter.
- The `awk` one-liner that derives a `/24` by zeroing the last octet is a reasonable approximation but will misclassify hosts in subnets that are not `/24` (e.g., `/22` or `/23`). Acceptable as a quick-look heuristic, as implied by the surrounding prose.
