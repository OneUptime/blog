# Validation Summary: How to Handle ClickHouse Data Types in Rust

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse (database type system)
- Rust
- `clickhouse` crate (clickhouse-rs)
- `serde` (Deserialize/Serialize derives)
- `chrono` crate (date/time handling)
- `uuid` crate (UUID handling)
- Cargo (TOML dependency config)

## Sources Consulted
- clickhouse-rs crate docs on docs.rs: https://docs.rs/clickhouse/latest/clickhouse/
- clickhouse-rs serde modules (`serde::chrono`, `serde::time`, `serde::uuid`)
- ClickHouse official docs on DateTime / DateTime64 precision semantics
- crates.io entries for `clickhouse`, `chrono`, and `uuid`

## Issues Found
1. **DateTime64 precision was incorrectly described as "microseconds"** in the type mapping table. ClickHouse `DateTime64(P)` stores ticks at precision `P` (secs/millis/micros/nanos depending on the column definition). Changed to `i64 (ticks at column precision) or chrono::DateTime<Utc>` to reflect that the unit depends on the declared precision.
2. **Compile-time safety claim was technically wrong.** The post stated that type mismatches "cause compile errors rather than runtime panics" and that they "fail with a descriptive error at compile time." The `clickhouse` crate uses serde, which operates at runtime — schema validation happens via the `RowBinaryWithNamesAndTypes` format at query execution time, not at compile time. Rewrote the section as "Schema Validation" to describe the actual runtime validation behavior, and updated the matching sentence in the Summary.
3. **Missing `clickhouse` crate feature flags** in the chrono and UUID sections. To use `chrono::DateTime<Utc>` or `uuid::Uuid` with the clickhouse crate, the `chrono` and `uuid` features must be enabled on the `clickhouse` crate itself — not only on the `chrono`/`uuid` crates. Added `clickhouse = { version = "0.13", features = ["chrono"] }` and `clickhouse = { version = "0.13", features = ["uuid"] }` to the respective `[dependencies]` snippets.

## Review Notes
- `String or &str` for String/FixedString is acceptable but in practice deserialization with serde almost always uses owned `String` unless `#[serde(borrow)]` and lifetimes are threaded through. Left as-is since it is not strictly incorrect.
- The `ts: Utc::now().timestamp() as u32` example will silently overflow in year 2106. This is an intrinsic limit of ClickHouse's `DateTime` (UInt32 seconds since epoch), not a post error, so it was left unchanged.
- The crate version `0.13` was used in the added feature-flag snippets as a current representative version; post authors should update to whatever `clickhouse` version is used in their project.
