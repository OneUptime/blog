# How to Process Millions of Records with Parallel Jobs in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Parallel Processing, Rayon, Performance, Big Data

Description: Learn how to leverage Rust's Rayon library to process millions of records in parallel, dramatically cutting processing time while maintaining memory safety and code clarity.

---

Last month, I needed to process 12 million log entries to extract patterns for an analytics dashboard. My initial single-threaded implementation took over 40 minutes. After switching to parallel processing with Rayon, that dropped to under 4 minutes. Here's everything I learned about processing massive datasets in Rust.

## Why Rust for Large-Scale Data Processing

Rust gives you three things that matter for big data: zero-cost abstractions, fearless concurrency, and predictable memory usage. Unlike garbage-collected languages that can pause unpredictably during collection, Rust's ownership model means you know exactly when memory gets freed. And unlike C or C++, Rust's borrow checker prevents data races at compile time.

The Rayon library takes this further by making parallel iteration nearly as simple as sequential iteration. You swap `.iter()` for `.par_iter()` and Rayon handles work distribution across threads automatically.

## Getting Started with Rayon

Add Rayon to your `Cargo.toml`:

```toml
[dependencies]
rayon = "1.10"
```

The simplest way to parallelize is converting an iterator to a parallel iterator:

```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i64> = (0..10_000_000).collect();

    // Sequential - uses one core
    let sum_sequential: i64 = numbers.iter().sum();

    // Parallel - uses all available cores
    let sum_parallel: i64 = numbers.par_iter().sum();

    println!("Sum: {}", sum_parallel);
}
```

Rayon automatically splits the work into chunks and distributes them across a thread pool. The default pool size matches your CPU core count, but you can configure it if needed.

## Processing Records in Parallel

Let's look at a realistic example. Say you have a CSV with millions of transaction records and need to calculate statistics per merchant:

```rust
use rayon::prelude::*;
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Clone)]
struct Transaction {
    merchant_id: String,
    amount: f64,
    timestamp: i64,
}

fn process_transactions(transactions: Vec<Transaction>) -> HashMap<String, MerchantStats> {
    // Use Mutex for thread-safe accumulation
    let stats: Mutex<HashMap<String, MerchantStats>> = Mutex::new(HashMap::new());

    // Process all transactions in parallel
    transactions.par_iter().for_each(|tx| {
        let mut map = stats.lock().unwrap();
        let entry = map.entry(tx.merchant_id.clone()).or_insert(MerchantStats::default());
        entry.total_amount += tx.amount;
        entry.transaction_count += 1;
    });

    stats.into_inner().unwrap()
}

#[derive(Debug, Default)]
struct MerchantStats {
    total_amount: f64,
    transaction_count: u64,
}
```

This works, but the Mutex becomes a bottleneck since every thread contends for the same lock. For better performance, use `fold` and `reduce` to aggregate locally first:

```rust
use rayon::prelude::*;
use std::collections::HashMap;

fn process_transactions_fast(transactions: Vec<Transaction>) -> HashMap<String, MerchantStats> {
    transactions
        .par_iter()
        // Each thread builds its own local HashMap
        .fold(
            || HashMap::new(),
            |mut acc, tx| {
                let entry = acc.entry(tx.merchant_id.clone()).or_insert(MerchantStats::default());
                entry.total_amount += tx.amount;
                entry.transaction_count += 1;
                acc
            },
        )
        // Merge all local HashMaps into one
        .reduce(
            || HashMap::new(),
            |mut a, b| {
                for (merchant_id, stats) in b {
                    let entry = a.entry(merchant_id).or_insert(MerchantStats::default());
                    entry.total_amount += stats.total_amount;
                    entry.transaction_count += stats.transaction_count;
                }
                a
            },
        )
}
```

The `fold` operation runs independently on each thread's chunk of data. The `reduce` operation then merges results from different threads. This pattern eliminates lock contention entirely.

## Chunked Processing for Memory Efficiency

When dealing with truly massive datasets that don't fit in memory, process in chunks:

```rust
use rayon::prelude::*;
use std::fs::File;
use std::io::{BufRead, BufReader};

fn process_large_file(path: &str, chunk_size: usize) -> u64 {
    let file = File::open(path).expect("Failed to open file");
    let reader = BufReader::new(file);

    let mut total_matches = 0u64;
    let mut chunk: Vec<String> = Vec::with_capacity(chunk_size);

    for line in reader.lines() {
        let line = line.expect("Failed to read line");
        chunk.push(line);

        // Process chunk when it reaches the target size
        if chunk.len() >= chunk_size {
            total_matches += process_chunk(&chunk);
            chunk.clear();
        }
    }

    // Process remaining lines
    if !chunk.is_empty() {
        total_matches += process_chunk(&chunk);
    }

    total_matches
}

fn process_chunk(lines: &[String]) -> u64 {
    // Parallel processing within each chunk
    lines
        .par_iter()
        .filter(|line| line.contains("ERROR"))
        .count() as u64
}
```

This approach keeps memory usage constant regardless of file size while still leveraging parallelism within each chunk.

## Parallel Map and Filter Operations

Rayon shines with transformation pipelines. Here's how to filter and transform records in parallel:

```rust
use rayon::prelude::*;

#[derive(Debug)]
struct RawRecord {
    id: u64,
    data: String,
    valid: bool,
}

#[derive(Debug)]
struct ProcessedRecord {
    id: u64,
    hash: u64,
    word_count: usize,
}

fn transform_records(records: Vec<RawRecord>) -> Vec<ProcessedRecord> {
    records
        .into_par_iter()
        // Filter invalid records
        .filter(|r| r.valid)
        // Transform each record - runs in parallel
        .map(|r| ProcessedRecord {
            id: r.id,
            hash: calculate_hash(&r.data),
            word_count: r.data.split_whitespace().count(),
        })
        // Collect results back into a Vec
        .collect()
}

fn calculate_hash(data: &str) -> u64 {
    // Simulate CPU-intensive hashing
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    data.hash(&mut hasher);
    hasher.finish()
}
```

The `into_par_iter()` variant takes ownership of the collection, allowing Rayon to move items between threads without cloning.

## Controlling Parallelism

Sometimes you want to limit parallelism to avoid overwhelming downstream systems or to leave CPU headroom for other processes:

```rust
use rayon::ThreadPoolBuilder;

fn main() {
    // Create a custom thread pool with 4 threads
    let pool = ThreadPoolBuilder::new()
        .num_threads(4)
        .build()
        .expect("Failed to build thread pool");

    let data: Vec<i32> = (0..1_000_000).collect();

    // Run parallel work in the custom pool
    let result: i32 = pool.install(|| {
        data.par_iter()
            .map(|x| x * 2)
            .sum()
    });

    println!("Result: {}", result);
}
```

You can also set the global thread pool at startup:

```rust
use rayon::ThreadPoolBuilder;

fn main() {
    // Configure global pool - must be done before any parallel operations
    ThreadPoolBuilder::new()
        .num_threads(8)
        .thread_name(|index| format!("worker-{}", index))
        .build_global()
        .expect("Failed to configure global thread pool");

    // All subsequent par_iter() calls use this pool
}
```

## Handling Errors in Parallel Processing

When processing can fail, use `try_fold` and `try_reduce` to propagate errors:

```rust
use rayon::prelude::*;

fn parse_and_sum(lines: Vec<&str>) -> Result<i64, std::num::ParseIntError> {
    lines
        .par_iter()
        .try_fold(
            || 0i64,
            |acc, line| {
                let value: i64 = line.parse()?;
                Ok(acc + value)
            },
        )
        .try_reduce(|| 0, |a, b| Ok(a + b))
}

fn main() {
    let valid = vec!["1", "2", "3", "4", "5"];
    println!("Valid sum: {:?}", parse_and_sum(valid)); // Ok(15)

    let invalid = vec!["1", "2", "not_a_number", "4"];
    println!("Invalid sum: {:?}", parse_and_sum(invalid)); // Err(ParseIntError)
}
```

The parallel operation stops early when it encounters an error, though some in-flight work may complete.

## Benchmarking Your Parallel Code

Always measure. Not all workloads benefit from parallelism. The overhead of splitting work and merging results can outweigh gains for small datasets or simple operations.

```rust
use rayon::prelude::*;
use std::time::Instant;

fn benchmark() {
    let data: Vec<f64> = (0..10_000_000).map(|x| x as f64).collect();

    // Sequential
    let start = Instant::now();
    let _: f64 = data.iter().map(|x| x.sqrt()).sum();
    println!("Sequential: {:?}", start.elapsed());

    // Parallel
    let start = Instant::now();
    let _: f64 = data.par_iter().map(|x| x.sqrt()).sum();
    println!("Parallel: {:?}", start.elapsed());
}
```

On my 8-core machine, the parallel version runs about 5x faster for this workload. The speedup depends on the complexity of your per-item operation and the size of your dataset.

## Common Pitfalls

**Shared mutable state**: Avoid sharing mutable references across parallel iterations. Use `fold`/`reduce` patterns or concurrent data structures instead of wrapping everything in Mutex.

**Too-small workloads**: If each item takes microseconds to process, the overhead of parallelism dominates. Consider batching items or sticking with sequential processing.

**Order sensitivity**: Parallel iterators don't preserve order by default. If you need ordered results, use `par_iter().enumerate()` and sort afterward, or accept the performance cost of ordered parallel iteration.

**Memory allocation pressure**: Creating millions of intermediate allocations in parallel can thrash the allocator. Pre-allocate where possible and prefer in-place transformations.

## Summary

Rayon makes parallel processing in Rust surprisingly straightforward. For most use cases, switching from `.iter()` to `.par_iter()` gives you immediate speedups with minimal code changes. For more complex aggregations, the `fold`/`reduce` pattern lets you maintain thread-local state and merge results efficiently.

The key is to measure. Start with a sequential implementation, identify the bottleneck, and apply parallelism where it matters. With Rust's safety guarantees and Rayon's ergonomics, you get the performance of manual thread management without the bugs.
