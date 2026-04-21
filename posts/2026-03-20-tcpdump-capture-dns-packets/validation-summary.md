# Validation Summary: How to Capture DNS Query and Response Packets with tcpdump

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcpdump
- libpcap / pcap-filter syntax
- DNS over UDP and TCP
- Linux command-line tools: grep, awk, sort, uniq, timeout
- BIND dig

## Sources Consulted
- tcpdump(8) manual, The Tcpdump Group: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- pcap-filter(7) manual, libpcap filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- RFC 1035, Domain Names - Implementation and Specification: https://datatracker.ietf.org/doc/rfc1035/
- BIND 9 Administrator Reference Manual, dig options: https://bind9.readthedocs.io/en/v9.20.9/manpages.html
- GNU Coreutils timeout manual: https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html
- Local command checks: tcpdump 4.99.4/libpcap 1.10.4, dig help output, GNU grep 3.11, mawk 1.3.4, GNU timeout help output

## Issues Found
- tcpdump DNS output examples did not match tcpdump's documented DNS request/response format. Updated the query and response examples to show transaction IDs, query type, response counts, answer data, and how to match RTT by query ID/client port.
- The "Capture only A record queries" example was incorrect. The BPF expression `udp[10] & 0x80 = 0` checks the DNS QR bit and matches queries, not A records. Updated the explanation and made the IPv4 UDP limitation explicit.
- The post claimed DNS QTYPE A appears at a fixed byte offset. RFC 1035 places QTYPE after the variable-length QNAME, so a fixed offset is not generally correct. Removed that claim.
- The wording implied tcpdump would capture all DNS transports. Clarified that the examples cover plaintext DNS on port 53.
- Response-code grep used only uppercase names, while tcpdump commonly prints mixed-case codes such as `NXDomain`. Updated the command to use case-insensitive grep.
- Domain extraction commands were based on the earlier incorrect output format and extracted the wrong field. Replaced them with awk that extracts the token after the DNS query type field.
- The audit command described "resolved domains" but parsed query lines. Updated it to "queried domains."
- The unanswered-query example keyed only by timestamp and never removed matching responses, so it printed queries rather than timeouts. Replaced it with awk that tracks client, resolver, and DNS transaction ID, then deletes entries when a matching response appears.
- The dig latency script claimed `+norecurse` forced a fresh uncached DNS query. BIND documentation shows `+norecurse` only clears the RD bit. Updated the script to use dig's reported `Query time` and note that resolver cache may still be used.
- The closing claim said responses mean "DNS is working." Updated it to distinguish resolver reachability from successful name resolution.

## Review Notes
- The examples cover classic plaintext DNS on port 53. They do not capture DNS-over-HTTPS, DNS-over-TLS, or DNS-over-QUIC traffic.
- `eth0` is a common example interface name, but users may need to replace it with the interface shown by `ip link` or `tcpdump -D`.
- Live pipelines that end in `sort` will emit aggregate results after tcpdump exits.
