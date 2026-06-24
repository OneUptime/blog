# Validation Summary: How to Validate IPv6 Addresses in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust standard library `std::net::Ipv6Addr` (FromStr, segment/scope predicates)
- Rust `std::str::FromStr`
- `ipnet` crate (`Ipv6Net`)
- `axum` 0.7 web framework + `tokio` 1.x

## Sources Consulted
- Rust std docs — https://doc.rust-lang.org/std/net/struct.Ipv6Addr.html (confirmed `is_loopback`, `is_unspecified`, `is_multicast`, `segments() -> [u16; 8]` are stable; confirmed `is_unicast_global` is a nightly-only unstable API behind `feature(ip)`; confirmed `FromStr` follows RFC 5952 and does not parse zone IDs like `%eth0`)
- ipnet crate docs — https://docs.rs/ipnet/latest/ipnet/struct.Ipv6Net.html (confirmed `impl FromStr for Ipv6Net`, `addr() -> Ipv6Addr`, and `network() -> Ipv6Addr` returning the address with host bits truncated)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- The comment "`is_unicast_global` exists in std but is unstable" is correct: it requires `#![feature(ip)]` on nightly (tracking issue rust-lang/rust#27709), justifying the inlined prefix checks in `validate_public_ipv6`.
- Test case `fe80::1%eth0 => false` is correct: std's `Ipv6Addr` parser implements RFC 5952 only and rejects RFC 6874 zone IDs.
- The documentation-prefix check `segs[0] == 0x2001 && segs[1] == 0x0db8` correctly matches `2001:db8::/32`.
- The link-local mask `(segs[0] & 0xffc0) == 0xfe80` (fe80::/10) and unique-local mask `(segs[0] & 0xfe00) == 0xfc00` (fc00::/7) are arithmetically correct.
- `axum::serve(listener, app)` with `tokio::net::TcpListener::bind` is the correct API for axum 0.7 (the dependency version pinned in Cargo.toml), not the older `axum::Server` builder from 0.6. Left as-is.
- `Ipv6Net::network()` returning a different value than `addr()` when host bits are set is the documented behavior the strict-CIDR check relies on; verified.
