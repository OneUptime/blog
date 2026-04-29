# Validation Summary: How to Create IPv6 TCP Listeners in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- `std::net`
- IPv6
- TCP
- Tokio
- `socket2`

## Sources Consulted
- Rust standard library: `std::net::TcpListener` — https://doc.rust-lang.org/stable/std/net/struct.TcpListener.html
- Rust standard library: `std::net::Ipv6Addr` — https://doc.rust-lang.org/stable/std/net/struct.Ipv6Addr.html
- Tokio: `tokio::net::TcpListener` — https://docs.rs/tokio/latest/tokio/net/struct.TcpListener.html
- Tokio: `tokio::runtime::Runtime` shutdown behavior — https://docs.rs/tokio/latest/tokio/runtime/struct.Runtime.html
- Tokio: `tokio::task::JoinSet` — https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html
- socket2: `socket2::Socket` — https://docs.rs/socket2/latest/socket2/struct.Socket.html
- Linux `ipv6(7)` manual page — https://man7.org/linux/man-pages/man7/ipv6.7.html

## Issues Found
- The IPv6-only example set `IPV6_V6ONLY` after `TcpListener::bind()`. Rust documents that this option must be configured before binding, so I replaced the example with a `socket2`-based pre-bind setup and added the required dependency snippet.
- The dual-stack normalization example used `Ipv6Addr::to_ipv4()`, which also converts non-mapped forms such as `::1`. I changed it to `to_ipv4_mapped()` so only IPv4-mapped IPv6 addresses are rewritten.
- The shutdown example stopped accepting new connections on `Ctrl-C` but did not wait for spawned connection tasks to finish. I updated it to track tasks with `JoinSet` and wait for them before returning so the example matches the “Graceful Shutdown” heading.
- The comment and conclusion around `[::]:port` overstated dual-stack behavior. I narrowed the wording to make the platform dependence explicit.

## Review Notes
- Verified the corrected snippets by compiling representative examples in a temporary Cargo project with `rustc 1.93.0`, `tokio 1.52.1`, and `socket2 0.6.3`.
- Tokio’s `TcpListener::bind()` is current and non-deprecated, but socket options that must be set before `bind` require creating and configuring the socket first.
