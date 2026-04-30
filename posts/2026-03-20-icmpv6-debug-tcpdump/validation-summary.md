# Validation Summary: How to Debug ICMPv6 Issues with tcpdump

## Status
validated

## Post Type
Guide

## Technologies Covered
- `tcpdump`
- libpcap / BPF filter syntax
- ICMPv6
- IPv6 Neighbor Discovery Protocol (NDP)
- Path MTU Discovery (PMTUD)
- `ping6` / iputils `ping`
- `traceroute6`

## Sources Consulted
- `tcpdump(8)` manual page from the installed `tcpdump` 4.99.4 package
- `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ping(8)` iputils manual page: https://man7.org/linux/man-pages/man8/ping.8%40%40iputils.html
- `traceroute(8)` manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- GNU Coreutils `timeout` documentation: https://www.gnu.org/software/coreutils/timeout
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862

## Issues Found
- The post described the ICMPv6 filters as raw IPv6 byte offsets without noting the limitation around IPv6 extension headers. I updated the examples to use `icmp6[icmp6type]` / `icmp6[icmp6code]` and added a note that these filters assume ICMPv6 follows the IPv6 header directly.
- The post said `-vv` was the maximum tcpdump verbosity level. I corrected this to say `-vv` provides more detail, because `tcpdump` also supports `-vvv`.
- Several `tcpdump` examples piped output into `tee` or `awk` without `-l`, which can delay live output because of buffering. I added `-l` to the piped examples.
- Several placeholder IPv6 literals were not syntactically valid commands as written, such as `2001:db8::server`, `2001:db8::your_address`, and `2001:db8::neighbor`. I replaced them with valid documentation-prefix example addresses.
- The PMTU probing loop relies on Linux iputils behavior (`ping6 -M do`), and the bounded NDP capture relies on GNU `timeout`. I labeled those examples as Linux/iputils or Linux/GNU specific so the portability claim stays accurate.
- The traceroute capture example assumed the traditional UDP traceroute method. I narrowed the wording to say it captures the full traditional UDP `traceroute6` exchange.
- The NDP troubleshooting note said no NA within 1 second implies failure. I corrected that to a safer statement about seeing NS retries with no NA response, since Neighbor Discovery timing is configurable.

## Review Notes
- The ICMPv6 type and code values used in the post are consistent with RFC 4443.
- The NDP message types and DAD behavior described in the post are consistent with RFC 4861 and RFC 4862.
- The traceroute UDP port range starting at 33434 matches the traditional default method documented by `traceroute(8)`.
