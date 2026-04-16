# How to Build High-Performance ClickHouse Ingestion in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rust, Ingestion, Performance, Tokio

Description: Build a high-throughput data ingestion pipeline from Rust to ClickHouse using batch inserts, async concurrency, and efficient serialization.

---

## Performance Goals

A well-tuned Rust ingestion pipeline can achieve millions of rows per second into ClickHouse. The key factors are:
- Batch rows before each INSERT
- Use RowBinary format to minimize serialization overhead
- Issue concurrent INSERT requests

## Dependencies

```toml
[dependencies]
clickhouse = "0.11"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
async-channel = "2"
```

## Row Definition

```rust
use clickhouse::Row;
use serde::Serialize;

#[derive(Row, Serialize, Clone)]
struct Metric {
    timestamp: u32,
    host:      String,
    metric:    String,
    value:     f64,
}
```

## Batch Inserter

```rust
use clickhouse::Client;
use tokio::sync::mpsc;

async fn batch_inserter(
    client: Client,
    mut rx: mpsc::Receiver<Metric>,
    batch_size: usize,
) {
    let mut batch: Vec<Metric> = Vec::with_capacity(batch_size);

    while let Some(metric) = rx.recv().await {
        batch.push(metric);

        if batch.len() >= batch_size {
            flush(&client, &batch).await;
            batch.clear();
        }
    }

    // flush remaining
    if !batch.is_empty() {
        flush(&client, &batch).await;
    }
}

async fn flush(client: &Client, rows: &[Metric]) {
    let mut insert = client.insert("metrics").expect("insert error");
    for row in rows {
        insert.write(row).await.expect("write error");
    }
    insert.end().await.expect("end error");
}
```

## Producer

```rust
#[tokio::main]
async fn main() {
    let client = Client::default()
        .with_url("http://localhost:8123")
        .with_database("analytics");

    let (tx, rx) = mpsc::channel::<Metric>(100_000);

    tokio::spawn(batch_inserter(client, rx, 50_000));

    for i in 0..1_000_000u32 {
        tx.send(Metric {
            timestamp: i,
            host:      "server01".to_string(),
            metric:    "cpu_pct".to_string(),
            value:     42.5,
        }).await.unwrap();
    }
}
```

## Concurrent Inserts

Spawn multiple batch inserter tasks for higher parallelism.

```rust
let workers = 4;
let (tx, rx) = async_channel::bounded::<Metric>(200_000);

for _ in 0..workers {
    let c = client.clone();
    let r = rx.clone();
    tokio::spawn(async move {
        while let Ok(metric) = r.recv().await {
            // collect batch and flush
        }
    });
}
```

## Tuning ClickHouse Server Settings

```sql
SET max_insert_threads = 8;
SET async_insert = 1;
SET wait_for_async_insert = 0;
```

## Summary

High-performance Rust ingestion into ClickHouse relies on buffering rows into large batches before each INSERT, using async channels to decouple producers from inserters, and running multiple concurrent inserter tasks. With 50,000-row batches and 4 workers, a single Rust process can sustain millions of rows per second.
