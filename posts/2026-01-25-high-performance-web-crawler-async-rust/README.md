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
async-channel = "2"
anyhow = "1"
```

Tokio provides the async runtime. Reqwest handles HTTP with connection pooling built in. Scraper parses HTML using CSS selectors. Governor gives you an efficient GCRA-based rate limiter so you don't hammer target servers. DashMap is a concurrent HashMap for tracking visited URLs without a global mutex.

## The Core Crawler Loop

A crawler's job is straightforward: take a URL, fetch it, extract links, and repeat. The trick is doing this concurrently while respecting rate limits and avoiding infinite loops on circular links.

Here is the skeleton:

```rust
use anyhow::Result;
use async_channel::Sender;
use dashmap::DashSet;
use governor::{Quota, RateLimiter};
use reqwest::Client;
use scraper::{Html, Selector};
use std::num::NonZeroU32;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
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

        // Allow `requests_per_second` cells per second
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
    link_tx: Sender<Url>,
    in_flight: Arc<AtomicUsize>,
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
    let links = {
        let document = Html::parse_document(&body);
        let selector = Selector::parse("a[href]").unwrap();
        let mut links = Vec::new();

        for element in document.select(&selector) {
            if let Some(href) = element.value().attr("href") {
                // Resolve relative URLs against the current page
                if let Ok(absolute) = url.join(href) {
                    // Only follow http/https links
                    if absolute.scheme() == "http" || absolute.scheme() == "https" {
                        // Skip if already visited
                        let key = absolute.to_string();
                        if state.visited.insert(key) {
                            links.push(absolute);
                        }
                    }
                }
            }
        }

        links
    };

    for link in links {
        in_flight.fetch_add(1, Ordering::SeqCst);
        if link_tx.send(link).await.is_err() {
            in_flight.fetch_sub(1, Ordering::SeqCst);
        }
    }

    tracing::info!(url = %url, "crawled successfully");
    Ok(())
}
```

A few details worth noting. We resolve relative URLs with `url.join()` so links like `/about` become fully qualified. The `visited.insert()` call returns true only if the URL was not already present, so we avoid duplicate work without a separate check-then-insert race. We collect links before awaiting on the channel because `scraper`'s document and element references are not `Send`, and spawned Tokio tasks need their futures to be `Send`. And we pass errors up with `anyhow` rather than panicking, because one bad page should not crash the whole crawler.

## Orchestrating Concurrent Tasks

The main loop spawns a pool of worker tasks that compete for URLs from a shared channel. Tokio's `mpsc` channel has only one receiver, so this example uses `async-channel`, whose receivers can be cloned across workers. The in-flight counter lets the last worker close the channel when there are no queued or active URLs left:

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
        if state.visited.insert(url.to_string()) {
            in_flight.fetch_add(1, Ordering::SeqCst);
            link_tx.send(url).await?;
        }
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
                if let Err(error) = crawl_page(
                    Arc::clone(&state),
                    url,
                    tx.clone(),
                    Arc::clone(&counter),
                )
                .await
                {
                    tracing::warn!(%error, "crawl failed");
                }

                if counter.fetch_sub(1, Ordering::SeqCst) == 1 {
                    tx.close();
                }
            }
        }));
    }

    // Drop the original sender; worker clones stay alive until the counter reaches zero
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
