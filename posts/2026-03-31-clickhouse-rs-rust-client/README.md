# How to Use clickhouse-rs Client in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rust, clickhouse-rs, Client, Analytics

Description: Connect to ClickHouse from Rust using the clickhouse-rs crate to run typed queries and insert rows with compile-time safety.

---

## Adding the Dependency

```toml
[dependencies]
clickhouse = "0.11"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

The crate is `clickhouse` on crates.io (not `clickhouse-rs`).

## Creating a Client

```rust
use clickhouse::Client;

#[tokio::main]
async fn main() {
    let client = Client::default()
        .with_url("http://localhost:8123")
        .with_database("analytics")
        .with_user("default")
        .with_password("");

    println!("Connected to ClickHouse");
}
```

## Defining a Row Type

```rust
use serde::{Deserialize, Serialize};
use clickhouse::Row;

#[derive(Row, Deserialize, Debug)]
struct EventRow {
    event_name: String,
    cnt:        u64,
    avg_ms:     f64,
}
```

## Running a Query

```rust
let rows: Vec<EventRow> = client
    .query(
        "SELECT event_name, count() AS cnt, avg(duration_ms) AS avg_ms
         FROM events
         WHERE toDate(ts) >= today() - 7
         GROUP BY event_name
         ORDER BY cnt DESC
         LIMIT 10",
    )
    .fetch_all()
    .await?;

for row in &rows {
    println!("{}: {} events, {:.2} ms avg", row.event_name, row.cnt, row.avg_ms);
}
```

## Inserting Rows

```rust
use clickhouse::Row;
use serde::Serialize;

#[derive(Row, Serialize)]
struct InsertEvent {
    user_id:    u64,
    event_name: String,
    ts:         u32,  // Unix timestamp
}

let mut insert = client.insert("events").await?;

insert.write(&InsertEvent {
    user_id: 42,
    event_name: "page_view".to_string(),
    ts: chrono::Utc::now().timestamp() as u32,
}).await?;

insert.end().await?;
```

## Streaming Rows

For large result sets, use a cursor to avoid loading everything into memory.

```rust
let mut cursor = client
    .query("SELECT event_name, cnt, avg_ms FROM events_daily")
    .fetch::<EventRow>()?;

while let Some(row) = cursor.next().await? {
    println!("{}: {} events, {:.2} ms avg", row.event_name, row.cnt, row.avg_ms);
}
```

## Error Handling

```rust
use clickhouse::error::Error;

match client.query("SELECT 1").fetch_one::<u8>().await {
    Ok(v) => println!("Value: {}", v),
    Err(Error::Network(e)) => eprintln!("Network error: {}", e),
    Err(e) => eprintln!("Error: {}", e),
}
```

## Summary

The `clickhouse` crate for Rust provides async, typed access to ClickHouse with `serde` serialization. Derive `Row` and `Deserialize` for query results, use `insert().write()` for batched inserts, and prefer streaming cursors for large query results to keep memory usage low.
