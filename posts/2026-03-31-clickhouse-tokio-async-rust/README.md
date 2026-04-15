# How to Use ClickHouse with Tokio Async Runtime in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rust, Tokio, Async, Concurrency

Description: Leverage Tokio's async runtime to run concurrent ClickHouse queries and inserts in Rust for high-throughput analytics applications.

---

## Why Tokio with ClickHouse

The `clickhouse` crate is built on top of `hyper` and requires the Tokio async runtime. This means all queries and inserts are non-blocking, allowing a single thread to manage many concurrent ClickHouse operations.

## Setup

```toml
[dependencies]
clickhouse = "0.11"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
futures = "0.3"
```

## Running Queries Concurrently

Use `tokio::join!` to fire multiple queries in parallel.

```rust
use clickhouse::Client;

async fn parallel_queries(client: &Client) {
    let q1 = client.query("SELECT count() FROM events").fetch_one::<u64>();
    let q2 = client.query("SELECT count() FROM errors").fetch_one::<u64>();

    let (events, errors) = tokio::join!(q1, q2);
    println!("Events: {}, Errors: {}", events.unwrap(), errors.unwrap());
}
```

## Spawning Query Tasks

```rust
use tokio::task::JoinSet;

async fn multi_tenant_queries(client: Client, tenant_ids: Vec<u64>) {
    let mut set = JoinSet::new();

    for tenant in tenant_ids {
        let c = client.clone();
        set.spawn(async move {
            c.query("SELECT count() FROM events WHERE tenant_id = ?")
                .bind(tenant)
                .fetch_one::<u64>()
                .await
        });
    }

    while let Some(result) = set.join_next().await {
        match result {
            Ok(Ok(cnt)) => println!("Count: {}", cnt),
            _ => eprintln!("Query failed"),
        }
    }
}
```

## Async Insert Pipeline with Channels

```rust
use tokio::sync::mpsc;

#[derive(clickhouse::Row, serde::Serialize, Clone)]
struct Event {
    user_id: u64,
    name:    String,
    ts:      u32,
}

async fn start_pipeline(client: Client) -> mpsc::Sender<Event> {
    let (tx, mut rx) = mpsc::channel::<Event>(10_000);

    tokio::spawn(async move {
        let mut batch = Vec::with_capacity(5_000);
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));

        loop {
            tokio::select! {
                Some(event) = rx.recv() => {
                    batch.push(event);
                    if batch.len() >= 5_000 {
                        flush_batch(&client, &batch).await;
                        batch.clear();
                    }
                }
                _ = interval.tick() => {
                    if !batch.is_empty() {
                        flush_batch(&client, &batch).await;
                        batch.clear();
                    }
                }
            }
        }
    });

    tx
}
```

## Timeout Handling

```rust
use tokio::time::{timeout, Duration};

let result = timeout(
    Duration::from_secs(5),
    client.query("SELECT slowQuery()").fetch_one::<u64>()
).await;

match result {
    Ok(Ok(row)) => println!("Result: {:?}", row),
    Ok(Err(e))  => eprintln!("Query error: {}", e),
    Err(_)      => eprintln!("Query timed out"),
}
```

## Summary

Tokio enables Rust programs to run many ClickHouse queries concurrently without blocking threads. Use `tokio::join!` for known concurrent queries, `JoinSet` for dynamic fan-out, `tokio::select!` for event-driven batch flushing, and `timeout` for resilience against slow queries.
