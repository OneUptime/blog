# How to Build High-Performance Web Scrapers in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Web Scraping, reqwest, scraper, HTML Parsing, Async

Description: A practical guide to building high-performance web scrapers in Rust using reqwest and scraper crates.

---

Web scraping is one of those tasks where performance really matters. When you're pulling data from thousands of pages, the difference between a slow scraper and a fast one can mean hours of wasted time. Rust gives you the speed of a compiled language with memory safety guarantees, making it an excellent choice for building scrapers that need to run reliably at scale.

In this guide, we'll build a real web scraper from scratch. No toy examples - we'll cover everything from basic HTTP requests to handling pagination, rate limiting, and proper error handling.

## Setting Up Your Project

First, create a new Rust project:

```bash
cargo new web_scraper
cd web_scraper
```

Add the following dependencies to your `Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json", "cookies"] }
scraper = "0.18"
tokio = { version = "1", features = ["full"] }
thiserror = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

We're using `reqwest` for HTTP requests (it's the most popular HTTP client in Rust), `scraper` for HTML parsing, `tokio` for async runtime, and `thiserror` for clean error handling.

## Making Your First HTTP Request

Let's start simple. Here's how to fetch a webpage using reqwest:

```rust
// Basic async function to fetch HTML content from a URL
// Returns the raw HTML as a String or an error
async fn fetch_page(url: &str) -> Result<String, reqwest::Error> {
    let response = reqwest::get(url).await?;
    let body = response.text().await?;
    Ok(body)
}

#[tokio::main]
async fn main() {
    match fetch_page("https://example.com").await {
        Ok(html) => println!("Got {} bytes", html.len()),
        Err(e) => eprintln!("Failed to fetch: {}", e),
    }
}
```

This works, but it's too basic for real scraping. We need proper headers, timeouts, and connection pooling.

## Building a Proper HTTP Client

For production scraping, you want a reusable client with sensible defaults:

```rust
use reqwest::{Client, header};
use std::time::Duration;

// Creates a configured HTTP client with browser-like headers
// The client reuses connections, which speeds up multiple requests significantly
fn build_client() -> Result<Client, reqwest::Error> {
    let mut headers = header::HeaderMap::new();
    
    // Set a realistic User-Agent to avoid being blocked
    headers.insert(
        header::USER_AGENT,
        header::HeaderValue::from_static(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        ),
    );
    
    // Accept HTML content
    headers.insert(
        header::ACCEPT,
        header::HeaderValue::from_static("text/html,application/xhtml+xml"),
    );

    Client::builder()
        .default_headers(headers)
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(10)
        .build()
}
```

Connection pooling is crucial. Creating a new TCP connection for every request is slow. The client above reuses connections to the same host, which can make your scraper 3-5x faster when hitting the same domain repeatedly.

## Parsing HTML with the Scraper Crate

The `scraper` crate uses CSS selectors to find elements - the same selectors you'd use in browser DevTools or jQuery. Here's how it works:

```rust
use scraper::{Html, Selector};

// Parses HTML and extracts all links from anchor tags
// Returns a vector of (text, href) tuples
fn extract_links(html: &str) -> Vec<(String, String)> {
    let document = Html::parse_document(html);
    
    // This selector matches all <a> tags with an href attribute
    let link_selector = Selector::parse("a[href]").unwrap();
    
    let mut links = Vec::new();
    
    for element in document.select(&link_selector) {
        // Get the href attribute value
        let href = element.value().attr("href").unwrap_or("");
        
        // Get the visible text inside the link
        let text: String = element.text().collect();
        
        links.push((text.trim().to_string(), href.to_string()));
    }
    
    links
}
```

CSS selectors in the scraper crate support most standard patterns:

```rust
// Various CSS selector examples for common scraping tasks

// Select by class
let selector = Selector::parse(".product-card").unwrap();

// Select by ID
let selector = Selector::parse("#main-content").unwrap();

// Select nested elements - finds span inside div with class "price"
let selector = Selector::parse("div.price > span").unwrap();

// Select by attribute contains
let selector = Selector::parse("a[href*='product']").unwrap();

// Select multiple elements with comma
let selector = Selector::parse("h1, h2, h3").unwrap();

// Select by nth-child - useful for tables
let selector = Selector::parse("tr:nth-child(even)").unwrap();
```

## A Real Example: Scraping Product Data

Let's build something practical - a scraper that extracts product information:

```rust
use scraper::{Html, Selector};
use serde::Serialize;

// Represents a product extracted from the page
#[derive(Debug, Serialize)]
struct Product {
    name: String,
    price: Option<f64>,
    description: String,
    url: String,
}

// Extracts product data from an HTML page
// Uses multiple selectors to gather different pieces of information
fn parse_product_page(html: &str, page_url: &str) -> Option<Product> {
    let document = Html::parse_document(html);
    
    // Selector for product title - try multiple common patterns
    let title_selector = Selector::parse("h1.product-title, h1.product-name, h1[itemprop='name']")
        .unwrap();
    
    // Selector for price
    let price_selector = Selector::parse(".price, .product-price, [itemprop='price']")
        .unwrap();
    
    // Selector for description
    let desc_selector = Selector::parse(".description, .product-description, [itemprop='description']")
        .unwrap();
    
    // Extract title - return None if we can't find it
    let name = document
        .select(&title_selector)
        .next()?
        .text()
        .collect::<String>()
        .trim()
        .to_string();
    
    // Extract price and parse it to a number
    let price = document
        .select(&price_selector)
        .next()
        .map(|el| {
            let text: String = el.text().collect();
            // Remove currency symbols and parse
            text.chars()
                .filter(|c| c.is_numeric() || *c == '.')
                .collect::<String>()
                .parse::<f64>()
                .ok()
        })
        .flatten();
    
    // Extract description
    let description = document
        .select(&desc_selector)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();
    
    Some(Product {
        name,
        price,
        description,
        url: page_url.to_string(),
    })
}
```

## Handling Pagination

Most sites split content across multiple pages. Here's a pattern for handling pagination:

```rust
use reqwest::Client;

// Scrapes all pages by following pagination links
// Stops when no "next" link is found or max_pages is reached
async fn scrape_paginated(
    client: &Client,
    start_url: &str,
    max_pages: usize,
) -> Result<Vec<Product>, Box<dyn std::error::Error>> {
    let mut all_products = Vec::new();
    let mut current_url = start_url.to_string();
    let mut page_count = 0;
    
    loop {
        if page_count >= max_pages {
            println!("Reached max pages limit");
            break;
        }
        
        println!("Scraping page {}: {}", page_count + 1, current_url);
        
        let response = client.get(&current_url).send().await?;
        let html = response.text().await?;
        let document = Html::parse_document(&html);
        
        // Extract products from current page
        let product_selector = Selector::parse(".product-item").unwrap();
        for element in document.select(&product_selector) {
            let inner_html = element.html();
            if let Some(product) = parse_product_page(&inner_html, &current_url) {
                all_products.push(product);
            }
        }
        
        // Find the next page link
        let next_selector = Selector::parse("a.next-page, a[rel='next'], .pagination a:last-child")
            .unwrap();
        
        match document.select(&next_selector).next() {
            Some(next_link) => {
                if let Some(href) = next_link.value().attr("href") {
                    // Handle relative URLs
                    current_url = if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("{}{}", start_url.trim_end_matches('/'), href)
                    };
                } else {
                    break;
                }
            }
            None => break,
        }
        
        page_count += 1;
    }
    
    Ok(all_products)
}
```

## Rate Limiting

Being a good citizen means not hammering servers. Here's a simple rate limiter:

```rust
use std::time::{Duration, Instant};
use tokio::time::sleep;

// Simple rate limiter that ensures minimum delay between requests
struct RateLimiter {
    min_delay: Duration,
    last_request: Option<Instant>,
}

impl RateLimiter {
    fn new(requests_per_second: f64) -> Self {
        RateLimiter {
            min_delay: Duration::from_secs_f64(1.0 / requests_per_second),
            last_request: None,
        }
    }
    
    // Call this before each request - it will sleep if needed
    async fn wait(&mut self) {
        if let Some(last) = self.last_request {
            let elapsed = last.elapsed();
            if elapsed < self.min_delay {
                sleep(self.min_delay - elapsed).await;
            }
        }
        self.last_request = Some(Instant::now());
    }
}

// Usage example
async fn scrape_with_rate_limit(urls: Vec<String>) {
    let client = build_client().unwrap();
    // Limit to 2 requests per second
    let mut limiter = RateLimiter::new(2.0);
    
    for url in urls {
        limiter.wait().await;
        
        match client.get(&url).send().await {
            Ok(response) => {
                println!("Got {} - Status: {}", url, response.status());
            }
            Err(e) => {
                eprintln!("Failed {}: {}", url, e);
            }
        }
    }
}
```

## Proper Error Handling

Real scrapers need to handle failures gracefully. Here's a pattern using custom error types:

```rust
use thiserror::Error;

// Custom error type that covers all the ways scraping can fail
#[derive(Error, Debug)]
enum ScraperError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    
    #[error("Failed to parse HTML: {0}")]
    ParseError(String),
    
    #[error("Element not found: {0}")]
    ElementNotFound(String),
    
    #[error("Rate limited - got status {0}")]
    RateLimited(u16),
    
    #[error("Page not found")]
    NotFound,
}

// Fetch with retry logic for transient failures
async fn fetch_with_retry(
    client: &Client,
    url: &str,
    max_retries: u32,
) -> Result<String, ScraperError> {
    let mut attempts = 0;
    
    loop {
        attempts += 1;
        
        match client.get(url).send().await {
            Ok(response) => {
                let status = response.status();
                
                // Handle different status codes
                if status.is_success() {
                    return Ok(response.text().await?);
                } else if status.as_u16() == 429 {
                    // Rate limited - wait and retry
                    if attempts < max_retries {
                        let wait_time = Duration::from_secs(2_u64.pow(attempts));
                        println!("Rate limited, waiting {:?}", wait_time);
                        sleep(wait_time).await;
                        continue;
                    }
                    return Err(ScraperError::RateLimited(429));
                } else if status.as_u16() == 404 {
                    return Err(ScraperError::NotFound);
                }
            }
            Err(e) if attempts < max_retries => {
                println!("Request failed (attempt {}): {}", attempts, e);
                sleep(Duration::from_secs(1)).await;
                continue;
            }
            Err(e) => return Err(ScraperError::HttpError(e)),
        }
    }
}
```

## Concurrent Scraping with Async

When you have many URLs to scrape, you can process them concurrently. But don't go overboard - too many parallel requests will get you blocked:

```rust
use futures::stream::{self, StreamExt};

// Scrape multiple URLs concurrently with a limit on parallelism
async fn scrape_concurrent(
    client: &Client,
    urls: Vec<String>,
    concurrency: usize,
) -> Vec<Result<String, ScraperError>> {
    stream::iter(urls)
        .map(|url| {
            let client = client.clone();
            async move {
                fetch_with_retry(&client, &url, 3).await
            }
        })
        // Process up to `concurrency` requests at a time
        .buffer_unordered(concurrency)
        .collect()
        .await
}
```

A concurrency of 5-10 is usually safe. More than that and you risk getting your IP blocked or overwhelming the target server.

## Putting It All Together

Here's a complete example that ties everything together:

```rust
use reqwest::Client;
use scraper::{Html, Selector};
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Build our HTTP client
    let client = build_client()?;
    
    // Create rate limiter - 1 request per second
    let mut limiter = RateLimiter::new(1.0);
    
    // URLs to scrape
    let urls = vec![
        "https://example.com/page1",
        "https://example.com/page2",
        "https://example.com/page3",
    ];
    
    let mut results = Vec::new();
    
    for url in urls {
        // Respect rate limits
        limiter.wait().await;
        
        // Fetch with retry
        match fetch_with_retry(&client, url, 3).await {
            Ok(html) => {
                // Parse and extract data
                if let Some(product) = parse_product_page(&html, url) {
                    println!("Found: {} - ${:?}", product.name, product.price);
                    results.push(product);
                }
            }
            Err(e) => {
                eprintln!("Failed to scrape {}: {}", url, e);
            }
        }
    }
    
    // Save results to JSON
    let json = serde_json::to_string_pretty(&results)?;
    std::fs::write("products.json", json)?;
    
    println!("Scraped {} products", results.len());
    Ok(())
}
```

## Performance Tips

After building dozens of scrapers, here are the things that actually matter for performance:

**Connection pooling** - Reuse your Client across requests. Creating a new Client for each request means establishing a new TCP connection every time, which is slow.

**Async is not always faster** - For scraping a few hundred pages, the overhead of async might not be worth it. Async shines when you have thousands of requests or when you're waiting on many slow responses.

**DNS caching** - If you're hitting the same domain repeatedly, DNS lookups can add up. The reqwest client handles this, but it's worth knowing.

**Avoid over-parsing** - If you only need one piece of data from a page, don't parse the entire DOM. Sometimes a regex is faster than building a full HTML document tree.

**Stream large responses** - If you're downloading large files, use response.bytes_stream() instead of response.text() to avoid loading everything into memory.

## What to Watch Out For

Some sites actively try to prevent scraping. Common defenses include:

- JavaScript-rendered content (you'll need a headless browser for these)
- CAPTCHAs after too many requests
- IP blocking based on request patterns
- Cookie-based session tracking
- Honeypot links that trigger bans

Always check a site's robots.txt and terms of service before scraping. Be respectful of server resources - your scraper shouldn't cause problems for other users of the site.

Rust gives you the tools to build fast, reliable scrapers. The combination of zero-cost abstractions, excellent async support, and strong type safety means fewer bugs and better performance. Start with the basics, add complexity only when needed, and always handle errors gracefully.

---

*Monitor your web scrapers with [OneUptime](https://oneuptime.com) - track success rates, response times, and data freshness.*
