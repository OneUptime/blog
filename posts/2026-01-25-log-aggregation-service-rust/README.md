# How to Build a Log Aggregation Service in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Logging, Aggregation, Observability, Performance

Description: A practical guide to building a high-performance log aggregation service in Rust, covering async ingestion, buffering, and storage patterns that handle millions of log lines per second.

---

Log aggregation sits at the heart of any serious observability stack. Whether you're running a handful of services or thousands, you need a central place to collect, process, and query logs. Commercial solutions like Splunk and Datadog charge heavily based on ingestion volume, which is why many teams build their own aggregators or adopt open-source alternatives.

Rust is an excellent choice for this type of infrastructure work. You get memory safety without garbage collection pauses, predictable latency, and performance that rivals C. This post walks through building a log aggregation service from scratch, covering the architecture decisions, code patterns, and pitfalls to avoid.

## Architecture Overview

A log aggregation service has three main responsibilities:

1. **Ingestion** - Accept logs from multiple sources over HTTP, gRPC, or syslog
2. **Buffering** - Handle traffic spikes without losing data
3. **Storage** - Write logs to durable storage for later querying

We'll build a service that accepts logs via HTTP, buffers them in memory with backpressure, and writes to files (you can swap this for ClickHouse, S3, or whatever fits your needs).

## Setting Up the Project

Start by creating a new Rust project and adding the dependencies we need:

```bash
cargo new log-aggregator
cd log-aggregator
```

Add these to your `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1.35", features = ["full"] }
axum = "0.7"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = { version = "0.4", features = ["serde"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

## Defining the Log Entry Structure

Let's define what a log entry looks like. Keep it simple but include the fields you actually need for querying:

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// A single log entry from an application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub service: String,
    pub message: String,
    // Optional structured fields for filtering
    #[serde(default)]
    pub attributes: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}
```

## Building the Ingestion Layer

The ingestion layer accepts logs over HTTP. We'll use Axum for its ergonomics and performance:

```rust
use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use std::sync::Arc;
use tokio::sync::mpsc;

// Shared state containing the channel sender
struct AppState {
    log_sender: mpsc::Sender<LogEntry>,
}

// Handler for incoming log batches
async fn ingest_logs(
    State(state): State<Arc<AppState>>,
    Json(entries): Json<Vec<LogEntry>>,
) -> StatusCode {
    for entry in entries {
        // Try to send without blocking - if buffer is full, apply backpressure
        match state.log_sender.try_send(entry) {
            Ok(_) => {}
            Err(mpsc::error::TrySendError::Full(_)) => {
                // Buffer is full - return 503 to tell clients to slow down
                return StatusCode::SERVICE_UNAVAILABLE;
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                return StatusCode::INTERNAL_SERVER_ERROR;
            }
        }
    }
    StatusCode::ACCEPTED
}

pub fn create_router(log_sender: mpsc::Sender<LogEntry>) -> Router {
    let state = Arc::new(AppState { log_sender });

    Router::new()
        .route("/ingest", post(ingest_logs))
        .with_state(state)
}
```

Notice we're using `try_send` instead of `send`. This gives us backpressure - when the buffer fills up, we immediately tell clients to slow down rather than blocking the HTTP handler.

## The Buffer Layer

The buffer sits between ingestion and storage. We use a bounded channel to limit memory usage and batch writes for efficiency:

```rust
use tokio::sync::mpsc;
use std::time::Duration;

pub struct LogBuffer {
    receiver: mpsc::Receiver<LogEntry>,
    batch_size: usize,
    flush_interval: Duration,
}

impl LogBuffer {
    pub fn new(
        receiver: mpsc::Receiver<LogEntry>,
        batch_size: usize,
        flush_interval: Duration,
    ) -> Self {
        Self {
            receiver,
            batch_size,
            flush_interval,
        }
    }

    // Collect logs into batches and yield them
    pub async fn next_batch(&mut self) -> Option<Vec<LogEntry>> {
        let mut batch = Vec::with_capacity(self.batch_size);
        let deadline = tokio::time::Instant::now() + self.flush_interval;

        loop {
            let timeout = deadline.saturating_duration_since(tokio::time::Instant::now());

            tokio::select! {
                // Try to receive more logs
                result = self.receiver.recv() => {
                    match result {
                        Some(entry) => {
                            batch.push(entry);
                            // Flush if batch is full
                            if batch.len() >= self.batch_size {
                                return Some(batch);
                            }
                        }
                        None => {
                            // Channel closed - return remaining logs
                            return if batch.is_empty() { None } else { Some(batch) };
                        }
                    }
                }
                // Flush on timeout even if batch is not full
                _ = tokio::time::sleep(timeout) => {
                    if !batch.is_empty() {
                        return Some(batch);
                    }
                    // Reset deadline and keep waiting
                }
            }
        }
    }
}
```

This batching approach is critical for performance. Writing one log at a time would kill throughput - batching amortizes the cost of syscalls and network round trips.

## Storage Writer

For simplicity, we'll write to rotating log files. In production, you'd likely swap this for a database writer:

```rust
use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::PathBuf;

pub struct FileWriter {
    base_path: PathBuf,
    current_file: Option<BufWriter<File>>,
    current_date: Option<String>,
}

impl FileWriter {
    pub fn new(base_path: PathBuf) -> Self {
        Self {
            base_path,
            current_file: None,
            current_date: None,
        }
    }

    // Write a batch of logs, rotating files daily
    pub fn write_batch(&mut self, entries: &[LogEntry]) -> std::io::Result<()> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        // Rotate file if date changed
        if self.current_date.as_ref() != Some(&today) {
            self.rotate_file(&today)?;
        }

        let writer = self.current_file.as_mut().unwrap();

        for entry in entries {
            // Write as newline-delimited JSON
            serde_json::to_writer(&mut *writer, entry)?;
            writer.write_all(b"\n")?;
        }

        writer.flush()?;
        Ok(())
    }

    fn rotate_file(&mut self, date: &str) -> std::io::Result<()> {
        let filename = self.base_path.join(format!("logs-{}.ndjson", date));

        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(filename)?;

        self.current_file = Some(BufWriter::new(file));
        self.current_date = Some(date.to_string());
        Ok(())
    }
}
```

## Putting It Together

Now we wire up all the components in our main function:

```rust
use std::path::PathBuf;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{info, error};

#[tokio::main]
async fn main() {
    // Initialize logging for the aggregator itself
    tracing_subscriber::fmt::init();

    // Create a bounded channel - 100k entries max in buffer
    let (sender, receiver) = mpsc::channel::<LogEntry>(100_000);

    // Spawn the storage worker
    let storage_handle = tokio::spawn(async move {
        let mut buffer = LogBuffer::new(receiver, 1000, Duration::from_secs(5));
        let mut writer = FileWriter::new(PathBuf::from("/var/log/aggregated"));

        while let Some(batch) = buffer.next_batch().await {
            let batch_len = batch.len();
            if let Err(e) = writer.write_batch(&batch) {
                error!("Failed to write batch: {}", e);
                // In production: implement retry logic or dead letter queue
            } else {
                info!("Wrote {} log entries", batch_len);
            }
        }
    });

    // Start the HTTP server
    let app = create_router(sender);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();

    info!("Log aggregator listening on port 8080");

    axum::serve(listener, app).await.unwrap();

    // Clean shutdown
    storage_handle.await.unwrap();
}
```

## Performance Considerations

A few things to keep in mind when running this in production:

**Channel sizing matters.** The 100k buffer gives you roughly 30 seconds of runway during a traffic spike (assuming 3k logs/second). Size it based on your traffic patterns and available memory.

**Batch size affects latency.** Larger batches mean better throughput but higher latency from ingestion to storage. A 1000-entry batch with 5-second timeout is a reasonable starting point.

**Consider compression.** If you're writing to object storage or sending over the network, gzip or zstd compression can reduce storage costs by 10x.

**Add metrics.** Track ingestion rate, buffer depth, and write latency. You want to know when you're approaching capacity before you start dropping logs.

## Extending the Service

This foundation can grow in several directions:

- Add gRPC ingestion for lower overhead with high-volume producers
- Implement partitioning by service or tenant for multi-tenant deployments
- Add a query layer with full-text search using tantivy (Rust's Lucene equivalent)
- Stream to multiple destinations - local files for hot data, S3 for cold storage

The key is keeping the ingestion path fast and simple. Fancy processing should happen asynchronously or at query time.

## Wrapping Up

Building a log aggregation service in Rust gives you a reliable, performant foundation for your observability stack. The combination of async I/O, memory safety, and low-level control makes Rust ideal for this class of infrastructure.

The code above handles the happy path well. For production use, you'll want to add proper error handling, graceful shutdown signals, health check endpoints, and comprehensive metrics. But the core architecture - async ingestion, bounded buffering, and batched writes - will scale to millions of logs per second on modest hardware.

Start simple, measure everything, and optimize the bottlenecks you actually hit.
