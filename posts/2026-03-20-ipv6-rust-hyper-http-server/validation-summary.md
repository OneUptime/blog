# Validation Summary: How to Build IPv6 HTTP Servers with Rust Hyper

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Hyper 1.x
- hyper-util
- Tokio
- HTTP/1.1
- HTTP/2
- IPv6 networking

## Sources Consulted
- Hyper guide, "Getting Started with a Server": https://hyper.rs/guides/1/server/hello-world/
- Hyper guide, "Gracefully Shutdown a Server": https://hyper.rs/guides/1/server/graceful-shutdown/
- `hyper::server::conn::http1::Builder`: https://docs.rs/hyper/latest/hyper/server/conn/http1/struct.Builder.html
- `hyper::server::conn::http2::Builder`: https://docs.rs/hyper/latest/hyper/server/conn/http2/struct.Builder.html
- `hyper::service::service_fn`: https://docs.rs/hyper/latest/hyper/service/fn.service_fn.html
- `hyper_util::server::graceful::GracefulShutdown`: https://docs.rs/hyper-util/latest/hyper_util/server/graceful/struct.GracefulShutdown.html
- `hyper-util` graceful server example: https://docs.rs/crate/hyper-util/latest/source/examples/server_graceful.rs

## Issues Found
- The description claimed the post would "serve TLS over IPv6", but the article does not implement TLS. I changed that wording to "serve cleartext HTTP/2 over IPv6" so it matches the actual content.
- The "Extracting Client IPv6 Address" heading was more specific than the code. The example captures a `SocketAddr` and prints `peer.ip()`, so I renamed the section to "Extracting Client IP Address."
- The HTTP/2 example used `service_fn`, `Full`, and `Bytes` without importing them. I added the missing imports so the example compiles with current Hyper 1.x APIs.
- The graceful shutdown example was incomplete and did not follow Hyper's current documented shutdown flow. I added the missing imports and handler, pinned the `ctrl_c()` future, dropped the listener before leaving the accept loop, and awaited `graceful.shutdown()` after the loop so the example matches the documented `hyper-util` pattern and compiles.

## Review Notes
- The snippets were compile-checked locally on 2026-04-29 against the latest compatible crate versions resolved by Cargo at review time: `hyper 1.9.0`, `hyper-util 0.1.20`, `tokio 1.52.1`, `http-body-util 0.1.3`, and `bytes 1.11.1`.
- The HTTP/2 example is cleartext HTTP/2 over raw TCP rather than HTTPS with ALPN. Hyper supports that configuration, but many browser clients expect HTTP/2 to be negotiated over TLS.
