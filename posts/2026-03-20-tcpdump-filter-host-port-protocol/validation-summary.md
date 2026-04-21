# Validation Summary: How to Filter tcpdump Output by Host, Port, and Protocol

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- tcpdump
- libpcap/pcap-filter syntax
- Berkeley Packet Filter (BPF)
- Linux packet capture
- TCP, UDP, ICMP, ARP, IPv4 filtering

## Sources Consulted
- tcpdump(1) manual page from The Tcpdump Group source: https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/tcpdump.1.in
- pcap-filter(7) manual page from The Tcpdump Group/libpcap source: https://raw.githubusercontent.com/the-tcpdump-group/libpcap/master/pcap-filter.manmisc.in
- Linux man-pages rendering of tcpdump(1): https://man7.org/linux/man-pages/man1/tcpdump.1.html
- Linux man-pages rendering of pcap-filter(7): https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local tcpdump 4.99.4/libpcap 1.10.4 `--version`, `--help`, and `tcpdump -d` filter compilation checks.

## Issues Found
- The comment "TCP traffic to port 80 OR 443" described destination-only traffic, but the command uses `port`, which matches source or destination ports. Changed it to "TCP traffic on port 80 OR 443."
- The packet length examples described `greater 1000` as "larger than 1000 bytes" and `less 100` as "under 100 bytes." In pcap-filter, `greater` is `len >= length` and `less` is `len <= length`. Updated the comments to "1000 bytes or larger" and "100 bytes or smaller."
- The `-X` example was labeled as hex output only. tcpdump `-X` prints packet data in hex and ASCII, so the comment now says "hex and ASCII output."

## Review Notes
All tcpdump filter expressions in the post compile successfully with `tcpdump -d` on tcpdump 4.99.4/libpcap 1.10.4. Arithmetic filters that inspect transport-layer fields, such as `tcp[tcpflags]`, are commonly used and documented, but libpcap notes that transport-layer packet data accessors do not work for IPv6 extension-header cases; future IPv6-specific coverage should call that out explicitly.
