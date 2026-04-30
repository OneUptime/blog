# Validation Summary: How to Handle IPv6 Addresses in Rust Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- IPv6
- Rust standard library `std::net`
- TCP socket programming
- Tokio async runtime

## Sources Consulted
- Rust `std::net::Ipv6Addr` documentation: https://doc.rust-lang.org/std/net/struct.Ipv6Addr.html
- Rust `std::net::TcpListener` documentation: https://doc.rust-lang.org/std/net/struct.TcpListener.html
- Rust `std::net::TcpStream` documentation: https://doc.rust-lang.org/stable/std/net/struct.TcpStream.html
- Rust `std::net::SocketAddrV6` documentation: https://doc.rust-lang.org/std/net/struct.SocketAddrV6.html
- Tokio `tokio::net::TcpListener` documentation: https://docs.rs/tokio/latest/tokio/net/struct.TcpListener.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 3986, Uniform Resource Identifier (URI): Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The `IpAddr` classification example used `Ipv6Addr::is_unicast_global()`, which is a nightly-only experimental API in current Rust. I replaced it with stable checks using `is_unique_local()` and `is_multicast()`, and changed the fallback label to `IPv6 unicast` so the example compiles on stable Rust.
- The client example connected to `2001:db8::1` as though it were a real endpoint. RFC 3849 reserves `2001:db8::/32` for documentation and says no end party is to be assigned that prefix, so I changed the example to connect to IPv6 loopback `::1` via the helper function.
- The conclusion referenced `is_unicast_global()`. I updated it to reference stable `Ipv6Addr` methods that match the corrected example.

## Review Notes
- The code examples were compile-checked in a temporary Rust project with `rustc 1.93.0` and `cargo check`; the Tokio example also checked successfully with Tokio 1.52.1.
- The URL-formatting example is technically correct: RFC 3986 requires IPv6 literals in URIs to be enclosed in square brackets.
