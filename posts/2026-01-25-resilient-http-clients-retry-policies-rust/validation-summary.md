# Validation Summary: How to Build Resilient HTTP Clients with Retry Policies in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- reqwest
- tokio
- rand
- thiserror
- HTTP retry policies
- Exponential backoff and jitter
- Circuit breakers
- Retry-After HTTP header

## Sources Consulted
- reqwest 0.13.4 documentation: https://docs.rs/reqwest/latest/reqwest/
- reqwest Error methods: https://docs.rs/reqwest/latest/reqwest/struct.Error.html
- reqwest ClientBuilder timeout API: https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html
- reqwest Response::error_for_status API: https://docs.rs/reqwest/latest/reqwest/struct.Response.html
- rand 0.10.1 RngExt documentation: https://docs.rs/rand/latest/rand/trait.RngExt.html
- thiserror 2.0 documentation: https://docs.rs/thiserror/latest/thiserror/
- Tokio documentation: https://docs.rs/tokio/latest/tokio/
- RFC 9110 Retry-After definition: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
- crates.io package metadata via `cargo search` and `cargo info`

## Issues Found
- The dependency versions were outdated for a current post. Updated `reqwest` from 0.11 to 0.13, `rand` from 0.8 to 0.10, and `thiserror` from 1.0 to 2.0. Added `httpdate` 1.0 for standards-compliant `Retry-After` parsing.
- The basic retry example could panic when all attempts received HTTP error responses, because `last_error` was only set for transport errors. Changed the example to use `Response::error_for_status()` so HTTP error statuses become `reqwest::Error` values and are tracked correctly.
- The rand API changed in current versions. Replaced `rand::thread_rng()` / `Rng::gen_range()` with `rand::rng()` / `RngExt::random_range()` and imported `rand::RngExt`.
- The reusable client treated `reqwest::Error::is_request()` as retryable. Request-construction errors are not generally transient network failures, so the retry predicate now retries timeout and connection errors only.
- The `Retry-After` handling only supported numeric delay-seconds, while RFC 9110 also allows HTTP-date values. Added parsing for both delay-seconds and HTTP-date values, with the configured maximum delay still applied.
- The reusable client snippet used `sleep()` but did not import it in that snippet. Added `use tokio::time::sleep;`.
- The circuit breaker elapsed-time calculation used direct unsigned subtraction, which can underflow if the stored timestamp is later than the current timestamp. Replaced it with `saturating_sub`.
- The circuit breaker text and log message claimed a single test request in half-open state, but the implementation can still use the retrying client. Adjusted the wording to say it tests with a request rather than a single network attempt.
- The post description claimed the example used custom middleware, but the implementation uses client wrapper structs. Updated the description to say "custom client wrappers."

## Review Notes
- I compiled a combined version of the tutorial code in a temporary Cargo project with `reqwest` 0.13.4, `tokio` 1.52.3, `rand` 0.10.1, `thiserror` 2.0.18, and `httpdate` 1.0.3. `cargo check` completed successfully.
- The circuit breaker remains a simplified tutorial implementation. A production circuit breaker would usually track half-open concurrency more explicitly and use richer observability.
