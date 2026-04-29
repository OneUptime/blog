# Validation Summary: How to Use IPv6 UDP Sockets in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- `std::net::UdpSocket`
- `std::net::SocketAddrV6`
- IPv6
- UDP
- Tokio
- IPv6 multicast
- mDNS

## Sources Consulted
- Rust standard library `std::net::UdpSocket`: https://doc.rust-lang.org/stable/std/net/struct.UdpSocket.html
- Rust standard library `std::net::SocketAddrV6`: https://doc.rust-lang.org/stable/std/net/struct.SocketAddrV6.html
- Rust standard library `std::net::ToSocketAddrs`: https://doc.rust-lang.org/std/net/trait.ToSocketAddrs.html
- Tokio `tokio::net::UdpSocket`: https://docs.rs/tokio/latest/tokio/net/struct.UdpSocket.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 6762, Multicast DNS: https://datatracker.ietf.org/doc/html/rfc6762
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The multicast send example used `UdpSocket::set_multicast_if_v6`, which is not a method on `std::net::UdpSocket`. I changed the example to send to a `SocketAddrV6` with the interface scope ID set, which is the supported std approach for link-local IPv6 destinations.
- The multicast send example's `main` function returned `std::io::Result<()>` but did not return `Ok(())`. I changed the call to `send_multicast(b"announcement", 1)?;` and added `Ok(())`.
- The client example used `2001:db8::1` as the server address. That prefix is reserved for documentation by RFC 3849 and is not suitable for a runnable local example, so I changed it to `[::1]:9000` to match the server snippet.
- The shared Tokio `Arc<UdpSocket>` example used documentation-only IPv6 targets and a `tokio::try_join!` structure that type-checked with unreachable-code warnings because the receiver task never terminated. I replaced it with multiple sender tasks sharing the same socket and loopback IPv6 targets so the example cleanly matches the section's stated purpose.
- The socket-options section used `set_reuse_address` and `set_multicast_ttl_v6`, which are not methods on `std::net::UdpSocket`. I removed those invalid calls and kept the example to valid std APIs by using timeouts plus `set_multicast_loop_v6`.
- The multicast send example said interface index `1` is "typically eth0", which is not portable. I changed the comment to tell readers to replace it with the interface index for their system.

## Review Notes
- `std::net::UdpSocket` does not expose every low-level socket option. If this post later needs `SO_REUSEADDR` or more advanced multicast configuration, use a lower-level socket crate such as `socket2`, then wrap the configured socket with Tokio via `tokio::net::UdpSocket::from_std` when async support is needed.
- Corrected std snippets were checked with `rustc 1.93.0`, and the revised Tokio shared-socket example was checked with `cargo check` against `tokio = "1"` with `features = ["full"]`.
