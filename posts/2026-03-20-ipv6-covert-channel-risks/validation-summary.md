# Validation Summary: How to Understand IPv6 Covert Channel Risks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS AAAA records
- TShark and Wireshark display filters
- tcpdump and libpcap capture filters
- Scapy
- ip6tables / Netfilter

## Sources Consulted
- RFC 6437: IPv6 Flow Label Specification - https://www.rfc-editor.org/rfc/rfc6437
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 2473: Generic Packet Tunneling in IPv6 Specification - https://www.rfc-editor.org/rfc/rfc2473.html
- RFC 6946: Processing of IPv6 "Atomic" Fragments - https://www.rfc-editor.org/rfc/rfc6946
- RFC 8021: Generation of IPv6 Atomic Fragments Considered Harmful - https://www.rfc-editor.org/rfc/rfc8021
- RFC 3596: DNS Extensions to Support IP Version 6 - https://www.rfc-editor.org/rfc/rfc3596.html
- Wireshark Display Filter Reference: IPv6 - https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark Display Filter Reference: DNS - https://www.wireshark.org/docs/dfref/d/dns.html
- TShark manual page - https://www.wireshark.org/docs/man-pages/tshark.html
- pcap-filter manual page - https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Scapy IPv6 API documentation - https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- iptables-extensions manual page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The Flow Label section described the field as primarily a QoS field and treated any non-zero label as suspicious. I updated it to match RFC 6437, which defines the field for flow identification and recommends stable, often non-zero labels, and I changed the detection guidance accordingly.
- The `tshark` examples used IPv4 fields (`ip.src`, `ip.dst`) while filtering IPv6 traffic. I replaced them with the correct IPv6 fields (`ipv6.src`, `ipv6.dst`) and tightened the DSCP example to use `ipv6.tclass.dscp`.
- The PadN example implied arbitrary padding data was valid. RFC 8200 requires PadN data bytes to be zero, so I rewrote the section to describe covert use as a deliberate RFC violation, corrected the option layout, and fixed the Scapy example to inspect only `PadN` options in IPv6 option headers.
- The tunneling section incorrectly said IPv6 extension headers carry nested IPv6 traffic. I corrected it to IPv6-in-IPv6 encapsulation using Next Header 41 per RFC 2473 and adjusted the example command.
- The fragment section mixed "not fragmented" wording with the Fragment Header example and its comment did not match the actual BPF filter. I rewrote it around atomic fragments and clarified that the command detects atomic fragments for follow-up inspection of the identification field.
- The DNS section incorrectly tied covert-channel capacity to the 128-bit size of IPv6 addresses in AAAA records. I corrected it to DNS tunneling via encoded query names carried in type AAAA lookups and made the example filter AAAA-specific.
- The baseline `awk` example only emitted flow-label counts even though it also collected traffic-class values. I fixed it so both distributions are written to the baseline output.
- The mitigation block suggested zeroing non-zero flow labels, which conflicts with RFC 6437 guidance. I replaced that wording with RFC-aligned rewriting guidance and kept the concrete firewall example focused on logging Fragment headers, which matches the actual `ip6tables` rule shown.

## Review Notes
- `tshark` is not installed in the local environment, so the field names and filter syntax were checked against the official Wireshark display-filter reference and manual pages rather than by executing `tshark` locally.
- I locally validated the Scapy example against the installed Scapy package and confirmed the `tcpdump` BPF expression parses correctly.
- RFC 8021 deprecates generation of IPv6 atomic fragments, but they remain relevant to defensive detection because legacy systems and malicious traffic can still produce them.
