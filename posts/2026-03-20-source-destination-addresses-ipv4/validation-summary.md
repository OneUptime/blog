# Validation Summary: How to Read Source and Destination Addresses in IPv4 Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 headers
- IPv4 source and destination addresses
- Python `socket` and `struct` modules
- `tcpdump` and libpcap filter syntax
- Linux `iptables`
- Network Address Translation (NAT)

## Sources Consulted
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- RFC 1812, "Requirements for IP Version 4 Routers": https://datatracker.ietf.org/doc/rfc1812/
- RFC 3022, "Traditional IP Network Address Translator (Traditional NAT)": https://www.rfc-editor.org/rfc/rfc3022.html
- RFC 5737, "IPv4 Address Blocks Reserved for Documentation": https://www.rfc-editor.org/rfc/rfc5737.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- `tcpdump(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `pcap-filter(7)` Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- Local command checks: `python3 --version` (3.12.3), `tcpdump --help` (4.99.4/libpcap 1.10.4), `iptables --help` (1.8.10 nf_tables), and execution of the Python examples.

## Issues Found
- The Python sample used `93.184.216.34` with a comment labeling it as `example.com`. Current DNS lookup did not resolve `example.com` to that address, so the example was updated to `203.0.113.10`, an RFC 5737 TEST-NET-3 documentation address, and the expected output was updated accordingly.
- The post claimed routing decisions were based "solely" or "all" on the destination address. RFC 1812 supports destination-address lookup and longest-prefix selection for standard forwarding, but source-routing options and policy-based routing make the original wording too absolute. The wording was narrowed to standard destination-based forwarding.
- The path-stability sentence said addresses remain unchanged except for NAT. RFC 791 source-routing options can also alter the destination address, so the sentence was updated to describe ordinary forwarding and mention both NAT and source-routing options.

## Review Notes
- The Python examples are syntactically valid and ran successfully with Python 3.12.3.
- The `tcpdump` filter expressions and `-n -q` flags are valid according to tcpdump/libpcap documentation.
- The `iptables` examples are valid for IPv4 filter-table rules; many modern Linux distributions use the nftables-backed `iptables` compatibility layer or native `nft`, so future posts may want to mention that operational caveat.
