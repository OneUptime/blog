# Validation Summary: How to Use Rust std::net::Ipv6Addr for IPv6 Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Rust standard library `std::net`
- IPv6 addressing
- `Ipv6Addr`, `Ipv4Addr`, `IpAddr`, and `SocketAddrV6`
- IPv4-mapped IPv6 addresses
- IPv6 documentation and special-purpose prefixes

## Sources Consulted
- Rust standard library documentation for `std::net::Ipv6Addr`: https://doc.rust-lang.org/stable/std/net/struct.Ipv6Addr.html
- Rust standard library documentation for `std::net::Ipv4Addr`: https://doc.rust-lang.org/stable/std/net/struct.Ipv4Addr.html
- Rust standard library documentation for `std::net::IpAddr`: https://doc.rust-lang.org/stable/std/net/enum.IpAddr.html
- Rust standard library documentation for `std::net::SocketAddrV6`: https://doc.rust-lang.org/stable/std/net/struct.SocketAddrV6.html
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- RFC 9637, Expanding the IPv6 Documentation Space: https://www.rfc-editor.org/rfc/rfc9637

## Issues Found
- The classification example used `Ipv6Addr::is_unicast_global()`, which is still behind Rust's unstable `ip` feature on stable Rust. Replaced that branch with the stable `is_unique_local()` predicate and a stable fallback label, and updated the conclusion to avoid recommending the unstable method.
- The IPv4-mapped conversion example used `Ipv6Addr::to_ipv4()` for mapped-only detection. That method also converts IPv4-compatible addresses and `::1`; changed the example to `to_ipv4_mapped()` for precise IPv4-mapped detection.
- The documentation-prefix helper only checked `2001:db8::/32`. RFC 9637 and the IANA registry also reserve `3fff::/20` for documentation, so the helper and comment were updated to cover both prefixes.
- The socket example implied `scope_id=2` specifically meant `eth0`. Scope IDs are interface indexes and vary by system, so the comment was changed to describe it as an example interface index.

## Review Notes
All Rust snippets were compile-checked with `rustc 1.93.0`. The range-checking snippet emits a dead-code warning for the illustrative `is_6to4()` helper because the sample `main` does not call it; this does not affect correctness.
