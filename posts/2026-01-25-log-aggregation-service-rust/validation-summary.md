# Validation Summary: How to Build a Log Aggregation Service in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Cargo
- Tokio
- Axum
- Serde and serde_json
- Chrono
- tracing and tracing-subscriber
- Filesystem-backed newline-delimited JSON storage

## Sources Consulted
- Rust Cargo Book, `cargo new`: https://doc.rust-lang.org/cargo/commands/cargo-new.html
- Tokio bounded mpsc channel docs: https://docs.rs/tokio/latest/tokio/sync/mpsc/fn.channel.html
- Tokio mpsc module docs for bounded-channel backpressure: https://docs.rs/tokio/latest/tokio/sync/mpsc/
- Tokio `sleep` docs: https://docs.rs/tokio/latest/tokio/time/fn.sleep.html
- Axum `Router` and state docs: https://docs.rs/axum/latest/axum/struct.Router.html
- Axum `State` extractor docs: https://docs.rs/axum/latest/axum/extract/struct.State.html
- Rust `std::fs::OpenOptions` docs: https://doc.rust-lang.org/std/fs/struct.OpenOptions.html
- Chrono serde support docs: https://docs.rs/chrono/latest/chrono/serde/index.html
- Serde container attributes docs: https://serde.rs/container-attrs.html
- Serde field attributes docs: https://serde.rs/field-attrs.html

## Issues Found
- The buffer timeout code did not advance its deadline after an empty timeout. After the first empty flush interval, the computed timeout could remain zero and repeatedly re-enter the sleep branch instead of waiting for the next interval. Changed `deadline` to be mutable and reset it after an empty timeout.
- The file writer opened files under `base_path` but never created the directory. A fresh run against `/var/log/aggregated` or another missing directory would fail before writing logs. Added `fs::create_dir_all(&self.base_path)?` before opening the rotated file.
- The dependency snippet used `axum = "0.7"`, which excludes the current 0.8 release line. Verified the example against Axum 0.8 and updated the dependency to `axum = "0.8"`.
- The main example described the final await as "Clean shutdown", but the sample does not implement graceful shutdown signaling. Reworded the comment to accurately say it waits for the storage worker if the server exits.
- The conclusion claimed the sample architecture "will scale to millions of logs per second on modest hardware." That performance claim is not justified by the single-process, single-writer example and would depend heavily on hardware, payload size, disk, batching, and deployment topology. Reworded it to a defensible high-throughput foundation claim.

## Review Notes
- The corrected combined example was verified with `cargo check` using Rust 1.93.0, Tokio 1.x, Axum 0.8.9, Serde 1.x, Chrono 0.4.x, tracing 0.1.x, and tracing-subscriber 0.3.x.
- The post still presents a simplified storage worker using blocking filesystem writes inside a Tokio task. That is acceptable for a tutorial happy path, but production versions should consider `spawn_blocking`, async file APIs, or a dedicated writer thread depending on throughput and runtime configuration.
