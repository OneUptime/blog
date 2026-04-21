# Validation Summary: How to Use tracepath to Discover Path MTU on Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux `tracepath`
- Path MTU Discovery (PMTUD)
- Linux `ping`
- Linux `traceroute`
- `mtr`
- IPv4 and IPv6 MTU behavior
- GRE and VXLAN tunnel overhead

## Sources Consulted
- iputils `tracepath(8)` manual: https://man7.org/linux/man-pages/man8/tracepath.8.html
- iputils `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `traceroute(8)` manual: https://man7.org/linux/man-pages/man8/traceroute.8.html
- RFC 1191, Path MTU Discovery for IPv4: https://datatracker.ietf.org/doc/html/rfc1191
- RFC 8201, Path MTU Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc8201.html
- RFC 8200, IPv6 Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- Local command help/man output for `tracepath -h`, `ping -h`, `mtr --help`, and `man tracepath`

## Issues Found
- Corrected the description of `tracepath` from probing MTU at each hop to reporting PMTU changes, because `tracepath` displays Path MTU when it changes rather than a separate MTU value for every hop.
- Replaced `tracepath6` examples with `tracepath -6`, matching current iputils documentation and the installed command set.
- Corrected `asymm` and `back` explanations from reverse TTL wording to guessed return-hop count wording.
- Replaced the traceroute-style `* * *` no-response example with `tracepath`'s `no reply` output.
- Updated the `traceroute` comparison because Linux `traceroute` supports MTU discovery with `--mtu`; the default output still shows only hops.
- Qualified GRE and VXLAN overhead examples as likely indicators rather than definitive tunnel identification.
- Scoped the sample script to IPv4 by using `tracepath -4`, removed an unused `FINAL_PMTU` assignment, and labeled the MSS calculation as IPv4-specific.
- Clarified IPv6 fragmentation wording: IPv6 routers do not fragment packets in transit; source nodes may fragment when fragmentation is used.
- Updated the conclusion to say `tracepath` shows PMTU changes, not MTU at every hop.

## Review Notes
The `ping -M do` examples are valid for Linux iputils and correctly subtract 28 bytes for IPv4 ICMP echo payload sizing. For specialized manual probing above a cached PMTU, `ping -M probe` may also be useful because it bypasses kernel PMTU checks.
