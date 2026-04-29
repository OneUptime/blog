# Validation Summary: How TCP Handles IPv6 Jumbograms with MSS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- TCP
- TCP Maximum Segment Size (MSS)
- IPv6 jumbograms
- Path MTU Discovery
- Linux `ethtool` offload settings (`TSO`, `GSO`)
- Linux TCP `sysctl` tuning

## Sources Consulted
- RFC 2675, "IPv6 Jumbograms": https://datatracker.ietf.org/doc/html/rfc2675
- RFC 6691, "TCP Options and Maximum Segment Size (MSS)": https://datatracker.ietf.org/doc/html/rfc6691
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 7323, "TCP Extensions for High Performance": https://datatracker.ietf.org/doc/html/rfc7323
- Linux kernel documentation, "Segmentation Offloads": https://docs.kernel.org/networking/segmentation-offloads.html
- Linux kernel documentation, "IP Sysctl": https://docs.kernel.org/networking/ip-sysctl.html
- `ethtool(8)` manual page: https://man7.org/linux/man-pages/man8/ethtool.8.html

## Issues Found
- The description and introduction used `65495` and subtracted the IPv6 header from the IPv6 Payload Length limit. I corrected this to `65515` and clarified that the IPv6 Payload Length excludes the 40-byte IPv6 header but includes the TCP header.
- The standard-limits block implied that TCP options reduce the MSS option value. I corrected it to match RFC 6691: TCP options reduce the TCP data in a given packet, while the advertised MSS is based on the fixed IP and TCP headers.
- The jumbogram section said a jumbogram path starts above `65535` bytes and described larger-than-65535 MSS negotiation as wraparound or implementation-specific behavior. I corrected this to the RFC 2675 rules: jumbograms require link MTU greater than `65575`, senders advertise MSS `65535`, receivers treat that value as "infinity", and the actual send MSS comes from Path MTU Discovery.
- The jumbogram explanation said TCP needs no protocol changes. I corrected this to note RFC 2675's special handling for the MSS option and the TCP Urgent Pointer.
- The Python scenario labeled `65535` as the maximum standard IPv6 packet size. I corrected the example to use `65575`, which is the maximum non-jumbogram IPv6 packet size including the 40-byte IPv6 header, and verified the snippet runs.
- The Linux tuning section said `sysctl -p` persists runtime changes. I corrected the note to explain that `sysctl -p` reloads values from `/etc/sysctl.conf` after those settings are written there.
- The BBR comments were too unconditional. I narrowed them to examples that apply only when BBR is available on the host.

## Review Notes
- True IPv6 jumbograms are uncommon in production; the post's conclusion correctly emphasizes that 9000-byte jumbo frames are the more practical optimization today.
- The Linux commands are distribution/kernel dependent and assume root privileges plus host support for the chosen congestion-control algorithm.
