# Validation Summary: How to Understand Null Routes and Blackhole Routing

## Status
validated

## Post Type
Tutorial / Guide (Linux networking, BGP, DDoS mitigation)

## Technologies Covered
- Linux iproute2 (`ip route` command)
- Blackhole / unreachable / prohibit route types
- BGP RTBH (Remote Triggered Blackhole)
- RFC 7999 BLACKHOLE community
- FRR / Cisco-style route-map and prefix-list configuration

## Sources Consulted
- iproute2 source and `ip-route(8)` man page (Linux route types: blackhole, unreachable, prohibit, throw)
- Linux kernel networking documentation (RTPROT_BOOT default protocol for `ip route add`)
- RFC 7999: "BLACKHOLE Community" - https://datatracker.ietf.org/doc/html/rfc7999 (well-known community 65535:666 / 0xFFFF029A)
- RFC 5635: "Remote Triggered Black Hole Filtering with Unicast Reverse Path Forwarding (uRPF)"
- FRRouting documentation for `set community blackhole` route-map syntax

## Issues Found

1. **Non-existent `null0` device on Linux** - The original "Alternative" snippet showed `ip route add 192.0.2.0/24 dev null0` with a fallback to `unreachable`. Linux has no `null0` interface (that's a Cisco IOS concept), and the fallback to `unreachable` is a different behavior, not an alternative blackhole. Removed the misleading snippet entirely; the dedicated "Blackhole vs Unreachable vs Prohibit" section already covers `unreachable` accurately.

2. **Incorrect `proto static` annotation** - The expected output comment showed `# blackhole 192.0.2.0/24 proto static`. When you run `ip route add blackhole ...` without specifying `proto`, iproute2 uses the kernel default `RTPROT_BOOT`, and `ip route show` typically displays no proto or `proto boot` - never `proto static` unless the user explicitly specified it. Changed the expected output to `# blackhole 192.0.2.0/24`.

## Review Notes

- The RTBH BGP example mixes Linux `ip route` commands with FRR/Cisco-style `router bgp` / `route-map` / `ip prefix-list` syntax. This is fine for an illustrative example - `set community blackhole` is valid FRR shorthand for the RFC 7999 BLACKHOLE community (65535:666). Users on Cisco IOS may need `set community 65535:666 no-export` instead.
- For local senders (pinging a blackhole route on the same host), the kernel may return a local socket error rather than just timing out. The post's framing ("no response") is most accurate for traffic from a separate source being blackholed at a router, which is the more practical scenario.
- The discard route types listed (blackhole, unreachable, prohibit) are correct. Linux also supports `throw` for policy routing, but it's not relevant to this post's scope.
