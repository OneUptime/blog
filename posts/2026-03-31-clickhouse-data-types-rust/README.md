# How to Handle ClickHouse Data Types in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rust, Data Type, Serde, Type Mapping

Description: Map ClickHouse column types to Rust types when using the clickhouse crate, including handling of Nullable, Array, UUID, and DateTime columns.

---

## Type Mapping Reference

| ClickHouse Type | Rust Type |
|---|---|
| UInt8 | `u8` |
| UInt16 | `u16` |
| UInt32 | `u32` |
| UInt64 | `u64` |
| Int8..Int64 | `i8`..`i64` |
| Float32 | `f32` |
| Float64 | `f64` |
| String, FixedString | `String` or `&str` |
| UUID | `uuid::Uuid` (with feature) |
| Date | `time::Date` or `chrono::NaiveDate` |
| DateTime | `u32` (Unix) or `chrono::DateTime<Utc>` |
| DateTime64 | `i64` (ticks at column precision) or `chrono::DateTime<Utc>` |
| Array(T) | `Vec<T>` |
| Nullable(T) | `Option<T>` |
| LowCardinality(String) | `String` |

## Basic Row Struct

```rust
use clickhouse::Row;
use serde::{Deserialize, Serialize};

#[derive(Row, Deserialize, Debug)]
struct ApiLog {
    request_id: String,
    endpoint:   String,
    status:     u16,
    duration:   u32,
}
```

## Nullable Columns

```rust
#[derive(Row, Deserialize, Debug)]
struct UserEvent {
    user_id: u64,
    region:  Option<String>,  // Nullable(String)
    score:   Option<f64>,     // Nullable(Float64)
}
```

## DateTime with chrono

Enable the `chrono` feature on the `clickhouse` crate:

```toml
[dependencies]
clickhouse = { version = "0.13", features = ["chrono"] }
chrono = { version = "0.4", features = ["serde"] }
```

```rust
use chrono::{DateTime, Utc};

#[derive(Row, Deserialize)]
struct TimestampedRow {
    id: u64,
    created_at: DateTime<Utc>,  // DateTime with timezone
}
```

## Array Columns

```rust
#[derive(Row, Deserialize)]
struct TaggedEvent {
    event_name: String,
    tags:       Vec<String>,  // Array(String)
    codes:      Vec<u32>,     // Array(UInt32)
}
```

## UUID Columns

```toml
[dependencies]
clickhouse = { version = "0.13", features = ["uuid"] }
uuid = { version = "1", features = ["serde"] }
```

```rust
use uuid::Uuid;

#[derive(Row, Deserialize)]
struct Session {
    session_id: Uuid,  // UUID
    user_id:    u64,
}
```

## Inserting with Correct Types

```rust
use chrono::Utc;

#[derive(Row, Serialize)]
struct InsertRow {
    user_id:    u64,
    event_name: String,
    ts:         u32,        // DateTime as Unix timestamp
    tags:       Vec<String>,
}

let row = InsertRow {
    user_id: 42,
    event_name: "login".to_string(),
    ts: Utc::now().timestamp() as u32,
    tags: vec!["web".to_string(), "auth".to_string()],
};
```

## Schema Validation

The `clickhouse` crate uses the `RowBinaryWithNamesAndTypes` format by default, which validates Rust struct types against the ClickHouse schema at runtime. If a column is `UInt64` and you declare `u32`, the query will fail with a descriptive schema-mismatch error when executed. Validation can be disabled for performance, at the cost of less helpful errors on mismatch.

## Summary

Rust's type system maps cleanly to ClickHouse types: use `Option<T>` for Nullable, `Vec<T>` for Array, `u32` for DateTime Unix timestamps, and the `uuid` crate for UUID columns. Runtime schema validation via `RowBinaryWithNamesAndTypes` catches the silent truncation bugs common in dynamically typed clients.
