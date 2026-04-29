# Validation Summary: How to Create IPv6 Sockets in Rust

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rust
- `std::net`
- IPv6
- TCP sockets
- UDP sockets
- `socket2`
- Tokio

## Sources Consulted
- Rust standard library `TcpListener` docs: https://doc.rust-lang.org/std/net/struct.TcpListener.html
- Rust standard library `TcpStream` docs: https://doc.rust-lang.org/std/net/struct.TcpStream.html
- Rust standard library `UdpSocket` docs: https://doc.rust-lang.org/std/net/struct.UdpSocket.html
- Rust standard library `SocketAddr` docs: https://doc.rust-lang.org/std/net/enum.SocketAddr.html
- Rust standard library `IpAddr` docs: https://doc.rust-lang.org/std/net/enum.IpAddr.html
- Rust standard library `SocketAddrV6` docs: https://doc.rust-lang.org/std/net/struct.SocketAddrV6.html
- `socket2` crate docs: https://docs.rs/socket2/latest/socket2/
- Tokio `TcpListener` docs: https://docs.rs/tokio/latest/tokio/net/struct.TcpListener.html
- Tokio `AsyncReadExt` docs: https://docs.rs/tokio/latest/tokio/io/trait.AsyncReadExt.html
- Tokio `#[tokio::main]` macro docs: https://docs.rs/tokio-macros/latest/tokio_macros/attr.main.html

## Issues Found
- The UDP example used invalid Rust format strings (`"[::]:{ }"`), which would not compile. I corrected them to `"[::]:{}"` in both the `bind` and `println!` calls.
- The UDP client example used `Duration::from_secs(5)` without importing `std::time::Duration`. I added the missing import so the snippet compiles.
- The `socket2` dual-stack example used the same invalid `format!` placeholder in the bind address. I corrected it to `"[::]:{}"` so the address parses correctly.
- The TCP server comment incorrectly implied that the `IpAddr` value itself displays bracketed IPv6 formatting by default. I corrected the comment to match what the code actually does: it prints the peer in manual `[addr]:port` form.
- The post description claimed coverage of link-local connections, but the post did not include any link-local or scoped-address examples. I removed that claim to keep the description technically accurate.
- The Tokio section did not include the dependency/features required for the shown code (`#[tokio::main]`, `tokio::net::TcpListener`, and `AsyncReadExt`/`AsyncWriteExt`). I added a minimal `Cargo.toml` snippet with the required Tokio features.

## Review Notes
- The corrected examples were sanity-checked with `cargo check` in a temporary project using Rust 1.93.0 on April 29, 2026.
- `socket2 = "0.5"` is not the newest major version, but the API used in the post remains valid.
- Dual-stack behavior still depends on platform support for disabling `IPV6_V6ONLY`; the post correctly uses `socket2::Socket::set_only_v6(false)` for that purpose.
