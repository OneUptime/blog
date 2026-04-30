# Validation Summary: How to Understand IPv6 Fragment Overlap Prevention

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 fragmentation and reassembly
- IPv4 fragmentation behavior
- RFC 8200 and RFC 5722 overlap handling
- Linux fragment reassembly counters
- `tcpdump` / libpcap capture filters
- Wireshark / `tshark` display filters
- Python

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- RFC 5722: Handling of Overlapping IPv6 Fragments — https://www.rfc-editor.org/rfc/rfc5722
- RFC 791: Internet Protocol — https://www.rfc-editor.org/rfc/rfc791
- RFC 1858: Security Considerations for IP Fragment Filtering — https://www.rfc-editor.org/rfc/rfc1858
- Wireshark Display Filter Reference: Internet Protocol Version 6 — https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark `wireshark-filter` manual page — https://www.wireshark.org/docs/man-pages/wireshark-filter
- Wireshark `pcap-filter` manual page — https://www.wireshark.org/docs/man-pages/pcap-filter.html

## Issues Found
- The introduction and conclusion were too absolute about IPv6 overlap handling. RFC 8200 allows exact duplicate fragments to be dropped separately instead of always aborting reassembly, so I corrected the prose to include that special case.
- The `Fragment 0 injection` example was technically inaccurate for endpoint behavior. I replaced it with the documented tiny-fragment attack from RFC 1858, which accurately describes fragment-based filter evasion.
- The capture filter `ip6[6] == 44` only matches packets whose base IPv6 header directly points to a Fragment header. I changed it to `ip6 protochain 44`, which the `pcap-filter` documentation identifies as the correct way to match IPv6 fragments anywhere in the header chain.
- The Python reassembly example could return incomplete or incorrectly assembled data when fragment 0 was missing, the last fragment had not arrived, or there were gaps. I updated it to reject incomplete fragment sets before building the output buffer.
- The IPv4 comparison section incorrectly said RFC 791 does not specify overlap behavior. I corrected it to reflect RFC 791's example reassembly procedure, which accepts overlaps and uses the more recently arrived data, and then distinguished that from later implementation choices.
- The IPv6 comparison text overclaimed that IDS evasion was impossible in general. I narrowed this to overlap-based IDS/firewall evasion at the reassembly layer, which is the behavior RFC 8200 addresses.

## Review Notes
- `Ip6ReasmFails` is only a coarse signal. It can rise for several reassembly problems, not just overlap attempts, so the post correctly treats it as an indicator rather than proof.
- Local checks: the embedded Python snippet was extracted, compiled, and executed with positive/negative reassembly cases; `tcpdump -d 'ip6 protochain 44'` was used to confirm the capture filter compiles; `validation.json` was validated with `jq`.
- `tshark` is not installed in this workspace, so the `ipv6.fragment.overlap == 1` display filter was verified against Wireshark's official display-filter documentation rather than executed locally.
