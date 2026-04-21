# Validation Summary: How to Understand SRv6 End Functions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SRv6 network programming
- RFC 8986 endpoint behaviors
- Linux `iproute2`
- Linux `seg6local` route actions
- IPv4/IPv6 L3VPN forwarding and VRF table lookup

## Sources Consulted
- RFC 8986, "Segment Routing over IPv6 (SRv6) Network Programming": https://datatracker.ietf.org/doc/html/rfc8986
- Linux `ip-route(8)` manual page for `seg6local` actions: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Debian iproute2 `ip-route(8)` manual page with `vrftable` requirements: https://manpages.debian.org/bookworm-backports/iproute2/ip-route.8.en.html
- Local `iproute2` 6.1.0 `ip -6 route help` output

## Issues Found
- The endpoint overview said all End functions advance to the next segment when `Segments Left > 0`. RFC 8986 distinguishes transit behaviors from decapsulation behaviors: End, End.X, and End.T require nonzero `Segments Left`, while End.DX4, End.DX6, End.DT4, End.DT6, and End.DT46 are last-segment decapsulation behaviors that require `Segments Left = 0` or no SRH. Updated the overview and End description to reflect this.
- The End.X and End.DX4 command examples used inline comments after a line-continuation backslash (`\   # comment`), which is not pasteable shell syntax. Moved those comments outside the continued command lines.
- The End.DT4, End.DT6, and End.DT46 examples used `vrftable` with `dev lo`. The `ip-route(8)` documentation says `vrftable` requires a VRF device associated with the table ID and VRF strict mode. Updated the examples to use `dev vrf100`, `dev vrf200`, and `dev vrf300`, with comments noting the strict-mode prerequisite.
- The End.T use case described the behavior as VRF-based forwarding. RFC 8986 defines End.T as a specific IPv6 FIB table lookup for multi-table operation in the core. Updated the use case wording.
- The summary table used generic `IPv4`, `IPv6`, and `VRF` column labels, which could imply that non-decapsulating End behaviors do not operate on IPv6 packets. Updated the labels to `Inner IPv4`, `Inner IPv6`, and `Specific Table/VRF`.
- The End.B6.Encaps wording said it encapsulates with a new SRH. RFC 8986 and `ip-route(8)` describe it as encapsulating in a new outer IPv6 header followed by an SRH. Updated the wording.

## Review Notes
The Linux examples are illustrative and still assume normal SRv6 prerequisites: kernel SRv6 support, appropriate privileges, IPv6 forwarding/SRv6 sysctls where needed, reachable next hops, existing interfaces, and pre-created VRF devices for the `vrftable` examples.
