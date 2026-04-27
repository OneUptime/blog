# Validation Summary: How to Optimize IPv6 for Real-Time Applications (VoIP, Video)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 (RFC 8200) Traffic Class field and Flow Label
- DSCP (DiffServ Code Point, RFC 2474) — EF (46), CS3 (24)
- ip6tables `mangle` table with the `DSCP` target
- Python `socket` module (AF_INET6, IPPROTO_IPV6, IPV6_TCLASS)
- Linux `tc` (Traffic Control): HTB qdisc, SFQ qdisc, u32 classifier
- Linux sysctl tuning (`net.ipv4.tcp_congestion_control`, `net.core.default_qdisc`, `net.ipv6.conf.*.use_tempaddr`, `net.ipv6.neigh.default.gc_stale_time`)
- Measurement tools: iperf3, ping6, RTP tools

## Sources Consulted
- [RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification](https://datatracker.ietf.org/doc/html/rfc8200) — IPv6 header and Traffic Class layout
- [RFC 2474 — Definition of the Differentiated Services Field (DS Field)](https://datatracker.ietf.org/doc/html/rfc2474) — DSCP encoding (upper 6 bits of TOS/TC byte)
- [RFC 3246 — An Expedited Forwarding PHB](https://datatracker.ietf.org/doc/html/rfc3246) — EF DSCP value 46
- [RFC 3168 — The Addition of Explicit Congestion Notification (ECN) to IP](https://datatracker.ietf.org/doc/html/rfc3168) — ECN occupies the lower 2 bits of the DS field
- [Linux kernel `include/uapi/linux/in6.h`](https://github.com/torvalds/linux/blob/master/include/uapi/linux/in6.h) — `IPV6_TCLASS = 67`
- [`ipv6(7)` Linux man page](https://man7.org/linux/man-pages/man7/ipv6.7.html) — IPV6_TCLASS socket option semantics
- [`tc-u32(8)` Linux man page](https://man7.org/linux/man-pages/man8/tc-u32.8.html) — u32 classifier and `ip6 priority` selector
- [LARTC HOWTO — Filtering IPv6 Traffic](https://lartc.org/howto/lartc.adv-filter.ipv6.html) — IPv6 priority/DSCP matching with u32
- [`iptables-extensions(8)`](https://man7.org/linux/man-pages/man8/iptables-extensions.8.html) — `DSCP` target with `--set-dscp`
- [Linux kernel `Documentation/networking/ip-sysctl.rst`](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt) — sysctl reference

## Issues Found

1. **Incorrect `tc` u32 filter for matching IPv6 DSCP.**
   The original filter `u32 match u8 0xb8 0xfc at 1` is wrong for IPv6. IPv4 places the entire TOS/DSCP byte at offset 1 of the IP header, but in IPv6 the 8-bit Traffic Class field straddles the byte boundary: TC[7:4] sits in the lower nibble of byte 0 and TC[3:0] sits in the upper nibble of byte 1. A single `u8 ... at 1` therefore cannot capture the DSCP correctly. Fixed by switching to the IPv6-aware `match ip6 priority 0xb8 0xfc` selector, which is the documented way to match the IPv6 Traffic Class with `tc u32` (see `tc-u32(8)` and the LARTC HOWTO). Added a one-line comment explaining why a raw byte offset is unsafe here.

2. **`net.ipv4.tcp_delack_min` is not a standard mainline sysctl.**
   This knob is not exposed in mainline Linux — `/proc/sys/net/ipv4/tcp_delack_min` only existed historically on some Red Hat MRG / RT kernels and was later removed even there (see Red Hat solution KB 62216 / 699493). On a typical distribution kernel writing to this key fails with "No such file or directory". The accompanying comment ("important for RTP over TCP") was also misleading because RTP is virtually always carried over UDP. Fixed by removing the line and its comment rather than substituting a different knob, since the rest of the sysctl block remains valid and self-contained.

## Review Notes
- DSCP encoding facts are correct: `EF = 46`, `CS3 = 24`, and `46 << 2 = 0xB8` for the full TC byte with `ECN = 0`.
- `IPV6_TCLASS = 67` matches the value in `include/uapi/linux/in6.h`. Modern Python (3.11+) actually exposes `socket.IPV6_TCLASS` directly, so the hard-coded `67` is portable but no longer strictly necessary; leaving the explicit constant as the author wrote it since it works on all supported versions.
- The IPv6 socket `bind` 4-tuple `("::", 5004, 0, 0)` is correct (`host, port, flowinfo, scopeid`).
- `ip6tables -t mangle -j DSCP --set-dscp 46` is valid; `--set-dscp-class EF` would be an equivalent more readable form.
- `ping6` is being phased out in favor of `ping -6` in newer iputils releases, and `-i 0.02` requires `CAP_NET_RAW` / root. Both are minor stylistic notes, not technical errors.
- HTB rate/ceil values are illustrative; the `default 30` and class hierarchy are syntactically correct.
- BBR + `fq` is the correct pairing — BBR's pacing relies on the `fq` qdisc on older kernels (newer kernels have internal pacing, but using `fq` is still standard guidance).
