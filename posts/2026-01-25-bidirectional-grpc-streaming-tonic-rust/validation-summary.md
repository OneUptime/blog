# Validation Summary: How to Build Bidirectional gRPC Streaming with tonic in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- gRPC
- tonic
- tonic-build
- Protocol Buffers
- Tokio
- tokio-stream
- futures

## Sources Consulted
- tonic documentation: https://docs.rs/tonic/latest/tonic/
- tonic `Channel` documentation: https://docs.rs/tonic/latest/tonic/transport/struct.Channel.html
- tonic-build 0.12 documentation: https://docs.rs/tonic-build/0.12.3/tonic_build/
- tokio `broadcast` documentation: https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html
- tokio-stream `BroadcastStream` documentation: https://docs.rs/tokio-stream/latest/tokio_stream/wrappers/struct.BroadcastStream.html
- tokio-stream `BroadcastStreamRecvError` documentation: https://docs.rs/tokio-stream/latest/tokio_stream/wrappers/errors/enum.BroadcastStreamRecvError.html
- tokio `stdin` documentation: https://docs.rs/tokio/latest/tokio/io/fn.stdin.html
- tokio `BufReader` documentation: https://docs.rs/tokio/latest/tokio/io/struct.BufReader.html
- tokio `mpsc::channel` documentation: https://docs.rs/tokio/latest/tokio/sync/mpsc/fn.channel.html
- tokio `sleep` documentation: https://docs.rs/tokio/latest/tokio/time/fn.sleep.html

## Issues Found
- The `Cargo.toml` snippet did not enable required Tokio features. `tokio::sync`, `tokio::io::stdin`, `tokio::io::BufReader`, and `tokio::time::sleep` require the `sync`, `io-std`, `io-util`, and `time` features respectively. Updated the `tokio` dependency features.
- The `Cargo.toml` snippet used `tokio-stream = "0.1"` without enabling the `sync` feature, but `BroadcastStream` is gated behind that feature. Updated the dependency to `tokio-stream = { version = "0.1", features = ["sync"] }`.
- The setup omitted the `protoc` prerequisite needed by `tonic_build::compile_protos`. Added a short note that the Protocol Buffers compiler must be installed and available on `PATH`.
- The server example matched `BroadcastStream` errors as `tokio::sync::broadcast::error::RecvError`, including a `Closed` branch. `BroadcastStream` yields `tokio_stream::wrappers::errors::BroadcastStreamRecvError`, which only exposes `Lagged`. Updated the import and match arm accordingly.
- The performance section described tonic `Channel` as handling connection pooling. Tonic documents `Channel` as a cheap-to-clone buffered HTTP/2 client channel, so the wording was corrected to recommend reusing or cloning channels instead of creating new connections per call.

## Review Notes
The corrected server and client examples were checked in an isolated temporary Rust project with `cargo check --bins` using tonic 0.12.3, prost 0.13.5, tonic-build 0.12.3, tokio 1.52.3, and tokio-stream 0.1.18. The temporary project used a vendored `protoc` binary only to make validation independent of the local machine; the post itself correctly documents `protoc` as an external prerequisite.
