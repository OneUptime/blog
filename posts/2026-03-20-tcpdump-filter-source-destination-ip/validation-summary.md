# Validation Summary: How to Filter tcpdump Captures by Source or Destination IP Address

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- tcpdump
- libpcap/BPF filter expressions
- IPv4 packet headers
- Shell pipelines

## Sources Consulted
- tcpdump official man page source: https://github.com/the-tcpdump-group/tcpdump/blob/master/tcpdump.1.in
- libpcap pcap-filter official man page source: https://github.com/the-tcpdump-group/libpcap/blob/master/pcap-filter.manmisc.in
- Local tcpdump 4.99.4 / libpcap 1.10.4 `tcpdump --help`, `man tcpdump`, and `man pcap-filter`
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html

## Issues Found
- The DNS query example used `udp port 53`, which matches either source or destination port 53. Changed it to `udp dst port 53` so it specifically matches client queries sent to DNS.
- The raw IP byte filter used `ip[12:3]`, but libpcap packet data accessor sizes must be 1, 2, or 4 bytes. Changed it to `ip[12:4] & 0xffffff00 = 0xc0a80100` to match the first three octets of the IPv4 source address.
- The TTL example described TTL 64 as "likely Linux origin." Observed TTL is decremented by routers and is not reliable OS attribution by itself, so the wording now says it matches packets observed with TTL 64.
- Scenario 4 used `src 10.0.0.0/8`, which does not compile as a CIDR source filter because `src` without a type qualifier assumes `host`. Changed it to `src net 10.0.0.0/8`.
- Scenario 4 also captured only the client-to-server direction, so it could not show SYN-ACK responses. Changed the filter to `net 10.0.0.0/8 and host 192.168.1.50 and tcp` so it captures both directions between the subnet and host.
- Two practical scenario commands placed options after the filter expression. Moved `-A` and `-c 100` before the expression to match tcpdump's documented command syntax.
- Updated comments where the filter semantics were broader than the wording: `net 192.168.1.0/24` matches traffic involving the subnet, and `host 192.168.1.100 and not port 22` matches traffic involving the host.

## Review Notes
All tcpdump filter expressions were compile-checked with `tcpdump -d` after the fixes. The examples are IPv4-focused; future improvements could explicitly mention IPv6 equivalents such as `ip6`, `icmp6`, and IPv6 CIDR filters.
