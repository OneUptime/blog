# Validation Summary: How to Analyze IPv6 Fragmentation with tcpdump

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 fragmentation
- ICMPv6 Path MTU Discovery
- tcpdump
- libpcap/pcap-filter syntax
- Linux `/proc/net/snmp6`
- Python 3

## Sources Consulted
- `pcap-filter(7)` manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tcpdump(8)` manual: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `ip(7)` manual: https://man7.org/linux/man-pages/man7/ip.7.html
- `ipv6(7)` manual: https://man7.org/linux/man-pages/man7/ipv6.7.html
- RFC 8200, IPv6 Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 8201, Path MTU Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc8201
- RFC 4443, ICMPv6: https://www.ietf.org/rfc/rfc4443
- Local verification with `tcpdump 4.99.4` / `libpcap 1.10.4`, including compiled filter checks and sample packet captures.

## Issues Found
- The post treated `ip6[6] == 44` as the general IPv6 fragment filter. Per `pcap-filter(7)`, `ip6 proto` does not chase the IPv6 extension-header chain, so `ip6[6] == 44` only matches when the Fragment Header immediately follows the base IPv6 header. I changed the general fragment-capture examples to `ip6 protochain 44` and kept the fixed-offset flag examples explicitly scoped to the immediate-header case.
- The "last fragments" example said `Offset != 0` but the filter only checked `More = 0`. I corrected the filter to test both the M flag and the non-zero offset bits.
- The ICMPv6 Packet Too Big example used `ip6[40] == 2`, which assumes a fixed header layout. I changed it to `icmp6[icmp6type] == icmp6-packettoobig` and clarified the comment so the scope matches what the filter can actually detect.
- The sample `tcpdump` fragment output format was incorrect for current `tcpdump`. Actual output is of the form `frag (0xID:OFFSET|LENGTH)`. I updated the example and the explanation accordingly.
- The Python parser regex matched the wrong fragment format, so it would miss current `tcpdump` output. I updated the regex to the current `frag (0xID:OFFSET|LENGTH)` form.
- The Python example could raise `subprocess.TimeoutExpired` and fail outright if the requested packet count was not reached within 30 seconds. I added timeout handling so partial capture output is still analyzed.
- The fragment-count/progress examples piped `stderr` into `awk`, which would also count `tcpdump` summary lines on exit. I removed `2>&1`, added `-l` for live piping, and adjusted the descriptions so they match what the commands actually do.
- The `/proc/net/snmp6` grep used `ReasmR|Frag`, which omitted `Ip6ReasmOKs` and `Ip6ReasmFails` despite the comments listing them. I corrected the regex to `Reasm|Frag`.
- The UDP test claimed "`UDP doesn't do PMTUD by default, so it will fragment`". That is inaccurate for IPv6 and Linux socket behavior. I changed the text to explain that a large UDPv6 send may fragment at the source or fail with `EMSGSIZE`, and I updated the snippet to report either outcome explicitly.
- The timestamp example claimed microsecond precision without explicitly requesting it. I added `--micro` so the command matches the explanation.

## Review Notes
- `ip6 protochain` is the correct general filter for IPv6 fragments, but `pcap-filter(7)` notes that `protochain` filters are more complex and may be slower than simple fixed-offset filters.
- Type-specific ICMPv6 filtering remains easiest when ICMPv6 follows the IPv6 header directly. If arbitrary extension headers may precede ICMPv6, a broader capture plus post-filtering of `tcpdump` output is often more reliable.
