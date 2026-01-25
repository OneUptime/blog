# How to Build a Distributed Load Testing Tool in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Load Testing, Distributed Systems, Performance, Testing

Description: A practical guide to building a distributed load testing tool in Rust that can simulate thousands of concurrent users across multiple nodes, leveraging Rust's async runtime and message passing for coordination.

---

Load testing is one of those things that sounds simple until you actually need to simulate 50,000 concurrent users hitting your API. Single-machine tools hit their limits quickly - you run out of file descriptors, network sockets, or just raw CPU. The solution is distributing the load across multiple worker nodes. Rust is a great fit for this problem because of its memory safety, fearless concurrency, and excellent async ecosystem.

In this post, we will build the core components of a distributed load testing system. The architecture consists of a coordinator that manages test runs and worker nodes that generate actual HTTP traffic.

## The Architecture

Our system has three main components:

1. **Coordinator** - Accepts test configurations, distributes work to workers, and aggregates results
2. **Workers** - Generate HTTP traffic based on instructions from the coordinator
3. **Shared Protocol** - Message types for communication between coordinator and workers

We will use TCP sockets with a simple JSON protocol for communication. In production, you might want gRPC or a message queue, but this keeps things clear for demonstration.

## Defining the Protocol

First, let's define the messages that flow between coordinator and workers:

```rust
// src/protocol.rs
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestConfig {
    pub target_url: String,
    pub requests_per_worker: u64,
    pub concurrency_per_worker: u32,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CoordinatorMessage {
    // Sent to workers to start a test
    StartTest { test_id: String, config: TestConfig },
    // Sent to workers to stop current test
    StopTest { test_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WorkerMessage {
    // Worker registration with its capacity
    Register { worker_id: String, max_concurrency: u32 },
    // Progress update during test
    Progress { test_id: String, completed: u64, errors: u64 },
    // Final results when test completes
    Results { test_id: String, stats: TestStats },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestStats {
    pub total_requests: u64,
    pub successful: u64,
    pub failed: u64,
    pub avg_latency_ms: f64,
    pub p50_latency_ms: f64,
    pub p95_latency_ms: f64,
    pub p99_latency_ms: f64,
    pub requests_per_second: f64,
}
```

## Building the Worker

The worker is where the actual load generation happens. We use `tokio` for async runtime and `reqwest` for HTTP requests.

```rust
// src/worker.rs
use crate::protocol::{CoordinatorMessage, TestConfig, TestStats, WorkerMessage};
use reqwest::Client;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::mpsc;

pub struct Worker {
    id: String,
    coordinator_addr: String,
    max_concurrency: u32,
    http_client: Client,
}

impl Worker {
    pub fn new(id: String, coordinator_addr: String, max_concurrency: u32) -> Self {
        // Build HTTP client with connection pooling
        let http_client = Client::builder()
            .pool_max_idle_per_host(max_concurrency as usize)
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            id,
            coordinator_addr,
            max_concurrency,
            http_client,
        }
    }

    pub async fn run(&self) -> Result<(), Box<dyn std::error::Error>> {
        let stream = TcpStream::connect(&self.coordinator_addr).await?;
        let (reader, mut writer) = stream.into_split();
        let mut reader = BufReader::new(reader);

        // Register with coordinator
        let register_msg = WorkerMessage::Register {
            worker_id: self.id.clone(),
            max_concurrency: self.max_concurrency,
        };
        self.send_message(&mut writer, &register_msg).await?;

        // Listen for commands
        let mut line = String::new();
        loop {
            line.clear();
            reader.read_line(&mut line).await?;

            if line.is_empty() {
                break; // Connection closed
            }

            let msg: CoordinatorMessage = serde_json::from_str(&line)?;
            match msg {
                CoordinatorMessage::StartTest { test_id, config } => {
                    let stats = self.run_test(&test_id, &config, &mut writer).await?;
                    let result_msg = WorkerMessage::Results { test_id, stats };
                    self.send_message(&mut writer, &result_msg).await?;
                }
                CoordinatorMessage::StopTest { test_id: _ } => {
                    // Handle graceful shutdown - omitted for brevity
                }
            }
        }

        Ok(())
    }

    async fn run_test(
        &self,
        test_id: &str,
        config: &TestConfig,
        writer: &mut tokio::net::tcp::OwnedWriteHalf,
    ) -> Result<TestStats, Box<dyn std::error::Error>> {
        let completed = Arc::new(AtomicU64::new(0));
        let errors = Arc::new(AtomicU64::new(0));
        let latencies = Arc::new(tokio::sync::Mutex::new(Vec::new()));

        // Create a semaphore to limit concurrency
        let semaphore = Arc::new(tokio::sync::Semaphore::new(
            config.concurrency_per_worker as usize,
        ));

        let start = Instant::now();
        let mut handles = Vec::new();

        for _ in 0..config.requests_per_worker {
            let permit = semaphore.clone().acquire_owned().await?;
            let client = self.http_client.clone();
            let url = config.target_url.clone();
            let timeout = Duration::from_millis(config.timeout_ms);
            let completed = completed.clone();
            let errors = errors.clone();
            let latencies = latencies.clone();

            let handle = tokio::spawn(async move {
                let req_start = Instant::now();
                let result = client.get(&url).timeout(timeout).send().await;
                let latency = req_start.elapsed();

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        completed.fetch_add(1, Ordering::Relaxed);
                        latencies.lock().await.push(latency.as_millis() as f64);
                    }
                    _ => {
                        errors.fetch_add(1, Ordering::Relaxed);
                    }
                }

                drop(permit); // Release semaphore
            });

            handles.push(handle);
        }

        // Wait for all requests to complete
        for handle in handles {
            let _ = handle.await;
        }

        let duration = start.elapsed();
        let stats = self.calculate_stats(
            completed.load(Ordering::Relaxed),
            errors.load(Ordering::Relaxed),
            latencies,
            duration,
        ).await;

        Ok(stats)
    }

    async fn calculate_stats(
        &self,
        successful: u64,
        failed: u64,
        latencies: Arc<tokio::sync::Mutex<Vec<f64>>>,
        duration: Duration,
    ) -> TestStats {
        let mut lats = latencies.lock().await;
        lats.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let total = successful + failed;
        let avg = if lats.is_empty() { 0.0 } else { lats.iter().sum::<f64>() / lats.len() as f64 };
        let p50 = percentile(&lats, 50.0);
        let p95 = percentile(&lats, 95.0);
        let p99 = percentile(&lats, 99.0);
        let rps = total as f64 / duration.as_secs_f64();

        TestStats {
            total_requests: total,
            successful,
            failed,
            avg_latency_ms: avg,
            p50_latency_ms: p50,
            p95_latency_ms: p95,
            p99_latency_ms: p99,
            requests_per_second: rps,
        }
    }

    async fn send_message<W: AsyncWriteExt + Unpin>(
        &self,
        writer: &mut W,
        msg: &WorkerMessage,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string(msg)? + "\n";
        writer.write_all(json.as_bytes()).await?;
        Ok(())
    }
}

fn percentile(sorted_data: &[f64], pct: f64) -> f64 {
    if sorted_data.is_empty() {
        return 0.0;
    }
    let idx = ((pct / 100.0) * sorted_data.len() as f64) as usize;
    let idx = idx.min(sorted_data.len() - 1);
    sorted_data[idx]
}
```

## Building the Coordinator

The coordinator manages connected workers and distributes test configurations:

```rust
// src/coordinator.rs
use crate::protocol::{CoordinatorMessage, TestConfig, TestStats, WorkerMessage};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};

pub struct Coordinator {
    workers: Arc<Mutex<HashMap<String, WorkerHandle>>>,
    results: Arc<Mutex<HashMap<String, Vec<TestStats>>>>,
}

struct WorkerHandle {
    tx: mpsc::Sender<CoordinatorMessage>,
    max_concurrency: u32,
}

impl Coordinator {
    pub fn new() -> Self {
        Self {
            workers: Arc::new(Mutex::new(HashMap::new())),
            results: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn listen(&self, addr: &str) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;
        println!("Coordinator listening on {}", addr);

        loop {
            let (stream, peer_addr) = listener.accept().await?;
            println!("Worker connected from {}", peer_addr);

            let workers = self.workers.clone();
            let results = self.results.clone();

            tokio::spawn(async move {
                if let Err(e) = handle_worker(stream, workers, results).await {
                    eprintln!("Worker error: {}", e);
                }
            });
        }
    }

    pub async fn start_test(&self, test_id: String, config: TestConfig) {
        let workers = self.workers.lock().await;
        let msg = CoordinatorMessage::StartTest {
            test_id: test_id.clone(),
            config,
        };

        // Initialize results collection for this test
        self.results.lock().await.insert(test_id.clone(), Vec::new());

        // Send to all workers
        for (worker_id, handle) in workers.iter() {
            if let Err(e) = handle.tx.send(msg.clone()).await {
                eprintln!("Failed to send to worker {}: {}", worker_id, e);
            }
        }
    }

    pub async fn get_aggregated_results(&self, test_id: &str) -> Option<TestStats> {
        let results = self.results.lock().await;
        let worker_stats = results.get(test_id)?;

        if worker_stats.is_empty() {
            return None;
        }

        // Aggregate stats from all workers
        let total_requests: u64 = worker_stats.iter().map(|s| s.total_requests).sum();
        let successful: u64 = worker_stats.iter().map(|s| s.successful).sum();
        let failed: u64 = worker_stats.iter().map(|s| s.failed).sum();
        let avg_latency: f64 = worker_stats.iter().map(|s| s.avg_latency_ms).sum::<f64>()
            / worker_stats.len() as f64;
        let rps: f64 = worker_stats.iter().map(|s| s.requests_per_second).sum();

        Some(TestStats {
            total_requests,
            successful,
            failed,
            avg_latency_ms: avg_latency,
            p50_latency_ms: worker_stats.iter().map(|s| s.p50_latency_ms).sum::<f64>()
                / worker_stats.len() as f64,
            p95_latency_ms: worker_stats.iter().map(|s| s.p95_latency_ms).fold(0.0, f64::max),
            p99_latency_ms: worker_stats.iter().map(|s| s.p99_latency_ms).fold(0.0, f64::max),
            requests_per_second: rps,
        })
    }
}

async fn handle_worker(
    stream: TcpStream,
    workers: Arc<Mutex<HashMap<String, WorkerHandle>>>,
    results: Arc<Mutex<HashMap<String, Vec<TestStats>>>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let (tx, mut rx) = mpsc::channel::<CoordinatorMessage>(32);

    // Spawn task to send messages to this worker
    let write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let json = serde_json::to_string(&msg).unwrap() + "\n";
            if writer.write_all(json.as_bytes()).await.is_err() {
                break;
            }
        }
    });

    let mut line = String::new();
    let mut worker_id: Option<String> = None;

    loop {
        line.clear();
        if reader.read_line(&mut line).await? == 0 {
            break;
        }

        let msg: WorkerMessage = serde_json::from_str(&line)?;
        match msg {
            WorkerMessage::Register { worker_id: id, max_concurrency } => {
                println!("Worker registered: {} (concurrency: {})", id, max_concurrency);
                worker_id = Some(id.clone());
                workers.lock().await.insert(id, WorkerHandle { tx: tx.clone(), max_concurrency });
            }
            WorkerMessage::Progress { test_id, completed, errors } => {
                println!("Test {} progress: {} completed, {} errors", test_id, completed, errors);
            }
            WorkerMessage::Results { test_id, stats } => {
                println!("Test {} results from worker: {} req/s", test_id, stats.requests_per_second);
                results.lock().await.entry(test_id).or_default().push(stats);
            }
        }
    }

    // Cleanup on disconnect
    if let Some(id) = worker_id {
        workers.lock().await.remove(&id);
        println!("Worker {} disconnected", id);
    }

    write_task.abort();
    Ok(())
}
```

## Running a Test

Here's how you would use these components:

```rust
// src/main.rs
mod coordinator;
mod protocol;
mod worker;

use protocol::TestConfig;

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();

    match args.get(1).map(|s| s.as_str()) {
        Some("coordinator") => {
            let coord = coordinator::Coordinator::new();

            // In a real implementation, you would expose an API
            // to trigger tests. Here we just start listening.
            coord.listen("0.0.0.0:9000").await.unwrap();
        }
        Some("worker") => {
            let worker_id = args.get(2).expect("Worker ID required");
            let coord_addr = args.get(3).unwrap_or(&"127.0.0.1:9000".to_string()).clone();

            let worker = worker::Worker::new(
                worker_id.clone(),
                coord_addr,
                1000, // max concurrency per worker
            );
            worker.run().await.unwrap();
        }
        _ => {
            println!("Usage: loadtest coordinator");
            println!("       loadtest worker <worker_id> [coordinator_addr]");
        }
    }
}
```

## Key Design Decisions

**Why Rust?** Memory safety without garbage collection means predictable latency. When you are generating 10,000 requests per second, you cannot afford GC pauses throwing off your measurements.

**Semaphore for concurrency control** - Rather than spawning unlimited tasks, we use a semaphore to cap concurrent requests. This prevents overwhelming the HTTP client's connection pool and gives consistent results.

**Streaming results** - Workers send progress updates during the test, not just final results. This lets you monitor tests in real-time and stop early if something looks wrong.

**Connection pooling** - The `reqwest` client reuses connections, which is critical when making thousands of requests to the same host.

## What's Missing for Production

This is a foundation, not a production-ready tool. To ship this for real use, you would want:

- **TLS for coordinator-worker communication** - Right now it is plaintext TCP
- **Authentication** - Workers should authenticate with the coordinator
- **Request variety** - Support POST, PUT, custom headers, request bodies
- **Ramp-up patterns** - Gradually increase load rather than slamming the target
- **Better percentile calculation** - Use a streaming algorithm like t-digest for accurate percentiles across workers
- **Persistent storage** - Save test results to a database for historical analysis

## Wrapping Up

Building a distributed load testing tool in Rust is surprisingly approachable once you have the async patterns down. The combination of `tokio` for async runtime, `reqwest` for HTTP, and simple message passing gives you a solid foundation. From here, you can extend it with more sophisticated load patterns, better metrics aggregation, or integration with your CI/CD pipeline.

The full source code with Cargo.toml and additional features is available if you want to fork and experiment. The patterns here - semaphore-based concurrency control, streaming progress updates, and coordinator/worker architecture - apply to many distributed systems beyond load testing.
