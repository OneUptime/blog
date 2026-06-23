# Validation Summary: How to Build Production-Ready REST APIs in Rust with Axum

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Axum
- Tokio
- Tower
- tower-http
- Serde
- validator
- thiserror / anyhow
- tracing / tracing-subscriber
- JWT authentication with jsonwebtoken and axum-extra
- Docker
- Kubernetes health probes

## Sources Consulted
- Axum crate documentation: https://docs.rs/axum/latest/axum/
- Axum 0.8 announcement and migration notes: https://tokio.rs/blog/2025-01-01-announcing-axum-0-8-0
- Axum repository MSRV note: https://github.com/tokio-rs/axum
- Axum `FromRequest` documentation: https://docs.rs/axum/latest/axum/extract/trait.FromRequest.html
- Axum `RequestPartsExt` documentation: https://docs.rs/axum/latest/axum/trait.RequestPartsExt.html
- tower-http request ID documentation: https://docs.rs/tower-http/latest/tower_http/request_id/
- tower-http timeout documentation: https://docs.rs/tower-http/latest/tower_http/timeout/struct.TimeoutLayer.html
- axum-extra `TypedHeader` documentation: https://docs.rs/axum-extra/latest/axum_extra/struct.TypedHeader.html
- Official Axum JWT example: https://github.com/tokio-rs/axum/blob/main/examples/jwt/src/main.rs

## Issues Found
- The post used Axum 0.7-era dependency versions in a 2026 tutorial. Updated the dependency set to Axum 0.8, Tower 0.5, tower-http 0.6, validator 0.20, and thiserror 2.
- The JWT authentication example used `axum_extra` and `jsonwebtoken` without declaring them in `Cargo.toml`. Added `axum-extra` with the `typed-header` feature and `jsonwebtoken`.
- The test snippet used `tower::ServiceExt`, which requires Tower's `util` feature. Added `util` to the Tower dependency features.
- The route path parameter example used Axum 0.7 syntax (`/api/users/:id`). Updated it to Axum 0.8 syntax (`/api/users/{id}`), matching the official migration notes.
- The custom validated JSON extractor used `async_trait`, referenced an undefined `S` type parameter, and returned `Result` without qualifying the local error alias. Updated it to Axum 0.8's native async trait method signature and used `std::result::Result`.
- The JWT extractor used `async_trait` and an unqualified `Result` return type. Updated it to Axum 0.8's native async `FromRequestParts` implementation and used `std::result::Result`.
- The rate limiting middleware used the old generic `Next<Bd>` form. Updated it to Axum 0.8's non-generic `Next` and an explicit `Request<axum::body::Body>`.
- The readiness probe example returned `Err(&str)`, which would not communicate an HTTP 503 readiness failure. Updated it to return `(StatusCode::SERVICE_UNAVAILABLE, "...")`.
- The main router used deprecated `tower_http::timeout::TimeoutLayer::new`. Updated it to `TimeoutLayer::with_status_code(StatusCode::REQUEST_TIMEOUT, ...)`.
- The Dockerfile used `rust:1.75-slim`, which is below current Axum's documented MSRV of Rust 1.80. Updated it to `rust:1.80-slim`.

## Review Notes
- I verified the riskiest corrected snippets in a temporary Cargo project with `cargo check`: the updated router middleware stack, Axum 0.8 route syntax, custom JSON extractor, JWT extractor, and rate-limit middleware all compile. The temporary compile produced only dead-code warnings from isolated snippets.
- The integration test section still uses a placeholder `build_test_app()` with `todo!()`. That is acceptable as a scaffold, but a future improvement would be to expose the router builder from a library module so integration tests can construct the real app.
