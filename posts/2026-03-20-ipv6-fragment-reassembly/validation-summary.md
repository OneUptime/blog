# Validation Summary: How to Handle IPv6 Fragment Reassembly

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 fragmentation and reassembly
- ICMPv6
- Linux kernel IPv6 and Netfilter fragment sysctls
- Python
- tcpdump

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc4443
- RFC 6946, "Processing of IPv6 'Atomic' Fragments": https://www.rfc-editor.org/rfc/rfc6946.html
- RFC 7739, "Security Implications of Predictable Fragment Identification Values": https://www.rfc-editor.org/rfc/rfc7739.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel conntrack sysctl documentation: https://docs.kernel.org/6.8/networking/nf_conntrack-sysctl.html
- Local verification on the review machine: `tcpdump --help`, `tcpdump -d 'icmp6 and ip6[40] == 3 and ip6[41] == 1'`, `/proc/sys/net/ipv6/ip6frag_*`, `/proc/sys/net/netfilter/nf_conntrack_frag6_*`, and `/proc/net/snmp6`

## Issues Found
- The Linux procfs/sysctl examples used incorrect IPv6 fragment paths and variable names (`/proc/sys/net/ipv6/netfilter/ip6_frag_*`). I corrected them to the native IPv6 sysctls (`/proc/sys/net/ipv6/ip6frag_*`) and clarified that `nf_conntrack_frag6_timeout` is a separate Netfilter conntrack setting.
- The timeout unit comments were wrong. The post described the native IPv6 timeout as "in jiffies" and the conntrack timeout as nanoseconds, but the kernel documentation defines both as seconds. I corrected those comments.
- The low-threshold description was inaccurate. I changed it to reflect that `ip6frag_low_thresh` is the memory target after shedding begins once the high threshold is exceeded.
- The ICMPv6 timeout explanation said the message goes to the source of the "first fragment received". RFC 8200 is more specific: the Time Exceeded message is sent only if the fragment with Fragment Offset 0 has been received. I corrected both the prose and the reassembly algorithm summary.
- The Python example over-claimed RFC 8200 conformance while only reconstructing fragment payload bytes and omitting important checks. I adjusted the wording to make it explicitly illustrative, removed the unused import, and added checks for 8-byte alignment rules, maximum reassembled size, atomic fragments, overlap handling, queue timeout reset behavior, and contiguous coverage before reassembly.
- The atomic-fragment security note was incorrect. It said a spoofed ICMPv6 Packet Too Big with a large MTU forces atomic fragments; RFC 6946 describes the issue for reported MTUs below 1280. I corrected that and clarified that RFC 6946-compliant processing removes the reassembly vector, while RFC 7739 helps reduce Identification-collision attacks.
- The conclusion now states the 60-second deadline relative to the first-arriving fragment, matching RFC 8200.

## Review Notes
- The `tcpdump` expression is syntactically valid on the review machine, but it assumes the ICMPv6 header appears immediately after the outer IPv6 header in the packet being captured.
- The Python code now accurately presents itself as an illustrative fragment-payload reassembler. A production IPv6 stack would still need full header parsing, ICMP generation, and additional protocol integration beyond this example.
