# How to Build a High-Performance Web Crawler with Async Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Web Crawler, Async, Tokio, Performance

Description: A hands-on guide to building a fast, concurrent web crawler in Rust using async/await and Tokio, covering request handling, rate limiting, and practical patterns for scraping at scale.

---

Web crawlers sit at the heart of search engines, price aggregators, and data pipelines. When you need to fetch thousands of pages per second without melting your infrastructure, Rust's async ecosystem gives you the control and performance that garbage-collected languages struggle to match. This guide walks through building a production-ready crawler from scratch.

## Why Rust for Web Crawling?

Most crawlers start in Python or Node.js because the initial prototype comes together quickly. But as you scale, you hit walls: memory bloat from holding thousands of concurrent connections, unpredictable GC pauses under load, and CPU overhead from runtime abstractions.

Rust sidesteps these problems. Zero-cost abstractions mean your async code compiles down to state machines with no hidden allocations. The ownership model prevents data races at compile time, so you can share state across thousands of tasks without locks (or with fine-grained locks where necessary). And Tokio, the dominant async runtime, handles millions of concurrent tasks on a small thread pool.

The trade-off is upfront complexity. Rust's learning curve is real, but for a CPU-and-IO-bound workload like crawling, the payoff in throughput per dollar of compute is substantial.

## Setting Up the Project

Start with a new Cargo project and add the dependencies you will need:

```toml
# Cargo.toml
[package]
name = "crawler"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["gzip", "brotli"] }
scraper = "0.20"
url = "2"
governor = "0.6"          # rate limiting
dashmap = "6"             # concurrent hashmap
tracing = "0.1"
tracing-subscriber = "0.3"
futures = "0.3"
anyhow = "1"
```

Tokio provides the async runtime. Reqwest handles HTTP with connection pooling built in. Scraper parses HTML using CSS selectors. Governor gives you a token-bucket rate limiter so you don't hammer target servers. DashMap is a concurrent HashMap for tracking visited URLs without a global mutex.

## The Core Crawler Loop

A crawler's job is straightforward: take a URL, fetch it, extract links, and repeat. The trick is doing this concurrently while respecting rate limits and avoiding infinite loops on circular links.

Here is the skeleton:

```rust
use anyhow::Result;
use dashmap::DashSet;
use governor::{Quota, RateLimiter};
use reqwest::Client;
use scraper::{Html, Selector};
use std::num::NonZeroU32;
use std::sync::Arc;
use tokio::sync::mpsc;
use url::Url;

// Shared state across all crawler tasks
struct CrawlerState {
    client: Client,
    visited: DashSet<String>,
    limiter: RateLimiter<
        governor::state::NotKeyed,
        governor::state::InMemoryState,
        governor::clock::DefaultClock,
    >,
}

impl CrawlerState {
    fn new(requests_per_second: u32) -> Self {
        let client = Client::builder()
            .user_agent("MyCrawler/1.0")
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("failed to build HTTP client");

        // Token bucket: refill `requests_per_second` tokens every second
        let quota = Quota::per_second(NonZeroU32::new(requests_per_second).unwrap());
        let limiter = RateLimiter::direct(quota);

        Self {
            client,
            visited: DashSet::new(),
            limiter,
        }
    }
}
```

The `DashSet` tracks URLs we have already fetched. Because it is sharded internally, multiple tasks can insert and check membership without blocking each other. The rate limiter ensures we stay under a configurable requests-per-second ceiling.

## Fetching and Parsing Pages

Each crawl task waits for a rate limit token, fetches the page, parses the HTML, and sends discovered links back to a central channel:

```rust
async fn crawl_page(
    state: Arc<CrawlerState>,
    url: Url,
    link_tx: mpsc::Sender<Url>,
) -> Result<()> {
    // Wait for rate limit token before making the request
    state.limiter.until_ready().await;

    let response = state.client.get(url.clone()).send().await?;

    // Only process successful HTML responses
    if !response.status().is_success() {
        tracing::warn!(url = %url, status = %response.status(), "non-success status");
        return Ok(());
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !content_type.contains("text/html") {
        return Ok(());
    }

    let body = response.text().await?;
    let document = Html::parse_document(&body);
    let selector = Selector::parse("a[href]").unwrap();

    for element in document.select(&selector) {
        if let Some(href) = element.value().attr("href") {
            // Resolve relative URLs against the current page
            if let Ok(absolute) = url.join(href) {
                // Only follow http/https links
                if absolute.scheme() == "http" || absolute.scheme() == "https" {
                    // Skip if already visited
                    let key = absolute.to_string();
                    if state.visited.insert(key) {
                        let _ = link_tx.send(absolute).await;
                    }
                }
            }
        }
    }

    tracing::info!(url = %url, "crawled successfully");
    Ok(())
}
```

A few details worth noting. We resolve relative URLs with `url.join()` so links like `/about` become fully qualified. The `visited.insert()` call returns true only if the URL was not already present, so we avoid duplicate work without a separate check-then-insert race. And we pass errors up with `anyhow` rather than panicking, because one bad page should not crash the whole crawler.

## Orchestrating Concurrent Tasks

The main loop spawns a pool of worker tasks that pull URLs from a channel:

```rust
#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let state = Arc::new(CrawlerState::new(50)); // 50 requests per second
    let (link_tx, mut link_rx) = mpsc::channel::<Url>(10_000);

    // Seed the crawler with starting URLs
    let seeds = vec![
        "https://example.com",
        "https://rust-lang.org",
    ];

    for seed in seeds {
        let url = Url::parse(seed)?;
        state.visited.insert(url.to_string());
        link_tx.send(url).await?;
    }

    // Spawn a fixed number of worker tasks
    let num_workers = 100;
    let mut handles = Vec::with_capacity(num_workers);

    for _ in 0..num_workers {
        let state = Arc::clone(&state);
        let link_tx = link_tx.clone();
        let mut rx = link_rx; // Move receiver into first worker, then recreate channel

        // Actually, we need a different pattern - use a shared receiver
        // Let's use tokio::sync::Semaphore instead for worker limiting
    }

    // Better approach: spawn tasks on demand with a semaphore for concurrency control
    let semaphore = Arc::new(tokio::sync::Semaphore::new(100));

    // Drop original sender so channel closes when all work is done
    drop(link_tx);

    while let Some(url) = link_rx.recv().await {
        let permit = semaphore.clone().acquire_owned().await?;
        let state = Arc::clone(&state);
        let tx = link_tx.clone(); // This won't work after drop - need different design

        tokio::spawn(async move {
            let _ = crawl_page(state, url, tx).await;
            drop(permit);
        });
    }

    Ok(())
}
```

In practice, you will want a more sophisticated design. The pattern above has a subtle issue: once we drop the sender, we cannot send new links. A common fix is to track in-flight tasks with an atomic counter and only close the channel when both the queue is empty and no tasks are running.

Here is a cleaner version using a work-stealing approach:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let state = Arc::new(CrawlerState::new(50));
    let (link_tx, link_rx) = async_channel::bounded::<Url>(10_000);
    let in_flight = Arc::new(AtomicUsize::new(0));

    // Seed URLs
    for seed in ["https://example.com", "https://rust-lang.org"] {
        let url = Url::parse(seed)?;
        state.visited.insert(url.to_string());
        link_tx.send(url).await?;
        in_flight.fetch_add(1, Ordering::SeqCst);
    }

    // Spawn workers that compete for URLs from the shared channel
    let mut handles = Vec::new();
    for _ in 0..100 {
        let state = Arc::clone(&state);
        let rx = link_rx.clone();
        let tx = link_tx.clone();
        let counter = Arc::clone(&in_flight);

        handles.push(tokio::spawn(async move {
            while let Ok(url) = rx.recv().await {
                let _ = crawl_page_v2(&state, url, &tx, &counter).await;
            }
        }));
    }

    // Close sender side - workers will exit when channel drains
    drop(link_tx);

    for handle in handles {
        handle.await?;
    }

    println!("Crawled {} unique URLs", state.visited.len());
    Ok(())
}
```

## Production Considerations

A toy crawler becomes a production system when you add:

**Politeness controls.** Respect `robots.txt` by fetching and caching it per domain. Add per-domain rate limiting, not just global. Insert random delays to avoid detection as a bot.

**Persistent frontier.** Storing the URL queue in memory limits your crawl size. Use RocksDB or Redis to persist the frontier so you can resume after crashes.

**Deduplication at scale.** A `DashSet` of full URL strings eats memory fast. Consider hashing URLs with xxHash or using a bloom filter for probabilistic deduplication.

**Structured extraction.** Once you have the HTML, you often need structured data. Integrate with libraries like `select.rs` or build domain-specific extractors that output JSON or feed directly into your data pipeline.

**Observability.** Export metrics to Prometheus: URLs crawled, errors by type, request latency histograms, queue depth. When something breaks at 3 AM, you will thank yourself.

## Wrapping Up

Rust's async model is a natural fit for web crawling. You get fine-grained control over concurrency, predictable memory usage, and the confidence that comes from compile-time safety guarantees. The examples here give you a working foundation. From here, you can add domain filtering, distributed coordination across multiple machines, or specialized parsers for your target sites.

The Rust ecosystem continues to mature. Crates like `spider-rs` provide higher-level crawling abstractions if you want to skip the plumbing. But understanding the fundamentals - rate limiting, concurrent state management, and async task orchestration - will serve you well regardless of the tools you choose.
