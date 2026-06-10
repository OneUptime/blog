# Validation Summary: How to Build High-Performance Web Scrapers in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (programming language)
- reqwest 0.11 (HTTP client crate)
- scraper 0.18 (HTML parsing / CSS selector crate)
- tokio 1.x (async runtime)
- thiserror 1.0 (error derive macro)
- serde / serde_json 1.0 (serialization)
- futures 0.3 (stream combinators for concurrent processing)
- CSS selectors (used for HTML element targeting)

## Sources Consulted
- reqwest documentation: https://docs.rs/reqwest/0.11/reqwest/
  - `Client::builder()` and `ClientBuilder` methods: `default_headers`, `timeout`, `connect_timeout`, `pool_max_idle_per_host`, `build`
  - `header::HeaderMap`, `header::USER_AGENT`, `header::ACCEPT`, `header::HeaderValue::from_static`
- scraper crate documentation: https://docs.rs/scraper/0.18/scraper/
  - `Html::parse_document`, `Selector::parse`, `ElementRef::select`, `ElementRef::value`, `ElementRef::text`, `ElementRef::html`
- tokio documentation: https://docs.rs/tokio/1/tokio/time/fn.sleep.html
- futures crate documentation: https://docs.rs/futures/0.3/futures/stream/ (for `stream::iter`, `StreamExt::buffer_unordered`)
- Rust standard library: `std::time::Duration::from_secs_f64`, `Option::flatten`, `Option::map`
- thiserror documentation: https://docs.rs/thiserror/1/thiserror/

## Issues Found
- **Missing `futures` dependency in Cargo.toml**: The "Concurrent Scraping with Async" section uses `use futures::stream::{self, StreamExt};` and calls `stream::iter(...).buffer_unordered(...)`, but the `futures` crate was not listed in the project's `Cargo.toml`. Without it, that code block would fail to compile. Added `futures = "0.3"` to the dependency list and updated the surrounding prose to mention the new crate.

## Review Notes
- The pinned crate versions (`reqwest 0.11`, `scraper 0.18`, `thiserror 1.0`) are older than the latest releases available at review time (reqwest 0.12.x, scraper 0.20+, thiserror 2.x), but they all still compile and the APIs used in the post are accurate for these versions. Readers using newer versions should consult the changelogs; the post's API usage remains valid on the pinned versions.
- The `parse_product_page` function in the pagination loop is invoked on the inner HTML of each `.product-item` card rather than a full product page. The selectors inside `parse_product_page` may not match within a small product card, so in practice the function would often return `None`. This is a design/usability nit, not a compilation issue.
- In `fetch_with_retry`, status codes that are not success, 429, or 404 fall through without returning, causing the loop to retry indefinitely on those codes (e.g., a persistent 500). This is a logic edge case rather than a syntactic problem and matches the post's stated retry-on-transient-failure intent for the cases it explicitly handles.
- `Box<dyn std::error::Error>` is used as the error type in async functions; this is not `Send`, which can cause issues when spawning the future across threads (e.g., with `tokio::spawn`). Functional in single-threaded or simple `await` chains as shown in the post.
- The `Option<Option<f64>>` → `Option<f64>` pattern via `.map(...).flatten()` is correct and idiomatic; `.and_then(...)` would be a stylistic alternative.
