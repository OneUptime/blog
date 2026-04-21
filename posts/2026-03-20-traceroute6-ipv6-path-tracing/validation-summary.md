# Validation Summary: How to Use traceroute6 for IPv6 Path Tracing

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- IPv6
- traceroute / traceroute6
- ICMPv6 Time Exceeded messages
- Linux network diagnostics
- Bash shell snippets
- ECMP-aware Paris-style traceroute probing with scamper

## Sources Consulted
- Linux `traceroute(8)` manual: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Ubuntu Noble `traceroute` package metadata and downloaded `traceroute.db --help` output for version `1:2.1.5-1`
- Debian `scamper(1)` manual: https://manpages.debian.org/testing/scamper/scamper.1.en.html
- Debian package tracker for `paris-traceroute`: https://tracker.debian.org/pkg/paris-traceroute
- RFC 8200, Internet Protocol Version 6 specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 4443, ICMPv6 specification: https://datatracker.ietf.org/doc/rfc4443/
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/info/rfc3849

## Issues Found
- The introduction said `traceroute6` sends UDP or ICMPv6 packets, but the Linux `traceroute` implementation also supports TCP probes. Updated it to say UDP is default and ICMPv6/TCP are selectable modes.
- The ICMPv6 example used `2001:db8::1` as a live target even though `2001:db8::/32` is reserved for documentation. Changed the command to use Google's public IPv6 DNS address.
- The post said ICMPv6 and TCP modes require root. Current Linux systems may allow some probe types through capabilities or ping sockets, so the comments now say they may require root/CAP_NET_RAW.
- The packet-size example used `traceroute6 -l 100`, but Linux `traceroute` uses `-l` for the IPv6 flow label and accepts packet length as a positional argument. Changed it to `traceroute6 ipv6.google.com 100`.
- The sample output contained invalid IPv6 addresses (`2001:db8:isp::1` and `2001:db8:transit::1`). Replaced them with valid documentation-prefix addresses.
- The source-address example used a documentation-prefix address without saying it was a placeholder. Updated the comment to say it must be replaced with an IPv6 address assigned to the host.
- The interpretation of `* * *` was too narrow and implied only firewall-blocked ICMPv6 Time Exceeded messages. Updated it to include timeout, filtering, rate limiting, and ignored probes.
- The RTT guidance implied that one high-latency intermediate hop proves congestion or distance. Updated it to distinguish persistent downstream latency from isolated intermediate-hop ICMPv6 rate limiting or control-plane deprioritization.
- The hop-count snippets used `grep -c "ms"`, which counts only responding hops and misses `* * *` hops. Replaced those with `awk` that records the last hop number printed.
- The script described comparing different destinations as asymmetric-routing detection. A one-sided traceroute to different targets does not prove forward/reverse asymmetry, so the wording now says it compares traces to different targets.
- The Paris-traceroute install command used `sudo apt install -y paris-traceroute`, but the Debian tracker marks the package as removed from current distributions and it is not available in the current Ubuntu Noble apt metadata checked locally. Replaced the section with a currently packaged `scamper` Paris-style UDP traceroute example.
- The loop-detection snippet parsed every line, including the traceroute header, and used a documentation-only target address. It now filters numbered hop lines and uses a routable IPv6 target.
- The "leaves your AS" comment was misleading because `traceroute6 -n` does not perform AS lookups. Changed it to checking the first few hops to see where the path leaves the local network.

## Review Notes
The commands assume the Linux `traceroute` package behavior where `traceroute6` is equivalent to `traceroute -6`; older or alternate `traceroute6` implementations can have different option sets. Network traces were not executed because results are environment-dependent and the tools were not installed globally, but command syntax was checked against manpages, package help output, and Bash syntax validation.
