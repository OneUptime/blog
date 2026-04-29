# Validation Summary: How to Use the IPv6 Traffic Class for ECN (Explicit Congestion Notification)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Traffic Class
- Explicit Congestion Notification (ECN)
- TCP ECN negotiation
- Linux TCP sysctls
- `tcpdump`
- `ss`
- Linux traffic control (`tc`, FQ-CoDel, CAKE)
- Python

## Sources Consulted
- RFC 3168, "The Addition of Explicit Congestion Notification (ECN) to IP" — https://www.rfc-editor.org/rfc/rfc3168
- Linux kernel networking sysctl documentation (`tcp_ecn`, `tcp_ecn_fallback`) — https://docs.kernel.org/networking/ip-sysctl.html
- `ss(8)` manual page — https://man7.org/linux/man-pages/man8/ss.8.html
- `pcap-filter(7)` manual page — https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tcpdump(8)` manual page — https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `tc-fq_codel(8)` manual page — https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- `tc-cake(8)` manual page — https://man7.org/linux/man-pages/man8/tc-cake.8.html
- RFC 8289, "Controlled Delay Active Queue Management" — https://www.rfc-editor.org/rfc/rfc8289.html

## Issues Found
- The Linux `net.ipv4.tcp_ecn` value descriptions were outdated. Current kernel documentation includes values `0` through `5`, with `3` through `5` covering Accurate ECN (AccECN). I updated the comments so the setting descriptions match current Linux documentation.
- The `ss` verification command was incorrect. The post used `ss -6 -n -t info`, but the correct option is `-i` / `--info`. I changed it to `ss -6 -n -t -i | grep ecn`.
- The IPv6 `tcpdump` filter was invalid for the stated purpose. The original `tcp[13]` expression is not suitable for IPv6 here, and `pcap-filter(7)` documents that `tcp[...]` indexing only applies to IPv4. I replaced it with `ip6 protochain 6`, which works for IPv6 TCP capture, and corrected the example flags.
- The example `tcpdump` flags were wrong. `tcpdump` uses `W` for CWR, not `C`, so an ECN-capable SYN is shown as `Flags [SWE]`, not `Flags [SEC]`. I corrected the example and explanation.
- The Python example mislabeled `0xBA` as `ECT(1)`. The low two bits of `0xBA` are `10`, which is `ECT(0)`. I corrected the comment and also fixed the `Not-ECT` label text.
- The CAKE reference to RFC 8289 was incorrect. RFC 8289 documents CoDel, not CAKE. I removed that RFC association and rewrote the line to describe CAKE accurately based on its manual page.
- The qdisc verification note was inaccurate for CAKE. `fq_codel` explicitly shows `ecn`, while CAKE exposes ECN activity through statistics such as `marks`. I updated the verification command to `tc -s qdisc show dev eth0` and corrected the explanation.
- The TCP congestion explanation was overstated in two places. Loss does not necessarily mean TCP enters slow start immediately, and ECN does not guarantee zero loss. I softened that language to match RFC 3168 behavior more closely.
- The sequence diagram wording around CWR was imprecise. I changed it from "CWR flag = acknowledged" to "CWR flag set" to match TCP ECN signaling semantics.

## Review Notes
- The post is now technically sound for a Linux-focused guide. Note that `ip6 protochain` filters are more robust for IPv6 extension headers, but they are slower than simpler filters, as documented in `pcap-filter(7)`.
- Linux now documents Accurate ECN (AccECN) values in addition to classic RFC 3168 ECN values. The post remains focused on classic ECN by setting `net.ipv4.tcp_ecn=1`, which is still valid.
