# Validation Summary: How to Build a High-Performance Web Crawler with Async Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Tokio
- reqwest
- scraper
- governor
- DashMap / DashSet
- async-channel
- URL parsing with the url crate

## Sources Consulted
- Tokio `mpsc` documentation: https://docs.rs/tokio/latest/tokio/sync/mpsc/
- Tokio `spawn` documentation: https://docs.rs/tokio/latest/tokio/task/fn.spawn.html
- async-channel documentation: https://docs.rs/async-channel/
- reqwest documentation: https://docs.rs/reqwest/
- reqwest `ClientBuilder` documentation: https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html
- scraper documentation: https://docs.rs/scraper/
- scraper `Html::parse_document` documentation: https://docs.rs/scraper/latest/scraper/html/struct.Html.html
- governor documentation: https://docs.rs/governor/
- governor 0.6 documentation: https://docs.rs/governor/0.6.0/governor/
- DashSet documentation: https://docs.rs/dashmap/latest/dashmap/struct.DashSet.html
- url `Url::join` documentation: https://docs.rs/url/latest/url/struct.Url.html

## Issues Found
- The dependency list included `futures` but the corrected worker-pool code needs `async-channel`; changed the dependency to `async-channel = "2"`.
- The post described Governor as a token-bucket limiter, but Governor documents its algorithm as GCRA; updated the wording and code comment accordingly.
- The first orchestration code block was intentionally incomplete and would not compile: it moved Tokio's single `mpsc::Receiver`, dropped the sender, and then tried to clone it afterward. Replaced it with one working worker-pool example.
- The later orchestration example referenced `async_channel::bounded` without declaring the dependency and called an undefined `crawl_page_v2`. Updated the code to use the defined `crawl_page` function.
- Tokio `mpsc` supports multiple senders but only one receiver, so it was not suitable for cloned worker receivers. Updated the example to use `async-channel`, whose receivers are cloneable.
- Awaiting `send()` while iterating `scraper` elements made the spawned future non-`Send`, which violates `tokio::spawn`'s `Future + Send + 'static` bound. Updated the parser loop to collect discovered URLs first, then await channel sends after parser references are out of scope.
- Added in-flight URL accounting to close the shared channel only after no queued or active URLs remain.

## Review Notes
The corrected combined crawler sample was checked with `cargo check` in a temporary Cargo project using the dependency versions shown in the post. The post still uses older but valid crate versions for `scraper` and `governor`; future maintenance could update those versions and retest the examples.
