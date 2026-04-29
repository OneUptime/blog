# Validation Summary: How to Monitor Multicast Traffic with tcpdump

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- tcpdump (4.x)
- libpcap / BPF filter syntax
- IPv4 multicast addressing
- IGMP (Internet Group Management Protocol)
- Linux networking
- Wireshark / pcap file format

## Sources Consulted
- `tcpdump(8)` man page (verified locally against tcpdump 4.99.4 / libpcap 1.10.4)
- `pcap-filter(7)` man page (BPF primitives: `host`, `dst net`, `ip proto`)
- IANA "IPv4 Multicast Address Space Registry" (https://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml)
- IANA "Protocol Numbers" registry — IGMP = protocol 2
- RFC 1112 (Host Extensions for IP Multicasting) — defines class D / 224.0.0.0/4
- RFC 2365 (Administratively Scoped IP Multicast) — 239.0.0.0/8
- RFC 3376 (IGMPv3) — 224.0.0.22 as IGMPv3 reports destination
- RFC 6762 (Multicast DNS) — 224.0.0.251
- RFC 2328 (OSPFv2) — 224.0.0.5 as AllSPFRouters

## Issues Found
No technical issues found.

All technical content verified:
- BPF filters (`dst net 224.0.0.0/4`, `host <ip>`, `ip proto 2`) are syntactically valid per pcap-filter(7).
- tcpdump flags (`-i`, `-n`, `-v`, `-vv`, `-c`, `-w`, `-r`, `-q`) are correct and current as of tcpdump 4.99.x.
- The IPv4 multicast range 224.0.0.0/4 is correct (RFC 1112).
- The link-local multicast range 224.0.0.0/24 is correct, and these packets are not forwarded by routers (TTL/scope-limited).
- IGMP is IP protocol 2 (IANA-registered).
- The well-known multicast addresses table is accurate: 224.0.0.1 (all hosts), 224.0.0.2 (all routers), 224.0.0.5 (OSPF AllSPFRouters), 224.0.0.22 (IGMPv3 reports), 224.0.0.251 (mDNS), 239.0.0.0/8 (administratively scoped).
- Sample IGMP output format matches tcpdump's actual print routines for IGMPv3 reports and IGMPv2 leave messages.
- `CAP_NET_RAW` is the correct Linux capability for raw packet capture.
- `tcpdump -i any` behavior and the note about no NIC hardware offload on the `any` pseudo-interface is accurate.

## Review Notes
- The "Checking Multicast Traffic Rate" example relies on the user pressing Ctrl+C to terminate tcpdump before the `awk` END block runs and prints the elapsed window. The command works correctly, but the comment "arriving in 10 seconds" implies automatic timing — a future improvement could prefix `timeout 10` (e.g., `sudo timeout 10 tcpdump …`) so the 10-second window is enforced without manual interruption. Not a correctness issue, so no edit was made.
- The IGMP example output mixes an IGMPv3 Membership Report (to 224.0.0.22) with an IGMPv2 Leave (to 224.0.0.2). This is realistic in mixed-version environments but worth noting; pure IGMPv3 networks express leaves as "BLOCK" state-change records sent to 224.0.0.22 instead.
- `ip proto 2` could equivalently be written as the BPF shorthand `igmp`; both are valid.
- `host 239.1.2.3` matches packets with that address as either source or destination; for multicast traffic the address only appears as a destination, so this works as intended.
