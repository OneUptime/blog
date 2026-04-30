# Validation Summary: How to Use IPv6 Flow Labels for Application Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Flow Label
- Linux kernel IPv6 sysctls
- Python `socket` AF_INET6 API
- Linux ECMP routing with `ip`
- Linux traffic control with `tc u32`
- Packet inspection with `tcpdump` and Wireshark

## Sources Consulted
- RFC 6437: IPv6 Flow Label Specification — https://www.rfc-editor.org/rfc/rfc6437
- RFC 7098: Using the IPv6 Flow Label for Load Balancing in Server Farms — https://www.rfc-editor.org/rfc/rfc7098.html
- Linux kernel IP sysctl documentation — https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Python `socket` module documentation — https://docs.python.org/3/library/socket.html
- Linux `ipv6(7)` manual page — https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `tc-u32(8)` manual page — https://man7.org/linux/man-pages/man8/tc-u32.8.html
- Linux `tc-flower(8)` manual page — https://man7.org/linux/man-pages/man8/tc-flower.8.html

## Issues Found
- The introduction and Flow Label explanation implied the label alone identifies a flow. I corrected this to match RFC 6437, which describes classification using the flow label together with the source and destination addresses, and clarified that zero means unlabeled traffic.
- The Linux section said flow labels are automatically assigned without mentioning the documented `net.ipv6.auto_flowlabels` control. I updated the text and commands to check the relevant sysctl.
- The `flowlabel_reflect = 7` comment was wrong. I changed it from an incorrect TCP/UDP/ICMP mapping to the documented meaning: established flows, TCP RST packets, and ICMPv6 echo replies.
- The Python example used a Linux-specific numeric `IPV6_FLOWINFO_SEND = 33` socket option even though the documented Python API already supports AF_INET6 `flowinfo` in the address tuple. I removed the unnecessary socket option and kept the example within the official Python API.
- The Python example described the UDP code as applying to an HTTP/2 stream. I corrected the prose so the example matches the protocol actually used by the code.
- The ECMP section incorrectly said `net.ipv6.fib_multipath_hash_policy = 2` means “L3 + flow label” and is the default. I corrected it to the documented IPv6 Layer 3 policy `0`, which includes source and destination addresses plus the flow label.
- The `tc` section used `flower` as if it could match IPv6 flow labels directly, but the documented `tc-flower(8)` keys do not include a flow-label matcher. I replaced it with the documented `tc u32` `match ip6 flowlabel` form and removed the incorrect header-bit explanation.
- The conclusion referenced NAT in a way that overstated the purpose of flow labels. I reworded it to the accurate benefit: avoiding transport-layer parsing or per-flow state for classification.

## Review Notes
Linux sysctl defaults can vary by kernel version and distribution, so readers should verify current values with `sysctl` on the target system. The post is now technically sound as a Linux-focused guide.
