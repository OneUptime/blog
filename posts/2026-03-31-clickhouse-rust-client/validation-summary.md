# Validation Summary: How to Use the ClickHouse Rust Client

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (database)
- Rust (programming language)
- `clickhouse` crate (Rust client for ClickHouse)
- `tokio` (async runtime)
- `serde` (serialization/deserialization)
- `hyper` (HTTP client, used internally by the crate)

## Sources Consulted
- `clickhouse` crate GitHub repository: https://github.com/ClickHouse/clickhouse-rs
- `clickhouse` crate on crates.io (version history and feature flags)
- Source code inspection of `src/lib.rs`, `src/query.rs`, `src/insert.rs`, `src/inserter.rs`, `src/error.rs` in the upstream repository
- Crate README and API documentation on docs.rs

## Issues Found

1. **Outdated crate version**: The Cargo.toml example specified `version = "0.12"`, but the current version is `0.15.0` and the upstream README recommends `0.14.2`. Updated to `version = "0.14"`.

2. **Missing `inserter` feature flag**: The `inserter()` method requires the `inserter` feature to be enabled in Cargo.toml. Added `"inserter"` to the features list.

3. **`client.insert()` is async but was called synchronously**: `client.insert::<T>("table")?` was used in two places (the insert example and the full example), but `insert()` is an async method that returns a `Future`. Fixed both to `client.insert::<T>("table").await?`.

4. **`client.inserter()` does not return `Result`**: The code had `client.inserter::<EventInsert>("events")?` with an error propagation operator, but `inserter()` returns `Inserter<T>` directly (not `Result<Inserter<T>>`). Removed the `?` operator.

5. **Spurious `use futures::StreamExt` import**: The streaming example imported `futures::StreamExt`, but `RowCursor` has its own `.next()` method that is not from the `Stream` trait. The `Stream` implementation is only available with the opt-in `futures03` feature flag. Removed the unnecessary import.

6. **Deprecated `.with_option()` method**: `.with_option()` was deprecated in version 0.14.3 in favor of `.with_setting()`. Updated both occurrences in the Query with Settings section.

7. **Misleading section description**: The "Inserting Data" section text said "Use an `Inserter` for bulk inserts" but the code used `client.insert()` (which creates an `Insert`, not an `Inserter`). Updated the text to "Use `insert()` to create and send a batch of rows".

## Review Notes
- The architecture diagram mentions "RowBinary response" which is technically imprecise for v0.14+. Since version 0.14.0, the default format is `RowBinaryWithNamesAndTypes` (which enables schema validation). Plain `RowBinary` is used only when validation is disabled via `Client::with_validation(false)`. This is a minor inaccuracy in the diagram but was left as-is since "RowBinary" is still broadly correct as a format family name.
- The `Error::BadResponse` variant in the error handling example is correct and exists in the current API.
- The cursor-based streaming pattern (`while let Some(row) = cursor.next().await?`) is the correct idiomatic usage per the upstream README.
- The `.bind()` method with `?` placeholders is correct for parameterized queries.
