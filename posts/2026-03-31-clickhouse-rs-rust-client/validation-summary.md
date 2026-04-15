# Validation Summary: How to Use clickhouse-rs Client in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (column-oriented database)
- Rust programming language
- `clickhouse` crate (Rust client for ClickHouse)
- `tokio` async runtime
- `serde` serialization/deserialization
- `chrono` crate (for timestamps)

## Sources Consulted
- Official `clickhouse` crate docs on docs.rs: https://docs.rs/clickhouse/latest/clickhouse/
- `Client` struct API: https://docs.rs/clickhouse/latest/clickhouse/struct.Client.html
- `Query` struct API: https://docs.rs/clickhouse/latest/clickhouse/query/struct.Query.html
- `Insert` struct API: https://docs.rs/clickhouse/latest/clickhouse/insert/struct.Insert.html
- `Row` trait implementors: https://docs.rs/clickhouse/latest/clickhouse/trait.Row.html
- `Error` enum variants: https://docs.rs/clickhouse/latest/clickhouse/error/enum.Error.html
- GitHub repository: https://github.com/ClickHouse/clickhouse-rs

## Issues Found

### 1. Missing `.await` on `client.insert()` call
- **What was wrong:** The inserting rows example had `let mut insert = client.insert("events")?;` but `Client::insert()` is an async method (`pub async fn insert<T: Row>(&self, table: &str) -> Result<Insert<T>>`), so it requires `.await`.
- **What was changed:** Changed to `client.insert("events").await?`.
- **Why:** Without `.await`, the code would not compile — you'd get a `Future` instead of an `Insert<T>`.

### 2. Single-element tuple `(u8,)` does not implement `Row`
- **What was wrong:** The error handling example used `fetch_one::<(u8,)>()` and destructured with `Ok((v,))`. However, the `Row` trait is only implemented for tuples of 2–9 elements. Single-element tuples `(u8,)` do not implement `Row`.
- **What was changed:** Changed to `fetch_one::<u8>()` and `Ok(v)`, since primitive types like `u8` implement `Row` directly via the `Primitive` blanket impl.
- **Why:** The original code would fail to compile with a trait bound error.

### 3. Streaming query column mismatch with `EventRow` struct
- **What was wrong:** The streaming example queried `SELECT event_name, cnt FROM events_daily` (2 columns) but used `EventRow` which has 3 fields (`event_name`, `cnt`, `avg_ms`). This would cause a deserialization error at runtime.
- **What was changed:** Updated the query to `SELECT event_name, cnt, avg_ms FROM events_daily` and the print statement to display all three fields.
- **Why:** The number of selected columns must match the struct's fields for row-binary deserialization to succeed.

## Review Notes
- The crate version `clickhouse = "0.11"` is valid but dated (0.11.x was published 2022–2023). The latest version as of April 2026 is 0.15.0. All APIs used in this post still exist in the latest version, so the code works with either version. Users following this tutorial may want to use a newer version.
- The `Serialize` import in the "Defining a Row Type" section is unused (only `Deserialize` is derived on `EventRow`), but this is harmless and may serve as a hint that the trait will be needed later for insert structs.
- The `Error` enum is marked `#[non_exhaustive]`, so the error handling example's catch-all `Err(e)` arm is good practice.
