# How to Use ClickHouse Rust Client (clickhouse-rs)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rust, Client, Database, clickhouse-rs

Description: Learn how to connect to ClickHouse from Rust using the clickhouse-rs crate, execute queries, insert rows, and handle streaming results efficiently.

---

## Adding clickhouse-rs Dependency

```toml
[dependencies]
clickhouse = "0.11"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

## Connecting to ClickHouse

```rust
use clickhouse::Client;

#[tokio::main]
async fn main() {
    let client = Client::default()
        .with_url("http://localhost:8123")
        .with_user("default")
        .with_password("")
        .with_database("default");

    println!("Client configured");
}
```

## Defining Row Types with Serde

```rust
use serde::{Deserialize, Serialize};
use clickhouse::Row;

#[derive(Debug, Serialize, Deserialize, Row)]
struct UserEvent {
    user_id: u64,
    event_type: String,
    ts: u32, // Unix timestamp
}
```

## Executing SELECT Queries

```rust
use clickhouse::Client;

#[tokio::main]
async fn main() -> clickhouse::error::Result<()> {
    let client = Client::default()
        .with_url("http://localhost:8123");

    let count: u64 = client
        .query("SELECT count() FROM system.tables")
        .fetch_one::<u64>()
        .await?;

    println!("Tables: {count}");
    Ok(())
}
```

## Fetching Multiple Rows

```rust
use clickhouse::Client;

#[derive(Debug, clickhouse::Row, serde::Deserialize)]
struct TableInfo {
    database: String,
    name: String,
    total_rows: Option<u64>,
}

#[tokio::main]
async fn main() -> clickhouse::error::Result<()> {
    let client = Client::default().with_url("http://localhost:8123");

    let rows = client
        .query("SELECT database, name, total_rows FROM system.tables LIMIT 10")
        .fetch_all::<TableInfo>()
        .await?;

    for row in rows {
        println!("{}.{}: {:?} rows", row.database, row.name, row.total_rows);
    }

    Ok(())
}
```

## Streaming Results

```rust
use clickhouse::Client;

#[tokio::main]
async fn main() -> clickhouse::error::Result<()> {
    let client = Client::default().with_url("http://localhost:8123");

    let mut cursor = client
        .query("SELECT user_id, event_type FROM user_events LIMIT 1000000")
        .fetch::<UserEvent>()?;

    while let Some(row) = cursor.next().await? {
        println!("{}: {}", row.user_id, row.event_type);
    }

    Ok(())
}
```

## Inserting Data

```rust
use clickhouse::Client;

#[derive(clickhouse::Row, serde::Serialize)]
struct UserEvent {
    user_id: u64,
    event_type: String,
    ts: u32,
}

#[tokio::main]
async fn main() -> clickhouse::error::Result<()> {
    let client = Client::default().with_url("http://localhost:8123");

    let mut insert = client.insert("user_events")?;

    insert.write(&UserEvent {
        user_id: 1001,
        event_type: "login".to_string(),
        ts: 1743408000,
    }).await?;

    insert.write(&UserEvent {
        user_id: 1002,
        event_type: "purchase".to_string(),
        ts: 1743408060,
    }).await?;

    insert.end().await?;
    println!("Inserted rows");
    Ok(())
}
```

## Bulk Insert with Loop

```rust
use clickhouse::Client;

#[tokio::main]
async fn main() -> clickhouse::error::Result<()> {
    let client = Client::default().with_url("http://localhost:8123");
    let mut insert = client.insert("user_events")?;

    for i in 0u64..10_000 {
        insert.write(&UserEvent {
            user_id: i,
            event_type: "click".to_string(),
            ts: 1743408000 + i as u32,
        }).await?;
    }

    insert.end().await?;
    println!("Bulk insert complete");
    Ok(())
}
```

## Using Query Parameters

```rust
let event_type = "purchase";

let rows = client
    .query("SELECT user_id FROM user_events WHERE event_type = ?")
    .bind(event_type)
    .fetch_all::<u64>()
    .await?;
```

## Configuring Compression

```rust
use clickhouse::{Client, Compression};

let client = Client::default()
    .with_url("http://localhost:8123")
    .with_compression(Compression::Lz4);
```

## Error Handling

```rust
use clickhouse::{Client, error::Error};

match client.query("SELECT * FROM missing_table").fetch_all::<u64>().await {
    Ok(rows) => println!("Got {} rows", rows.len()),
    Err(Error::BadResponse(msg)) => eprintln!("Server error: {msg}"),
    Err(e) => eprintln!("Error: {e}"),
}
```

## Summary

The `clickhouse` Rust crate provides an async-first interface to ClickHouse over HTTP. Define row structs with `#[derive(Row, Serialize, Deserialize)]`, use `fetch_all` for small result sets, `fetch` for streaming large ones, and `insert` for writing data. Enable LZ4 compression for large inserts and always call `insert.end().await?` to flush the buffer.
