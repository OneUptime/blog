# How to Process Streaming Data with Sub-Millisecond Latency in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Streaming, Low Latency, Performance, Real-time

Description: A practical guide to building ultra-low-latency streaming data pipelines in Rust, covering zero-copy parsing, lock-free channels, and memory optimization techniques that keep processing times under a millisecond.

---

When you need to process millions of events per second with latency measured in microseconds rather than milliseconds, language choice matters. Rust has become the go-to option for teams building trading systems, telemetry pipelines, and real-time analytics engines. The combination of zero-cost abstractions, predictable memory management, and the absence of garbage collection pauses makes it uniquely suited for this workload.

This guide walks through the core techniques we use to keep streaming data processing under the one-millisecond mark, with working code you can adapt for your own systems.

## Why Rust for Low-Latency Streaming

Before diving into code, it helps to understand why Rust excels here compared to alternatives:

- **No garbage collector**: Languages like Go or Java introduce unpredictable GC pauses that can spike latency from microseconds to tens of milliseconds.
- **Zero-cost abstractions**: High-level constructs like iterators compile down to the same assembly as hand-written loops.
- **Predictable memory layout**: You control exactly how data is laid out, enabling cache-friendly access patterns.
- **Fearless concurrency**: The borrow checker catches data races at compile time, so you can parallelize without defensive locking.

These properties let you write code that reads well and still performs like hand-tuned C.

## The Anatomy of a Sub-Millisecond Pipeline

A typical low-latency streaming pipeline has three stages: ingestion, processing, and output. Each stage needs careful attention to avoid introducing latency spikes.

```rust
use std::time::Instant;

// Simple event structure - keep it small and cache-friendly
#[repr(C)]
#[derive(Clone, Copy)]
pub struct Event {
    pub timestamp: u64,
    pub event_type: u8,
    pub payload: [u8; 64],
}

impl Event {
    // Parse from raw bytes without allocation
    pub fn from_bytes(data: &[u8; 73]) -> Self {
        Event {
            timestamp: u64::from_le_bytes(data[0..8].try_into().unwrap()),
            event_type: data[8],
            payload: data[9..73].try_into().unwrap(),
        }
    }
}
```

The `#[repr(C)]` attribute ensures predictable memory layout. The fixed-size payload avoids heap allocation entirely - everything lives on the stack or in pre-allocated buffers.

## Zero-Copy Parsing for Maximum Throughput

Parsing is often the first bottleneck. Every allocation and copy adds latency. The solution is to work with borrowed references wherever possible.

```rust
use std::io::Read;

// Ring buffer for zero-copy message framing
pub struct RingBuffer {
    data: Box<[u8]>,
    read_pos: usize,
    write_pos: usize,
}

impl RingBuffer {
    pub fn new(capacity: usize) -> Self {
        RingBuffer {
            data: vec![0u8; capacity].into_boxed_slice(),
            read_pos: 0,
            write_pos: 0,
        }
    }

    // Returns a slice to read from without copying
    pub fn readable_slice(&self) -> &[u8] {
        &self.data[self.read_pos..self.write_pos]
    }

    // Advance the read position after processing
    pub fn consume(&mut self, count: usize) {
        self.read_pos += count;
        // Compact when we have processed enough
        if self.read_pos > self.data.len() / 2 {
            self.data.copy_within(self.read_pos..self.write_pos, 0);
            self.write_pos -= self.read_pos;
            self.read_pos = 0;
        }
    }

    // Write new data into the buffer
    pub fn write_from<R: Read>(&mut self, reader: &mut R) -> std::io::Result<usize> {
        let bytes_read = reader.read(&mut self.data[self.write_pos..])?;
        self.write_pos += bytes_read;
        Ok(bytes_read)
    }
}
```

This ring buffer lets you accumulate incoming bytes and parse messages directly from the buffer without intermediate copies. The `readable_slice` method returns a reference to the data in place.

## Lock-Free Channels for Multi-Threaded Processing

When you need to fan out events across multiple processing threads, standard `mpsc` channels introduce mutex contention. Lock-free alternatives like `crossbeam-channel` or custom SPSC (Single Producer Single Consumer) queues eliminate this overhead.

```rust
use crossbeam_channel::{bounded, Receiver, Sender};
use std::thread;

// Create a bounded channel - backpressure prevents memory blowup
fn create_pipeline(buffer_size: usize) -> (Sender<Event>, Receiver<Event>) {
    bounded(buffer_size)
}

// Producer thread - ingests events as fast as possible
fn run_producer(tx: Sender<Event>, mut source: impl FnMut() -> Option<Event>) {
    while let Some(event) = source() {
        // try_send avoids blocking - drops events under pressure
        // Use send() if you need guaranteed delivery
        if tx.try_send(event).is_err() {
            // Log or count dropped events for monitoring
        }
    }
}

// Consumer thread - processes events with minimal overhead
fn run_consumer(rx: Receiver<Event>, mut handler: impl FnMut(Event)) {
    // recv_batch would be even faster for batched processing
    for event in rx {
        handler(event);
    }
}

// Wire it all together
fn main() {
    let (tx, rx) = create_pipeline(10_000);

    let producer = thread::spawn(move || {
        // Simulate event source
        let mut counter = 0u64;
        run_producer(tx, || {
            counter += 1;
            if counter < 1_000_000 {
                Some(Event {
                    timestamp: counter,
                    event_type: (counter % 256) as u8,
                    payload: [0u8; 64],
                })
            } else {
                None
            }
        });
    });

    let consumer = thread::spawn(move || {
        let mut count = 0u64;
        let start = Instant::now();
        run_consumer(rx, |_event| {
            count += 1;
        });
        let elapsed = start.elapsed();
        println!(
            "Processed {} events in {:?} - {:.2} events/sec",
            count,
            elapsed,
            count as f64 / elapsed.as_secs_f64()
        );
    });

    producer.join().unwrap();
    consumer.join().unwrap();
}
```

Bounded channels provide natural backpressure. When the consumer falls behind, the producer blocks or drops events rather than consuming unbounded memory.

## Pre-Allocation and Object Pools

Heap allocation is the enemy of consistent latency. The allocator itself can introduce multi-microsecond pauses. The fix is to pre-allocate everything at startup.

```rust
// Simple object pool for reusable buffers
pub struct BufferPool {
    buffers: Vec<Vec<u8>>,
    buffer_size: usize,
}

impl BufferPool {
    pub fn new(count: usize, buffer_size: usize) -> Self {
        let buffers = (0..count)
            .map(|_| vec![0u8; buffer_size])
            .collect();
        BufferPool { buffers, buffer_size }
    }

    // Grab a buffer from the pool
    pub fn acquire(&mut self) -> Option<Vec<u8>> {
        self.buffers.pop()
    }

    // Return a buffer to the pool
    pub fn release(&mut self, mut buffer: Vec<u8>) {
        buffer.clear();
        if buffer.capacity() == self.buffer_size {
            self.buffers.push(buffer);
        }
        // Drop oversized buffers to prevent memory creep
    }
}
```

For more sophisticated pooling, consider crates like `typed-arena` or `bumpalo` that provide arena allocators with even lower overhead.

## Pinning Threads to CPU Cores

At sub-millisecond latencies, CPU cache behavior dominates. When the OS scheduler moves your thread between cores, the cache goes cold and latency spikes. Core affinity fixes this.

```rust
use core_affinity;

fn pin_to_core(core_id: usize) {
    let core_ids = core_affinity::get_core_ids().unwrap();
    if let Some(core) = core_ids.get(core_id) {
        core_affinity::set_for_current(*core);
    }
}

// In your worker thread
fn run_pinned_worker(core_id: usize, rx: Receiver<Event>) {
    pin_to_core(core_id);

    for event in rx {
        // Process with warm cache
        process_event(&event);
    }
}

fn process_event(event: &Event) {
    // Your processing logic here
}
```

Combine core pinning with NUMA-aware memory allocation for the best results on multi-socket systems.

## Measuring Latency Correctly

You cannot optimize what you do not measure. But measuring latency correctly is tricky - you need high-resolution timestamps and statistical analysis.

```rust
use std::time::Instant;

// Simple latency histogram with microsecond buckets
pub struct LatencyHistogram {
    buckets: [u64; 1000], // 0-999 microseconds
    overflow: u64,
}

impl LatencyHistogram {
    pub fn new() -> Self {
        LatencyHistogram {
            buckets: [0; 1000],
            overflow: u64::default(),
        }
    }

    pub fn record(&mut self, start: Instant) {
        let micros = start.elapsed().as_micros() as usize;
        if micros < 1000 {
            self.buckets[micros] += 1;
        } else {
            self.overflow += 1;
        }
    }

    pub fn percentile(&self, p: f64) -> usize {
        let total: u64 = self.buckets.iter().sum::<u64>() + self.overflow;
        let target = (total as f64 * p / 100.0) as u64;
        let mut cumulative = 0u64;

        for (micros, count) in self.buckets.iter().enumerate() {
            cumulative += count;
            if cumulative >= target {
                return micros;
            }
        }
        1000 // Overflow bucket
    }
}
```

Always report P50, P99, and P99.9. The tail latencies reveal jitter that averages hide.

## Putting It All Together

Building sub-millisecond streaming systems requires attention at every layer: data layout, memory management, threading model, and measurement. Rust gives you the tools to control each of these without sacrificing code clarity.

The key principles to remember:

1. **Avoid allocation in the hot path** - pre-allocate buffers and use object pools.
2. **Minimize copying** - use references and zero-copy parsing.
3. **Use lock-free communication** - bounded channels with backpressure.
4. **Pin threads to cores** - keep caches warm and avoid scheduler jitter.
5. **Measure everything** - histograms beat averages for latency analysis.

Start with a simple pipeline, measure your baseline, and optimize the bottlenecks the profiler reveals. With Rust, the performance you measure in development is the performance you get in production - no GC surprises, no JIT warmup, just consistent microsecond-level latency.
