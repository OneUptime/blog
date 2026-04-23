# Validation Summary: How to Read and Interpret IPv4 Header Fields

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv4 packet header structure and fragmentation fields
- `tcpdump` and libpcap filter syntax
- Wireshark display filters
- Python (`struct`, `socket`)
- ICMP and Path MTU Discovery diagnostics
- Linux networking behavior (`ping`, default TTL)

## Sources Consulted
- RFC 791: Internet Protocol — https://www.rfc-editor.org/rfc/rfc791
- RFC 2474: Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers — https://www.rfc-editor.org/rfc/rfc2474.html
- RFC 3168: The Addition of Explicit Congestion Notification (ECN) to IP — https://www.rfc-editor.org/rfc/rfc3168
- RFC 6864: Updated Specification of the IPv4 ID Field — https://www.rfc-editor.org/rfc/rfc6864
- RFC 792: Internet Control Message Protocol — https://www.rfc-editor.org/rfc/rfc792
- IANA Differentiated Services Field Codepoints (DSCP) Registry — https://www.iana.org/assignments/dscp-registry/dscp-registry.xhtml
- IANA Protocol Numbers Registry — https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- Wireshark Display Filter Reference: Internet Protocol Version 4 — https://www.wireshark.org/docs/dfref/i/ip.html
- Python `struct` documentation — https://docs.python.org/3/library/struct.html
- Python `socket` documentation — https://docs.python.org/3/library/socket.html
- Linux Kernel IP Sysctl documentation — https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- `tcpdump(8)` manual page — https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `pcap-filter(7)` manual page — https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ping(8)` manual page — https://man7.org/linux/man-pages/man8/ping.8.html

## Issues Found
1. The explanation of `tos 0x10` was incorrect. It described `0x10` as an Assured Forwarding DSCP, but the modern DS field format uses the upper 6 bits for DSCP and the lower 2 bits for ECN. I changed the text to describe `0x10` as the IPv4 TOS/DS field value and to decode it as DSCP 4, ECN 0.

2. The post said `tcpdump -v` shows the "full IPv4 header." The `tcpdump(8)` manual documents `-v` as adding verbose IPv4 header information such as TTL, ID, total length, and options. I changed this to "key IPv4 header fields" to avoid overstating what the flag does.

3. The explanation of `length 1500` overstated the meaning of the field. IPv4 `length` is the total IP packet length, and 1500 only equals the path MTU when the relevant link MTU is also 1500. I changed the text to say it matches a common Ethernet MTU and is only significant for fragmentation if some path link is smaller.

4. The Python example mixed up the DS field and DSCP and overstated its scope. I changed the output to print the DS field with separate DSCP and ECN values, updated protocol 41 to the official IANA name "IPv6 encapsulation," and changed the docstring to clarify that the function interprets the fixed IPv4 base header rather than all possible option-bearing headers.

5. Two troubleshooting rows were too strong. I softened the TTL=1 row so it describes a possible long path or routing loop rather than implying a loop by default, and I changed the IP ID row so predictable IDs are described as a weak fingerprint instead of proof that packets came from the same host.

6. The PMTUD section said that if a large ping fails and a smaller one succeeds, ICMP is blocked. That conclusion is too strong. I changed it to the accurate interpretation: either the path MTU is smaller somewhere or ICMP fragmentation-needed messages are not reaching the sender. I also marked the `ping -M do` example as Linux-specific.

## Review Notes
- The command examples assume Linux tooling and naming. `ping -M` is Linux-specific, and interface names such as `eth0` may differ on many systems.
- The Python snippet intentionally decodes only the fixed 20-byte IPv4 base header. If `IHL > 5`, additional parsing is required to decode IPv4 options.
