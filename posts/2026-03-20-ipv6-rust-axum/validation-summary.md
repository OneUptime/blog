# Validation Summary: How to Use IPv6 with Rust Axum

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rust
- Axum
- Tokio
- IPv6
- HTTP
- tower-http
- tracing

## Sources Consulted
- Axum `Router` docs: https://docs.rs/axum/latest/axum/struct.Router.html
- Axum `ConnectInfo` docs: https://docs.rs/axum/latest/axum/extract/connect_info/index.html
- Axum extractor docs: https://docs.rs/axum/latest/axum/extract/
- Tokio `TcpListener` docs: https://docs.rs/tokio/latest/tokio/net/struct.TcpListener.html
- Rust `IpAddr` docs: https://doc.rust-lang.org/std/net/enum.IpAddr.html
- Rust `Ipv6Addr` docs: https://doc.rust-lang.org/std/net/struct.Ipv6Addr.html
- tower-http trace docs: https://docs.rs/tower-http/latest/tower_http/trace/
- RFC 3493, `IPV6_V6ONLY`: https://datatracker.ietf.org/doc/html/rfc3493

## Issues Found
- The dependency snippet targeted `axum = "0.7"` and omitted crates used later in the post. I updated it to `axum = "0.8"` and added `serde`, `tower-http`, `tracing`, and `tracing-subscriber` so the examples match the current documented API surface and required imports.
- The `ConnectInfo` example used `Ipv6Addr::to_ipv4()`, which would also convert `::1` to `0.0.0.1`. I changed it to `Ipv6Addr::to_ipv4_mapped()` so only IPv4-mapped IPv6 addresses are unwrapped.
- The `ConnectInfo` section referenced `serve_with_incoming_make_service`, which is not a current Axum API. I replaced that note with the correct `into_make_service_with_connect_info` guidance from the Axum docs.
- The custom extractor example used `axum::async_trait`, which is not part of the current Axum API. I removed that import and attribute; the extractor now uses the current `FromRequestParts` implementation style.
- The tracing example claimed `TraceLayer` would include peer IPv6 addresses automatically, but the code did not attach peer address data to the tracing span. I updated the example to read `ConnectInfo<SocketAddr>` from request extensions and add a canonicalized client IP field to the span, and I corrected the conclusion accordingly.
- The binding comment implied dual-stack behavior as a blanket Linux guarantee. I narrowed the wording to note that IPv4 acceptance on an IPv6 listener depends on `IPV6_V6ONLY` behavior and system configuration.

## Review Notes
- Verified the corrected examples by compiling equivalent snippets locally with `cargo check --bins` on Rust 1.93.0 using `axum 0.8.9`.
- Dual-stack behavior for a socket bound to `"[::]:port"` is OS- and socket-option-dependent even though RFC 3493 specifies `IPV6_V6ONLY` off by default; readers should not assume identical behavior across all environments.
