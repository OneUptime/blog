# How to Use Worker Threads in Rust for CPU-Intensive Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, rayon, tokio, Worker Threads, CPU, Parallel Processing, Concurrency, Performance

Description: Learn how to use worker threads in Rust for CPU-intensive tasks using rayon and tokio::task::spawn_blocking. This guide covers parallel processing patterns, work stealing, and proper integration with async code.

---

> Async Rust is great for I/O-bound work, but CPU-intensive tasks need real threads. Blocking the async runtime with CPU work starves other tasks. This guide shows you how to properly offload CPU work to dedicated thread pools.

The key insight is separating I/O concurrency (async) from CPU parallelism (threads). Each has its place, and mixing them correctly is essential for performance.

---

## When to Use Threads vs Async

| Task Type | Use | Example |
|-----------|-----|---------|
| Network I/O | Async (tokio) | HTTP requests, database queries |
| File I/O | Async or spawn_blocking | Large file reads |
| CPU computation | Thread pool (rayon) | Image processing, hashing |
| Blocking libs | spawn_blocking | Legacy synchronous code |

---

## Using rayon for Parallel Processing

rayon is the go-to crate for data-parallel processing.

### Setup

```toml
[dependencies]
rayon = "1.8"
```

### Parallel Iterators

```rust
// src/parallel.rs
// Parallel processing with rayon

use rayon::prelude::*;

/// Process items in parallel
pub fn parallel_process(items: Vec<u32>) -> Vec<u64> {
    items
        .par_iter()         // Parallel iterator
        .map(|&x| {
            // CPU-intensive work per item
            expensive_computation(x)
        })
        .collect()
}

fn expensive_computation(n: u32) -> u64 {
    // Simulate CPU work
    (0..n as u64).map(|i| i * i).sum()
}

/// Parallel filter and map
pub fn filter_and_transform(data: Vec<String>) -> Vec<String> {
    data.par_iter()
        .filter(|s| s.len() > 5)
        .map(|s| s.to_uppercase())
        .collect()
}

/// Parallel reduction
pub fn parallel_sum(numbers: &[i64]) -> i64 {
    numbers.par_iter().sum()
}

/// Parallel find
pub fn parallel_search(items: &[Item], predicate: impl Fn(&Item) -> bool + Sync) -> Option<&Item> {
    items.par_iter().find_any(|item| predicate(item))
}

#[derive(Clone)]
struct Item {
    id: u64,
    value: String,
}
```

### Chunked Processing

```rust
// Process in chunks for better cache locality
use rayon::prelude::*;

pub fn process_in_chunks(data: &[u8], chunk_size: usize) -> Vec<u64> {
    data.par_chunks(chunk_size)
        .map(|chunk| {
            // Process each chunk
            chunk.iter().map(|&b| b as u64).sum::<u64>()
        })
        .collect()
}

/// Process with index
pub fn process_with_index(items: Vec<String>) -> Vec<(usize, String)> {
    items
        .into_par_iter()
        .enumerate()
        .map(|(idx, item)| (idx, item.to_uppercase()))
        .collect()
}
```

---

## Custom Thread Pool Configuration

```rust
// src/thread_pool.rs
// Configure rayon thread pool

use rayon::ThreadPoolBuilder;
use std::sync::OnceLock;

static COMPUTE_POOL: OnceLock<rayon::ThreadPool> = OnceLock::new();

/// Initialize a dedicated compute thread pool
pub fn init_compute_pool(num_threads: usize) {
    COMPUTE_POOL.get_or_init(|| {
        ThreadPoolBuilder::new()
            .num_threads(num_threads)
            .thread_name(|i| format!("compute-{}", i))
            .build()
            .expect("Failed to create thread pool")
    });
}

/// Run computation on dedicated pool
pub fn compute<F, R>(f: F) -> R
where
    F: FnOnce() -> R + Send,
    R: Send,
{
    COMPUTE_POOL
        .get()
        .expect("Compute pool not initialized")
        .install(f)
}

// Usage
fn example() {
    init_compute_pool(4);

    let result = compute(|| {
        // CPU-intensive work runs on dedicated pool
        heavy_computation()
    });
}

fn heavy_computation() -> u64 {
    (0..1_000_000u64).sum()
}
```

---

## Integrating with Async (Tokio)

Use `spawn_blocking` to run CPU work without blocking the async runtime.

```rust
// src/async_cpu.rs
// Integrating CPU work with async code

use tokio::task;

/// Offload CPU work to blocking thread pool
pub async fn async_compute<F, R>(f: F) -> R
where
    F: FnOnce() -> R + Send + 'static,
    R: Send + 'static,
{
    task::spawn_blocking(f)
        .await
        .expect("Blocking task panicked")
}

/// Process items with async wrapper
pub async fn process_items_async(items: Vec<u32>) -> Vec<u64> {
    async_compute(move || {
        // Use rayon inside spawn_blocking
        items
            .par_iter()
            .map(|&x| expensive_computation(x))
            .collect()
    })
    .await
}

/// Example: Hash password (CPU-intensive)
pub async fn hash_password(password: String) -> String {
    task::spawn_blocking(move || {
        // Argon2 hashing is CPU-intensive
        argon2_hash(&password)
    })
    .await
    .expect("Hashing failed")
}

/// Example: Image processing
pub async fn resize_image(image_data: Vec<u8>, width: u32, height: u32) -> Vec<u8> {
    task::spawn_blocking(move || {
        // Image processing is CPU-intensive
        let img = image::load_from_memory(&image_data).unwrap();
        let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

        let mut output = Vec::new();
        resized.write_to(&mut std::io::Cursor::new(&mut output), image::ImageFormat::Png).unwrap();
        output
    })
    .await
    .expect("Image processing failed")
}

fn expensive_computation(n: u32) -> u64 {
    (0..n as u64).map(|i| i * i).sum()
}

fn argon2_hash(password: &str) -> String {
    // Placeholder
    format!("hashed:{}", password)
}
```

---

## Work Stealing and Load Balancing

rayon uses work stealing for automatic load balancing.

```rust
// src/work_stealing.rs
// Work stealing demonstration

use rayon::prelude::*;
use std::time::Instant;

/// Tasks with varying complexity
pub fn process_variable_workload(items: Vec<WorkItem>) -> Vec<Result> {
    items
        .par_iter()
        .map(|item| {
            // Work stealing handles variable task sizes
            process_item(item)
        })
        .collect()
}

struct WorkItem {
    complexity: u32,
    data: Vec<u8>,
}

struct Result {
    checksum: u64,
}

fn process_item(item: &WorkItem) -> Result {
    // Variable work based on complexity
    let iterations = item.complexity * 1000;
    let checksum: u64 = (0..iterations)
        .map(|i| item.data.get(i as usize % item.data.len()).map(|&b| b as u64).unwrap_or(0))
        .sum();

    Result { checksum }
}

/// Nested parallelism (rayon handles automatically)
pub fn nested_parallel(matrix: Vec<Vec<i32>>) -> Vec<i64> {
    matrix
        .par_iter()
        .map(|row| {
            // Inner parallelism - rayon manages thread allocation
            row.par_iter().map(|&x| x as i64 * x as i64).sum::<i64>()
        })
        .collect()
}
```

---

## Channel-Based Worker Pattern

For producer-consumer patterns with worker threads.

```rust
// src/worker_channel.rs
// Worker threads with channels

use std::sync::mpsc;
use std::thread;

pub struct WorkerPool<T, R> {
    sender: mpsc::Sender<Task<T, R>>,
    handles: Vec<thread::JoinHandle<()>>,
}

struct Task<T, R> {
    data: T,
    response: mpsc::Sender<R>,
}

impl<T, R> WorkerPool<T, R>
where
    T: Send + 'static,
    R: Send + 'static,
{
    /// Create a worker pool with the given processor function
    pub fn new<F>(num_workers: usize, processor: F) -> Self
    where
        F: Fn(T) -> R + Send + Sync + Clone + 'static,
    {
        let (sender, receiver) = mpsc::channel::<Task<T, R>>();
        let receiver = std::sync::Arc::new(std::sync::Mutex::new(receiver));

        let handles: Vec<_> = (0..num_workers)
            .map(|id| {
                let rx = receiver.clone();
                let proc = processor.clone();

                thread::Builder::new()
                    .name(format!("worker-{}", id))
                    .spawn(move || {
                        loop {
                            let task = {
                                let lock = rx.lock().unwrap();
                                lock.recv()
                            };

                            match task {
                                Ok(task) => {
                                    let result = proc(task.data);
                                    let _ = task.response.send(result);
                                }
                                Err(_) => break, // Channel closed
                            }
                        }
                    })
                    .expect("Failed to spawn worker")
            })
            .collect();

        Self { sender, handles }
    }

    /// Submit work and get result
    pub fn submit(&self, data: T) -> mpsc::Receiver<R> {
        let (tx, rx) = mpsc::channel();
        self.sender.send(Task { data, response: tx }).unwrap();
        rx
    }

    /// Shutdown the pool
    pub fn shutdown(self) {
        drop(self.sender); // Close channel
        for handle in self.handles {
            handle.join().unwrap();
        }
    }
}

// Usage example
fn worker_example() {
    let pool = WorkerPool::new(4, |n: u64| {
        // CPU-intensive computation
        (0..n).sum::<u64>()
    });

    let results: Vec<_> = (0..10)
        .map(|i| pool.submit(i * 1000))
        .collect();

    for rx in results {
        println!("Result: {}", rx.recv().unwrap());
    }

    pool.shutdown();
}
```

---

## Async Channel Integration

Combine tokio channels with CPU workers.

```rust
// src/async_workers.rs
// Async-aware worker pool

use tokio::sync::{mpsc, oneshot};
use std::thread;

pub struct AsyncWorkerPool {
    sender: mpsc::Sender<Job>,
}

struct Job {
    data: Vec<u8>,
    response: oneshot::Sender<Vec<u8>>,
}

impl AsyncWorkerPool {
    pub fn new(num_workers: usize) -> Self {
        let (tx, mut rx) = mpsc::channel::<Job>(100);

        // Spawn OS threads for CPU work
        for id in 0..num_workers {
            let mut rx = rx.clone();

            thread::Builder::new()
                .name(format!("cpu-worker-{}", id))
                .spawn(move || {
                    // Create a basic runtime for receiving from async channel
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .unwrap();

                    rt.block_on(async {
                        while let Some(job) = rx.recv().await {
                            // CPU-intensive processing
                            let result = process_data(&job.data);
                            let _ = job.response.send(result);
                        }
                    });
                })
                .unwrap();
        }

        // Prevent the receiver from being dropped
        std::mem::forget(rx);

        Self { sender: tx }
    }

    pub async fn process(&self, data: Vec<u8>) -> Vec<u8> {
        let (tx, rx) = oneshot::channel();

        self.sender
            .send(Job { data, response: tx })
            .await
            .expect("Worker pool closed");

        rx.await.expect("Worker died")
    }
}

fn process_data(data: &[u8]) -> Vec<u8> {
    // Simulate CPU work
    data.iter().map(|&b| b.wrapping_mul(2)).collect()
}
```

---

## Best Practices

1. **Don't block async runtime** - Use `spawn_blocking` for CPU work
2. **Use rayon for data parallelism** - Automatic work stealing
3. **Configure thread pools appropriately** - Don't exceed CPU cores
4. **Batch small tasks** - Overhead of parallelism needs amortization
5. **Profile first** - Not everything benefits from parallelism

---

*Need to monitor CPU usage in your services? [OneUptime](https://oneuptime.com) provides resource monitoring with CPU utilization tracking.*

**Related Reading:**
- [How to Use async Rust Without Blocking the Runtime](https://oneuptime.com/blog/post/2026-01-07-rust-async-without-blocking/view)
- [How to Profile Rust Applications](https://oneuptime.com/blog/post/2026-01-07-rust-profiling-perf-flamegraph/view)
