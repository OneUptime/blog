# Validation Summary: How to Craft and Analyze IPv6 Packets with Python Scapy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Scapy
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- TCP
- UDP
- DNS

## Sources Consulted
- Scapy installation documentation: https://scapy.readthedocs.io/en/latest/installation.html
- Scapy `inet6` API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Scapy usage documentation (`sr1`, `send`, `sendp`): https://scapy.readthedocs.io/en/stable/usage.html
- Scapy `sendrecv` API reference: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy troubleshooting notes for loopback IPv6 and TCP reset behavior: https://scapy.readthedocs.io/en/latest/troubleshooting.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 5095, Deprecation of Type 0 Routing Headers in IPv6: https://www.rfc-editor.org/rfc/rfc5095.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Local Scapy 2.7.0 runtime sanity checks in a temporary install target to confirm packet construction and field names

## Issues Found
- The Router Advertisement example used `prefix="2001:db8:home::"`, which is not a valid IPv6 literal. I changed it to `2001:db8:1::` so the example builds correctly with Scapy.
- The basic send/receive example expected a reply from `2001:db8::1`, which is documentation space reserved by RFC 3849 and not meant to be routable. I changed that example to `::1` so the `sr1()` echo-request example matches Scapy's documented IPv6 loopback behavior.
- The TCP example's cleanup `RST` packet did not include the sequence number needed to reset the half-open connection correctly. I updated the SYN example to use an explicit random initial sequence number and changed the `RST` to reuse the original source port and `resp[TCP].ack`.
- The UDP DNS example used a reserved documentation address and omitted an explicit client source port, which leaves Scapy's default UDP source port at 53. I changed it to use an example reachable IPv6 resolver address and set `sport=RandShort()` to model a real client query.
- The Fragment-header example comment implied that adding `IPv6ExtHdrFragment()` simulates full fragmentation. I corrected the comment to state that the header alone does not split the packet into multiple fragments.
- The conclusion claimed Scapy handles "all IPv6 packet types" and implied raw-packet privileges are always required. I narrowed that wording to "common IPv6 packet types" and clarified that live injection/sniffing usually requires root or the relevant capabilities.

## Review Notes
- The NDP examples use the current Scapy IPv6 layer classes and valid field names for Scapy 2.7.x.
- `sniff(filter="ip6")` is valid Scapy usage, but BPF filter support may depend on libpcap availability on the host platform.
- The Routing Header example still uses `IPv6ExtHdrRouting()` with the default Type 0 routing header, but the post already correctly labels it as deprecated and for study only, which aligns with RFC 5095.
