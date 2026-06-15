# Validation Summary: How to Implement Exponential Backoff with Jitter in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Tokio async runtime and timers
- rand random number generation
- reqwest HTTP client errors and responses
- HTTP `Retry-After` header
- Exponential backoff and jitter retry strategies

## Sources Consulted
- Rust `std::time::Duration` documentation: https://doc.rust-lang.org/std/time/struct.Duration.html
- Tokio `time` module and `sleep` documentation: https://docs.rs/tokio/latest/tokio/time/
- rand crate documentation and 0.9+ migration guide: https://docs.rs/rand/latest/rand/ and https://rust-random.github.io/book/update-0.9.html
- reqwest `Error` and `Response::error_for_status` documentation: https://docs.rs/reqwest/latest/reqwest/struct.Error.html and https://docs.rs/reqwest/latest/reqwest/struct.Response.html
- RFC 9110 section 10.2.3 for `Retry-After`: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
- AWS Architecture Blog, "Exponential Backoff And Jitter": https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/

## Issues Found
- The rand examples used `rand::thread_rng()` and `Rng::gen_range`, which are deprecated in current rand versions. Updated the examples to use `rand::rng()`, `random_range`, and `rand::prelude::*`.
- `RetryConfig` derived `Clone`, but `JitterStrategy` did not implement `Clone`. Added `#[derive(Clone, Copy)]` to `JitterStrategy`.
- The "decorrelated jitter" examples did not track the previous delay, even though decorrelated jitter is based on the previous sleep duration. Updated the helper and retry loops to pass and update `previous_delay`.
- The jitter code could panic on empty random ranges when the calculated cap was zero or when the maximum delay was lower than the base delay. Added guards and inclusive ranges to keep delay calculation valid.
- `RetryConfig::execute` could panic when configured with `max_attempts(0)`. Updated the builder setter to enforce at least one attempt.
- The rate-limit example used a raw numeric `429` and a raw `"retry-after"` header string. Updated it to use `StatusCode::TOO_MANY_REQUESTS` and `reqwest::header::RETRY_AFTER`.

## Review Notes
- The combined corrected snippets were compiled and tested in a temporary Cargo project with `cargo test` using current compatible crate versions (`rand` 0.10.1, `reqwest` 0.12.28, `tokio` 1.52.3, and `httpdate` 1.0.3). The included retry tests passed.
- The reqwest retryability example correctly checks status codes on `reqwest::Error`, but callers need to use `Response::error_for_status` when they want HTTP 4xx/5xx responses converted into retryable errors.
