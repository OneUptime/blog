# Validation Summary: How to Test Rust Applications with Integration Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Cargo integration tests
- Tokio async tests
- SQLx and PostgreSQL testing
- Testcontainers for Rust
- Axum HTTP API testing
- Wiremock
- serial_test
- fake-rs

## Sources Consulted
- The Rust Programming Language, "Test Organization": https://doc.rust-lang.org/book/ch11-03-test-organization.html
- The Cargo Book, `cargo test`: https://doc.rust-lang.org/cargo/commands/cargo-test.html
- Tokio `#[tokio::test]` macro docs: https://docs.rs/tokio-macros/latest/tokio_macros/attr.test.html
- Axum `body::to_bytes` docs: https://docs.rs/axum/latest/axum/body/fn.to_bytes.html
- Testcontainers for Rust docs: https://rust.testcontainers.org/
- Testcontainers Rust community modules docs: https://rust.testcontainers.org/quickstart/community_modules/
- `testcontainers-modules::postgres::Postgres` docs: https://docs.rs/testcontainers-modules/latest/testcontainers_modules/postgres/struct.Postgres.html
- Wiremock Rust docs: https://docs.rs/wiremock/latest/wiremock/
- serial_test `#[serial]` docs: https://docs.rs/serial_test/latest/serial_test/attr.serial.html
- fake-rs installation docs: https://cksac.github.io/fake-rs/
- Local Cargo help output from Cargo 1.93.0 for `cargo test` target-selection flags.

## Issues Found
- The dependency snippet omitted crates used later in the examples (`chrono`, `axum`, `tower`, `futures`, and `tracing-subscriber`). Added them so the later snippets have matching dependencies.
- Several dependency versions were outdated for a 2026 guide. Updated SQLx, thiserror, wiremock, and fake-rs versions to current major versions reflected in their documentation.
- The Testcontainers example used the old `testcontainers` core-crate API (`clients::Cli`, `images::postgres::Postgres`, and `Container<'static, Postgres>`). Replaced it with the current `testcontainers-modules` Postgres module and `AsyncRunner` / `ContainerAsync` API.
- The shared logging setup used `tracing_subscriber::fmt().init()`, which can panic if another test has already set a global subscriber. Changed it to `try_init()` and ignored the already-initialized error.
- The Wiremock timeout test was named and commented as a retry-on-timeout test, but the configured mock response completed before the timeout and only expected one request. Renamed and reworded it to describe the behavior actually tested.
- One comment implied each Rust test has complete isolation. Reworded it to say each `#[test]` is discovered and run as a separate test case, because process-global state can still be shared between tests.

## Review Notes
The examples are written against a fictional `myapp` crate, so the snippets cannot be compiled end-to-end without the surrounding application code. API-level checks were performed against official documentation and local Cargo behavior where applicable.
