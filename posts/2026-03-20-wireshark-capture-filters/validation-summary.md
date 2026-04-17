# Validation Summary: How to Use Capture Filters to Limit Traffic in Wireshark

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Wireshark (capture filters)
- BPF (Berkeley Packet Filter) syntax
- tcpdump-compatible filter expressions
- Common network protocols (HTTP, HTTPS, DNS, SSH, SNMP, NTP, ICMP)
- Database ports (PostgreSQL, MySQL)
- VPN protocols (WireGuard, OpenVPN)
- RFC 1918 private address ranges

## Sources Consulted
- Wireshark Capture Filters documentation: https://wiki.wireshark.org/CaptureFilters
- pcap-filter(7) man page (libpcap filter syntax): https://www.tcpdump.org/manpages/pcap-filter.7.html
- tcpdump(1) man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- IANA Service Name and Transport Protocol Port Number Registry
- RFC 1918 (Address Allocation for Private Internets)
- WireGuard documentation (default port 51820)
- OpenVPN documentation (default UDP port 1194)
- PostgreSQL documentation (default port 5432)
- MySQL documentation (default port 3306)

## Issues Found
No technical issues found.

Verified details:
- BPF syntax examples (`host`, `port`, `net`, `src net`, `udp port`, `icmp`, `not`, `and`, `or`) all match the pcap-filter specification.
- The SYN-only filter `tcp[tcpflags] & (tcp-syn) != 0 and tcp[tcpflags] & tcp-ack = 0` is valid BPF. Both `=` and `!=` are accepted comparison operators in pcap-filter syntax.
- The `net A and net B` expression correctly captures traffic between two subnets because `net X` matches if either source or destination is in X, so requiring both means one endpoint must be in each subnet.
- Port numbers verified: HTTP/80, HTTPS/443, DNS/53, SSH/22, SNMP/161-162, NTP/123, PostgreSQL/5432, MySQL/3306, WireGuard/51820, OpenVPN/1194.
- RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are correct.
- The distinction between capture filters (applied pre-storage, BPF syntax, cannot be changed mid-capture) and display filters (applied post-storage, Wireshark syntax, live-editable) is accurate.
- `tcp port http` and `tcp port https` are valid — BPF resolves service names via /etc/services.
- Wireshark GUI menu paths (Capture → Options, Capture → Capture Filters / Manage Capture Filters) are consistent with the current Wireshark UI.

## Review Notes
- The `not (src net ...)` RFC 1918 exclusion only filters by source address. Users aiming to exclude all private traffic bidirectionally would need to combine src and dst clauses, but the post's framing ("capture only internet traffic" originating from public sources) is consistent with the filter as written.
- The post uses `bash` as the code fence language for BPF filter expressions. BPF is not bash, but this is a common convention for syntax highlighting and does not affect technical correctness.
- `tcp port http` relies on `/etc/services` (or equivalent) to resolve the `http` name; this works on standard Unix-like systems and on Windows Wireshark builds that ship a services file.
