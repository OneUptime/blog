# Validation Summary: How to Implement TCP Protocols with Tokio Codec in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Tokio
- tokio-util codec
- bytes
- futures-util
- TCP protocol framing

## Sources Consulted
- Tokio `tokio_util::codec` documentation: https://docs.rs/tokio-util/latest/tokio_util/codec/index.html
- Tokio `Framed` documentation: https://docs.rs/tokio-util/latest/tokio_util/codec/struct.Framed.html
- `bytes` crate documentation: https://docs.rs/bytes/latest/bytes/
- `BytesMut` documentation: https://docs.rs/bytes/latest/bytes/struct.BytesMut.html
- `BufMut` documentation: https://docs.rs/bytes/latest/bytes/buf/trait.BufMut.html
- `futures-util` `StreamExt` documentation: https://docs.rs/futures-util/latest/futures_util/stream/trait.StreamExt.html
- `futures-util` `SinkExt` documentation: https://docs.rs/futures-util/latest/futures_util/sink/trait.SinkExt.html

## Issues Found
- The server examples used `futures::{SinkExt, StreamExt}` but the dependency list did not include a futures crate. Changed the dependency to `futures-util = { version = "0.3", features = ["sink"] }` and updated the import to `futures_util::{SinkExt, StreamExt}` because the examples use extension traits for `next`, `send`, and `split`.
- The decoder returned `Ok(None)` for malformed complete frames after consuming the length-prefixed frame. Changed these cases to return a protocol error so malformed frames are reported instead of silently dropped.
- The `SET` parser read the declared value length but did not verify that the value bytes were present before slicing, which could panic on truncated frames. Added a length check.
- The `DELETE` parser did not verify that the declared key bytes were present before slicing, which could panic on truncated frames. Added a length check.

## Review Notes
- The corrected examples were compiled and tested in a temporary Cargo project with Rust 1.93.0, Tokio 1.52.3, tokio-util 0.7.18, bytes 1.11.1, futures-util 0.3.32, and thiserror 1.0.69. The included codec tests passed.
- The article still uses `thiserror = "1"`, which is valid but not the newest major version. No change was required because the shown code works with that version.
