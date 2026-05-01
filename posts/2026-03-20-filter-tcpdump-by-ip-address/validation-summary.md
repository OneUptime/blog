# Validation Summary: How to Filter tcpdump Output by IP Address

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- `tcpdump`
- `libpcap` / BPF filter syntax
- IPv4
- IPv6
- Linux networking
- Wireshark / `.pcap` capture files

## Sources Consulted
- The Tcpdump Group `tcpdump` man page source: https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/tcpdump.1.in
- The Tcpdump Group `pcap-filter` man page source: https://raw.githubusercontent.com/the-tcpdump-group/libpcap/master/pcap-filter.manmisc.in
- `pcap-filter(7)` HTML manual, generated from upstream `libpcap`: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local verification with installed `tcpdump 4.99.4` / `libpcap 1.10.4` using `tcpdump --help` and compile-only checks via `tcpdump -y EN10MB -d`

## Issues Found
- The database examples used bare `port 5432`, which matches either source or destination port 5432. I changed them to `dst port 5432` so they match the stated client-to-database direction.
- The IPv6 network example was described as traffic "to" a network, but `net 2001:db8::/32` matches source or destination by default. I changed the description to "to/from" to match the filter.
- The TCP and ICMP examples were labeled "from a host" while using `host 10.0.0.5`, which matches both directions. I changed those examples to use `src 10.0.0.5`.
- The `not tcp and host 10.0.0.5` example was described as `UDP + ICMP`, but it actually matches any non-TCP traffic involving that host. I corrected the description.
- The `-XX` example was described as showing "full packet content". Upstream documentation says `-XX` prints packet data in hex and ASCII including the link-level header; I updated the wording accordingly.
- The 8080 troubleshooting examples used bare `port 8080` even though the comments implied destination-port and source-port specific checks. I changed them to `dst port 8080` and `src port 8080`.
- The "TLS handshake failures" example filtered on the TCP SYN bit, which identifies TCP connection attempts rather than TLS handshake records. I corrected the description to refer to TCP connection attempts on port 443.
- The DNS query example used `udp port 53`, which matches either source or destination port 53. I changed it to `udp dst port 53` so it matches outbound DNS queries from the specified host.
- The `-s 0` best-practice note claimed it captures the full packet payload. The current upstream man page states that `-s 0` sets the snapshot length to tcpdump's default `262144` bytes, so I updated the wording to match current behavior.

## Review Notes
- Updated filter expressions were compile-checked locally with `tcpdump -y EN10MB -d` because live capture access was not permitted in this environment.
- No remaining technical issues found after these corrections.
