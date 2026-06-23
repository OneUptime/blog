# Validation Summary: How to Profile Rust Applications with perf, flamegraph, and samply

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Cargo profiles
- Linux perf
- FlameGraph / cargo-flamegraph
- samply
- tokio-console and console-subscriber
- heaptrack
- Valgrind DHAT
- Criterion.rs
- bpftrace / eBPF profiling
- Grafana Pyroscope Rust SDK
- DashMap and Rust synchronization primitives

## Sources Consulted
- Cargo Book, "Profiles" - https://doc.rust-lang.org/cargo/reference/profiles.html
- Rust standard library documentation, `HashMap` static initialization notes - https://doc.rust-lang.org/std/collections/struct.HashMap.html
- flamegraph-rs README - https://github.com/flamegraph-rs/flamegraph
- samply README - https://github.com/mstange/samply
- console-subscriber documentation - https://docs.rs/console-subscriber/latest/console_subscriber/
- Tokio tracing guide - https://tokio.rs/tokio/topics/tracing-next-steps
- Criterion.rs documentation - https://docs.rs/criterion/latest/criterion/
- Criterion crate version listing - https://crates.io/crates/criterion/versions
- Grafana Pyroscope Rust SDK documentation - https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/rust/
- pyroscope crate documentation - https://docs.rs/pyroscope/latest/pyroscope/
- perf wiki / perf_events overview - https://perfwiki.github.io/main/
- Linux perf manual references - https://man7.org/linux/man-pages/man2/perf_event_open.2.html

## Issues Found
- The tool landscape listed `samply` as macOS/Linux only and `cargo-flamegraph` as "All". Current samply documentation lists macOS, Linux, and Windows support, and flamegraph-rs documents Linux, macOS, and Windows support. I updated both platform rows.
- The post built with `cargo build --profile profiling` but continued to run binaries from `target/release`. Cargo stores user-defined profile artifacts under `target/<profile-name>`, so I added the `target/profiling` output path and updated direct profiler invocations to use it consistently.
- The samply installation and argument examples were slightly off from the current README. I changed installation to `cargo install --locked samply` and removed the unnecessary `--` separator from the application-argument example.
- The tokio-console section referenced `console-subscriber = "0.2"` and said to run with `TOKIO_CONSOLE=1`. Current console-subscriber is 0.5, and the documented requirement is building with `RUSTFLAGS="--cfg tokio_unstable"` plus enabling the subscriber. I updated the dependency comment and command description.
- The Criterion dependency used an older `0.5` version. The current release track is 0.8, so I updated the dependency snippet to `criterion = { version = "0.8", features = ["html_reports"] }`.
- The Pyroscope example used obsolete pre-2.0 crates and builder APIs. I replaced it with the current `pyroscope` crate configuration using the `backend-pprof-rs` feature, `PyroscopeAgentBuilder::new`, `pprof_backend`, and the current start/stop/shutdown flow.
- The `Cow` example hid the elided lifetime in the return type, which current Rust warns about. I changed `Cow<str>` to `Cow<'_, str>`.
- The lock-contention examples used `HashMap::new()` and `DashMap::new()` directly in `static` initializers. `HashMap` should be initialized through `LazyLock` to retain random seeding in statics, and using `LazyLock` also keeps the DashMap static initialization valid. I updated both examples.

## Review Notes
- The article is technically relevant and remains a useful profiling guide after the targeted fixes.
- Some package names for `perf`, `heaptrack`, and Valgrind-related tools vary by Linux distribution, but the Ubuntu/Debian commands in the post are plausible.
- The async profiling example is illustrative and still uses placeholder application types such as `Response` and `Error`; that is acceptable for this guide, but a future revision could call out required dependencies for `tracing`, `tokio`, and `console-subscriber` in one complete `Cargo.toml` block.
