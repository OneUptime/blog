# Validation Summary: How to Understand IPv6 Maximum Packet Lifetime

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4 TTL and IPv6 Hop Limit
- ICMPv6 and Neighbor Discovery Protocol (NDP)
- `ping6`, `traceroute6`, and `tcpdump`
- Python

## Sources Consulted
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://www.rfc-editor.org/rfc/rfc4861.html
- `ping(8)` iputils manual: https://man7.org/linux/man-pages/man8/ping.8.html
- `pcap-filter(7)` libpcap manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tcpdump(8)` manual: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Apple `ping6(8)` man page: https://manp.gs/mac/8/ping6
- `traceroute(8)` manual: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Microsoft Learn IPv6 configuration example showing a current hop limit of 128 on Windows: https://learn.microsoft.com/en-us/windows/win32/winsock/configuration-1-single-subnet-with-link-local-addresses-2

## Issues Found
- The post said routers must forward packets with `HL >= 1`. RFC 8200 is stricter: a forwarding node decrements Hop Limit by 1 and discards the packet if it is `0` on receipt or becomes `0` after decrement. I corrected the prose and summary block to match the RFC behavior.
- The sample Python output values were wrong for the `HL=64`, `HL=128`, and `HL=255` examples. I recalculated the output from the code and updated the published values.
- The `HL=1` scenario label said "Link-local only", which conflated hop limit with IPv6 address scope. I changed it to "Same-link only" because `HL=1` limits routed forwarding, not address type.
- The macOS `ping6` example used `-m` to set hop limit. Apple `ping6(8)` documents `-h` as the hop-limit flag, while `-m` controls fragmentation behavior. I corrected the command.
- The IPv6 `tcpdump` example used `tcp[13] == 2`. `pcap-filter(7)` documents transport-layer arithmetic like `tcp[...]` as not working for IPv6 packets. I replaced the filter with `ip6 protochain 6` and adjusted the explanation so it refers to the received hop limit rather than claiming it reveals the sender's initial value.
- The NDP capture example used `ip6[40]` offsets and omitted ICMPv6 Redirect messages. I replaced it with an `icmp6[icmp6type]` filter covering types `133` through `137`, and clarified that only packets arriving from on-link neighbors can still have `HL=255`.
- The practical implications section made an unsupported absolute claim about all real internet paths being under 30 hops, and it said "The packet sends ICMPv6 Time Exceeded". I softened the path-length statement and corrected the ICMPv6 sender to the router.

## Review Notes
- The Python function is a heuristic estimate, not a protocol guarantee. Actual packet lifetime also depends on queuing, congestion, and path behavior.
- Command names vary by platform. Some Linux distributions prefer `ping -6` and `traceroute -6`, even though `ping6` and `traceroute6` remain valid on many systems.
