# Validation Summary: How to Build a StatsD-Compatible Metrics Collector in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Cargo
- Tokio UDP networking
- StatsD and DogStatsD-style metric datagrams
- DashMap
- tracing and tracing-subscriber
- netcat

## Sources Consulted
- StatsD metric types documentation: https://github.com/statsd/statsd/blob/master/docs/metric_types.md
- Datadog DogStatsD datagram format documentation: https://docs.datadoghq.com/extend/dogstatsd/datagram_shell/
- Tokio UdpSocket documentation: https://docs.rs/tokio/latest/tokio/net/struct.UdpSocket.html
- DashMap documentation: https://docs.rs/dashmap/latest/dashmap/struct.DashMap.html
- Cargo `new` command documentation: https://doc.rust-lang.org/cargo/commands/cargo-new.html
- Cargo manifest format documentation: https://doc.rust-lang.org/cargo/reference/manifest.html
- OpenBSD netcat manual: https://man.openbsd.org/nc.1
- Local verification with `cargo check` using rustc 1.93.0 and cargo 1.93.0

## Issues Found
- The parser required every metric value to parse as `f64`, but the post's set example used `users.unique:user123|s`. This meant the example would not parse and the set aggregator would never see string-valued set entries. I added a `MetricValue` enum so counters, gauges, timers, and histograms use numeric values while sets preserve text values.
- The aggregator converted set values from `f64` back to strings, which would not preserve arbitrary set values. I updated set aggregation to store the parsed text value directly.
- Sample rates were parsed with `unwrap_or(1.0)` and could accept `@0`, which would produce an infinite adjusted counter value during aggregation. I constrained accepted sample rates to values greater than `0.0` and less than or equal to `1.0`; invalid values fall back to `1.0`.

## Review Notes
The corrected code compiles successfully in a throwaway Cargo project using the listed dependencies. The tutorial remains a basic collector: tags are parsed but not included in aggregation keys, gauge deltas are not implemented, and `DashMap` iteration followed by `clear()` is adequate for a simple guide but would need more careful snapshot semantics in a production collector.
