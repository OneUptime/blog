# How to Build a StatsD-Compatible Metrics Collector in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, StatsD, Metrics, Monitoring, Observability

Description: A hands-on guide to building a StatsD-compatible metrics collector in Rust, covering UDP server implementation, metric parsing, aggregation, and flushing to backends.

---

> StatsD has been around since 2011 when Etsy open-sourced it, and its simple UDP-based protocol remains one of the most widely used ways to collect application metrics. Building your own StatsD-compatible collector in Rust gives you performance, memory safety, and the flexibility to customize metric handling for your specific needs.

This guide walks through building a functional StatsD collector from scratch. By the end, you will have a working server that accepts StatsD metrics over UDP, aggregates them, and flushes to a configurable backend.

---

## Why Rust for a Metrics Collector?

Metrics collectors sit in the hot path of your observability stack. They need to handle thousands of UDP packets per second without dropping data or consuming excessive resources. Rust fits this use case well:

- Zero-cost abstractions keep throughput high
- Memory safety without garbage collection pauses
- Excellent async runtime support with Tokio
- Strong typing catches protocol parsing bugs at compile time

Let's build one.

---

## Project Setup

Start by creating a new Rust project and adding the dependencies we need:

```bash
cargo new statsd-collector
cd statsd-collector
```

Add these dependencies to your `Cargo.toml`:

```toml
[package]
name = "statsd-collector"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.35", features = ["full"] }
bytes = "1.5"
dashmap = "5.5"           # Concurrent hashmap for metric storage
tracing = "0.1"           # Structured logging
tracing-subscriber = "0.3"
```

---

## Understanding the StatsD Protocol

StatsD uses a simple text-based protocol over UDP. Each metric follows this format:

```
<metric_name>:<value>|<type>|@<sample_rate>|#<tags>
```

The metric types you will encounter most often:

- **Counter (c)**: Increments a value - `page.views:1|c`
- **Gauge (g)**: Sets an absolute value - `cpu.usage:78.5|g`
- **Timer (ms)**: Records timing data - `api.latency:45|ms`
- **Histogram (h)**: Distribution of values - `response.size:1024|h`
- **Set (s)**: Counts unique values - `users.unique:user123|s`

Sample rates and tags are optional. A metric with all fields looks like:

```
http.requests:1|c|@0.5|#env:prod,service:api
```

---

## Parsing StatsD Metrics

Let's define our metric types and build a parser. The parser needs to handle the various formats while being tolerant of minor variations:

```rust
// src/metric.rs
use std::collections::HashMap;

// Enum representing the different metric types StatsD supports
#[derive(Debug, Clone, PartialEq)]
pub enum MetricType {
    Counter,
    Gauge,
    Timer,
    Histogram,
    Set,
}

// Parsed metric with all components extracted
#[derive(Debug, Clone)]
pub struct Metric {
    pub name: String,
    pub value: f64,
    pub metric_type: MetricType,
    pub sample_rate: f64,
    pub tags: HashMap<String, String>,
}

impl Metric {
    // Parse a raw StatsD line into a Metric struct
    // Returns None if parsing fails rather than panicking
    pub fn parse(line: &str) -> Option<Self> {
        let line = line.trim();
        if line.is_empty() {
            return None;
        }

        // Split on colon to separate name from the rest
        let (name, remainder) = line.split_once(':')?;

        // Split remainder on pipe to get value and type info
        let parts: Vec<&str> = remainder.split('|').collect();
        if parts.len() < 2 {
            return None;
        }

        // Parse the numeric value
        let value: f64 = parts[0].parse().ok()?;

        // Parse metric type from the type indicator
        let metric_type = match parts[1] {
            "c" => MetricType::Counter,
            "g" => MetricType::Gauge,
            "ms" => MetricType::Timer,
            "h" => MetricType::Histogram,
            "s" => MetricType::Set,
            _ => return None,
        };

        // Default sample rate is 1.0 (100% of samples)
        let mut sample_rate = 1.0;
        let mut tags = HashMap::new();

        // Process optional parts: sample rate and tags
        for part in parts.iter().skip(2) {
            if let Some(rate) = part.strip_prefix('@') {
                // Sample rate like @0.5 means 50% sampling
                sample_rate = rate.parse().unwrap_or(1.0);
            } else if let Some(tag_str) = part.strip_prefix('#') {
                // Tags formatted as key:value,key:value
                for tag in tag_str.split(',') {
                    if let Some((key, val)) = tag.split_once(':') {
                        tags.insert(key.to_string(), val.to_string());
                    }
                }
            }
        }

        Some(Metric {
            name: name.to_string(),
            value,
            metric_type,
            sample_rate,
            tags,
        })
    }
}
```

---

## Building the UDP Server

The UDP server listens for incoming metrics and hands them off for processing. Tokio makes async UDP handling straightforward:

```rust
// src/server.rs
use tokio::net::UdpSocket;
use tracing::{info, warn, debug};

pub struct StatsServer {
    socket: UdpSocket,
    buffer_size: usize,
}

impl StatsServer {
    // Bind to the specified address and create the server
    pub async fn bind(addr: &str, buffer_size: usize) -> std::io::Result<Self> {
        let socket = UdpSocket::bind(addr).await?;
        info!("StatsD server listening on {}", addr);

        Ok(StatsServer {
            socket,
            buffer_size,
        })
    }

    // Main receive loop - processes packets until shutdown
    pub async fn run<F>(&self, mut handler: F) -> std::io::Result<()>
    where
        F: FnMut(&str),
    {
        // Pre-allocate buffer to avoid repeated allocations
        let mut buf = vec![0u8; self.buffer_size];

        loop {
            // recv_from returns packet size and sender address
            match self.socket.recv_from(&mut buf).await {
                Ok((len, _addr)) => {
                    // Convert bytes to string, handling invalid UTF-8 gracefully
                    if let Ok(data) = std::str::from_utf8(&buf[..len]) {
                        // StatsD allows multiple metrics per packet, newline separated
                        for line in data.lines() {
                            debug!("Received metric: {}", line);
                            handler(line);
                        }
                    }
                }
                Err(e) => {
                    warn!("Error receiving UDP packet: {}", e);
                }
            }
        }
    }
}
```

---

## Metric Aggregation

Raw metrics need aggregation before flushing. Counters sum up, gauges take the latest value, and timers collect values for statistical analysis:

```rust
// src/aggregator.rs
use dashmap::DashMap;
use std::sync::Arc;
use crate::metric::{Metric, MetricType};

// Thread-safe aggregator using DashMap for lock-free concurrent access
pub struct Aggregator {
    // Counters accumulate values between flushes
    counters: Arc<DashMap<String, f64>>,
    // Gauges store the most recent value
    gauges: Arc<DashMap<String, f64>>,
    // Timers collect all values for percentile calculation
    timers: Arc<DashMap<String, Vec<f64>>>,
    // Sets track unique values using a simple count
    sets: Arc<DashMap<String, std::collections::HashSet<String>>>,
}

impl Aggregator {
    pub fn new() -> Self {
        Aggregator {
            counters: Arc::new(DashMap::new()),
            gauges: Arc::new(DashMap::new()),
            timers: Arc::new(DashMap::new()),
            sets: Arc::new(DashMap::new()),
        }
    }

    // Record a metric into the appropriate aggregation bucket
    pub fn record(&self, metric: Metric) {
        // Adjust value based on sample rate
        // If sample_rate is 0.1, multiply by 10 to estimate true count
        let adjusted_value = metric.value / metric.sample_rate;

        match metric.metric_type {
            MetricType::Counter => {
                // Counters add to existing value
                self.counters
                    .entry(metric.name)
                    .and_modify(|v| *v += adjusted_value)
                    .or_insert(adjusted_value);
            }
            MetricType::Gauge => {
                // Gauges replace the current value
                self.gauges.insert(metric.name, metric.value);
            }
            MetricType::Timer | MetricType::Histogram => {
                // Timers collect all values for later analysis
                self.timers
                    .entry(metric.name)
                    .and_modify(|v| v.push(metric.value))
                    .or_insert_with(|| vec![metric.value]);
            }
            MetricType::Set => {
                // Sets track unique string values
                let value_str = metric.value.to_string();
                self.sets
                    .entry(metric.name)
                    .and_modify(|s| { s.insert(value_str.clone()); })
                    .or_insert_with(|| {
                        let mut set = std::collections::HashSet::new();
                        set.insert(value_str);
                        set
                    });
            }
        }
    }

    // Flush aggregated metrics and reset state
    // Returns a snapshot of all current metrics
    pub fn flush(&self) -> AggregatedMetrics {
        // Drain counters and collect values
        let counters: Vec<(String, f64)> = self.counters
            .iter()
            .map(|entry| (entry.key().clone(), *entry.value()))
            .collect();
        self.counters.clear();

        // Collect gauges without clearing - they persist
        let gauges: Vec<(String, f64)> = self.gauges
            .iter()
            .map(|entry| (entry.key().clone(), *entry.value()))
            .collect();

        // Drain timers and calculate statistics
        let timers: Vec<(String, TimerStats)> = self.timers
            .iter()
            .map(|entry| {
                let stats = calculate_timer_stats(entry.value());
                (entry.key().clone(), stats)
            })
            .collect();
        self.timers.clear();

        // Drain sets and return unique counts
        let sets: Vec<(String, usize)> = self.sets
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().len()))
            .collect();
        self.sets.clear();

        AggregatedMetrics {
            counters,
            gauges,
            timers,
            sets,
        }
    }
}

// Statistics calculated from timer values
#[derive(Debug)]
pub struct TimerStats {
    pub count: usize,
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub p50: f64,
    pub p95: f64,
    pub p99: f64,
}

// Container for all aggregated metrics at flush time
#[derive(Debug)]
pub struct AggregatedMetrics {
    pub counters: Vec<(String, f64)>,
    pub gauges: Vec<(String, f64)>,
    pub timers: Vec<(String, TimerStats)>,
    pub sets: Vec<(String, usize)>,
}

// Calculate percentiles and other stats from a slice of values
fn calculate_timer_stats(values: &[f64]) -> TimerStats {
    if values.is_empty() {
        return TimerStats {
            count: 0, min: 0.0, max: 0.0, mean: 0.0,
            p50: 0.0, p95: 0.0, p99: 0.0,
        };
    }

    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let count = sorted.len();
    let sum: f64 = sorted.iter().sum();

    TimerStats {
        count,
        min: sorted[0],
        max: sorted[count - 1],
        mean: sum / count as f64,
        p50: percentile(&sorted, 50.0),
        p95: percentile(&sorted, 95.0),
        p99: percentile(&sorted, 99.0),
    }
}

// Calculate the nth percentile from a sorted slice
fn percentile(sorted: &[f64], pct: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = ((pct / 100.0) * (sorted.len() - 1) as f64).round() as usize;
    sorted[idx.min(sorted.len() - 1)]
}
```

---

## Periodic Flushing

StatsD collectors typically flush aggregated metrics every 10 seconds. Here is how to set up the flush loop:

```rust
// src/flusher.rs
use tokio::time::{interval, Duration};
use tracing::info;
use crate::aggregator::{Aggregator, AggregatedMetrics};

pub struct Flusher {
    aggregator: Arc<Aggregator>,
    flush_interval: Duration,
}

impl Flusher {
    pub fn new(aggregator: Arc<Aggregator>, flush_interval_secs: u64) -> Self {
        Flusher {
            aggregator,
            flush_interval: Duration::from_secs(flush_interval_secs),
        }
    }

    // Run the flush loop, calling the handler with metrics each interval
    pub async fn run<F>(&self, mut handler: F)
    where
        F: FnMut(AggregatedMetrics),
    {
        let mut ticker = interval(self.flush_interval);

        loop {
            ticker.tick().await;

            let metrics = self.aggregator.flush();

            info!(
                "Flushing metrics: {} counters, {} gauges, {} timers, {} sets",
                metrics.counters.len(),
                metrics.gauges.len(),
                metrics.timers.len(),
                metrics.sets.len()
            );

            handler(metrics);
        }
    }
}

use std::sync::Arc;
```

---

## Putting It Together

Here is the main function that wires everything up:

```rust
// src/main.rs
mod metric;
mod server;
mod aggregator;
mod flusher;

use std::sync::Arc;
use tracing::info;
use tracing_subscriber;

use crate::metric::Metric;
use crate::server::StatsServer;
use crate::aggregator::Aggregator;
use crate::flusher::Flusher;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    // Initialize structured logging
    tracing_subscriber::fmt::init();

    // Create shared aggregator instance
    let aggregator = Arc::new(Aggregator::new());
    let agg_clone = aggregator.clone();

    // Spawn the flush task in the background
    let flusher = Flusher::new(aggregator.clone(), 10);
    tokio::spawn(async move {
        flusher.run(|metrics| {
            // In production, send to your backend here
            // For now, just log the metrics
            for (name, value) in &metrics.counters {
                info!("counter {} = {}", name, value);
            }
            for (name, value) in &metrics.gauges {
                info!("gauge {} = {}", name, value);
            }
            for (name, stats) in &metrics.timers {
                info!(
                    "timer {} count={} mean={:.2} p95={:.2}",
                    name, stats.count, stats.mean, stats.p95
                );
            }
        }).await;
    });

    // Start the UDP server on the standard StatsD port
    let server = StatsServer::bind("0.0.0.0:8125", 65535).await?;

    server.run(|line| {
        if let Some(metric) = Metric::parse(line) {
            agg_clone.record(metric);
        }
    }).await
}
```

---

## Testing Your Collector

Send some test metrics using netcat:

```bash
# Send a counter
echo "api.requests:1|c" | nc -u -w0 127.0.0.1 8125

# Send a gauge
echo "memory.usage:75.5|g" | nc -u -w0 127.0.0.1 8125

# Send a timer
echo "db.query:45|ms" | nc -u -w0 127.0.0.1 8125

# Send multiple metrics in one packet
echo -e "req.count:1|c\nresp.time:23|ms" | nc -u -w0 127.0.0.1 8125
```

---

## Next Steps

This collector handles the basics, but production use requires more:

- **Backend integration**: Add exporters for Prometheus, InfluxDB, or your preferred backend
- **Configuration**: Load settings from files or environment variables
- **Health checks**: Add an HTTP endpoint for liveness probes
- **Metric validation**: Sanitize metric names and enforce limits
- **Graceful shutdown**: Handle SIGTERM and flush remaining metrics

The foundation here gives you a solid starting point. The Rust ecosystem has crates for most backends, making it straightforward to extend.

---

*Building custom observability tooling? [OneUptime](https://oneuptime.com) provides a complete observability platform with native StatsD support, distributed tracing, and log management. Start monitoring your applications today.*

**Related Reading:**
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Add Custom Metrics to Python Applications with Prometheus](https://oneuptime.com/blog/post/2025-01-06-python-custom-metrics-prometheus/view)
- [What is SLA, SLI and SLO's?](https://oneuptime.com/blog/post/2023-06-12-sli-sla-slo/view)
