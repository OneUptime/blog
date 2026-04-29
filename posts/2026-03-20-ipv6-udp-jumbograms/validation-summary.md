# Validation Summary: How to Use UDP with IPv6 Jumbograms

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- UDP
- IPv6 jumbograms / Jumbo Payload option
- Python socket programming
- Linux socket behavior and sysctl tuning

## Sources Consulted
- RFC 2675, "IPv6 Jumbograms": https://www.rfc-editor.org/rfc/rfc2675
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200
- RFC 6434, "IPv6 Node Requirements": https://www.rfc-editor.org/rfc/rfc6434
- RFC 6891, "Extension Mechanisms for DNS (EDNS(0))": https://www.rfc-editor.org/rfc/rfc6891
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `udp(7)` man page: https://man7.org/linux/man-pages/man7/udp.7.html
- Linux `ip(7)` man page: https://man7.org/linux/man-pages/man7/ip.7.html
- Local Linux `sysctl(8)` man page
- Local `ip link help` output

## Issues Found
- The checksum example returned the raw 16-bit one's-complement result, but IPv6 UDP cannot transmit a zero checksum. I changed the function to return `0xFFFF` when the computed checksum is zero, matching RFC 8200.
- The Linux sending section implied that setting an interface MTU to 9000 was part of using IPv6 jumbograms. That was incorrect: true IPv6 jumbograms require the Jumbo Payload hop-by-hop option and are only applicable on paths with MTUs above 65,575 octets. I rewrote that explanation to distinguish ordinary large UDP datagrams from true jumbograms.
- The Linux example sent to `2001:db8::1`, which is a documentation prefix and would not generally work as a live destination. I changed the example to send to `::1` so the sample is runnable on a typical Linux host.
- Several practical examples were inaccurate or misleading for UDP jumbograms. `NFS over RDMA`, `MPI over UDP`, and `iSCSI over UDP` were not appropriate examples as written. I replaced them with accurate, protocol-neutral use cases that fit RFC 2675 and RFC 6434.
- The DNS/EDNS0 example overstated the relationship to jumbograms. I corrected it to note that EDNS0 advertises larger UDP payload sizes but does not imply practical use of IPv6 jumbograms.

## Review Notes
- The post now correctly distinguishes jumbo Ethernet frames from IPv6 jumbograms.
- The Linux sample remains a near-limit standard IPv6 UDP example, not a full end-to-end jumbogram construction example. That is accurate after the edits, but a future revision could add a true packet-construction example if desired.
