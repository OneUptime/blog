# Validation Summary: How to Debug DNS Resolution with tcpdump and Wireshark

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- DNS (Domain Name System) protocol
- tcpdump (packet capture)
- Wireshark / tshark (packet analysis)
- BPF (Berkeley Packet Filter) syntax
- dig (DNS lookup utility)

## Sources Consulted
- tcpdump pcap-filter(7) man page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- tcpdump(1) man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- Wireshark Display Filter Reference for DNS: https://www.wireshark.org/docs/dfref/d/dns.html
- tshark(1) man page: https://www.wireshark.org/docs/man-pages/tshark.html
- RFC 1035 (Domain Names - Implementation and Specification)
- RFC 6895 (DNS IANA Considerations) - DNS RCODE assignments
- IANA DNS Parameters: https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml
- dig(1) man page (BIND 9 documentation)

## Issues Found
No technical issues found.

Verifications performed:
- BPF byte offset `udp[10]` correctly maps to DNS flags byte 1 (UDP header is 8 bytes, plus DNS offset 2 = 10). The QR bit mask `0x80` is correct (high bit of DNS flags byte 1).
- DNS RCODE values verified: 0=NOERROR, 2=SERVFAIL, 3=NXDOMAIN, 5=REFUSED (per RFC 1035/IANA).
- DNS query type values verified: 1=A, 28=AAAA, 15=MX (per IANA DNS Parameters).
- Wireshark display filter fields (`dns.flags.response`, `dns.flags.rcode`, `dns.qry.type`, `dns.qry.name`, `dns.time`) all exist and are correctly named.
- The `dns.time` field is documented as the elapsed time between DNS request and response (in seconds), so `dns.time > 0.1` correctly filters slow queries (>100ms).
- tshark options (`-r`, `-Y`, `-T fields -e`) are syntactically correct.
- The BPF equality operator `=` is correct per pcap-filter syntax.
- `dig +trace +stats` are valid dig options per BIND documentation.

## Review Notes
- The post uses `eth0` as the example interface; readers on systems with different naming (e.g., `ens33`, `enp0s3`, or macOS `en0`) should substitute appropriately. This is standard convention and not an error.
- The tcpdump approach in "Case 1" backgrounds tcpdump with `&` and uses `-c 20` to limit packets — this works but timing/race conditions could cause the dig query to start before tcpdump is fully bound. In practice this rarely matters given how fast tcpdump initializes, but a more robust approach would use `tcpdump -w` with a small delay before the dig.
- The BPF filter uses `=` (single equals) which is the documented operator in pcap-filter; some implementations also accept `==` but `=` is the canonical form.
- Modern systems may use DNS-over-TLS (port 853) or DNS-over-HTTPS (port 443) which would not be captured by the `port 53` filter — this is out of scope for the post but worth noting for completeness.
