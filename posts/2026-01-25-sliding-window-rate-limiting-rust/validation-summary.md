# Validation Summary: How to Implement Sliding Window Rate Limiting in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Sliding window rate limiting
- Rust standard library concurrency primitives (`Arc`, `RwLock`)
- Actix Web middleware
- Axum middleware
- Tower `Service` and `Layer`
- Tokio background tasks

## Sources Consulted
- Rust standard library `Instant` documentation: https://doc.rust-lang.org/std/time/struct.Instant.html
- Actix Web `Transform` documentation: https://docs.rs/actix-web/latest/actix_web/dev/trait.Transform.html
- Actix Web `ServiceResponse` documentation: https://docs.rs/actix-web/latest/actix_web/dev/struct.ServiceResponse.html
- Actix Web `EitherBody` documentation: https://docs.rs/actix-web/latest/actix_web/body/enum.EitherBody.html
- Tower `Service` documentation: https://docs.rs/tower/latest/tower/trait.Service.html
- Axum documentation: https://docs.rs/axum/latest/axum/
- Tokio `time::interval` documentation: https://docs.rs/tokio/latest/tokio/time/fn.interval.html

## Issues Found
- The Actix Web middleware returned `ServiceResponse<Bd>` from its trait implementation but returned a boxed-body response on the rate-limited path. This does not compile because the success and rejection paths have different body types. Updated the middleware to use `ServiceResponse<EitherBody<Bd>>`, map rejected responses with `map_into_right_body()`, and map successful responses with `map_into_left_body()`.
- The Axum/Tower middleware cloned `self.inner` and called the clone inside the boxed future. Tower's `Service` documentation warns that this pattern can call a service clone that has not been made ready. Updated the code to use `std::mem::replace` so the ready service instance is moved into the future.
- The threaded limiter comment said separate locks per key would be better, even though the code already uses separate per-key locks. Updated the comment and nearby explanation to clarify that different keys avoid blocking after the map lookup.
- The `test_sliding_behavior` test expected 7-8 remaining requests after waiting half a window, but the implementation has not rotated windows at that point, so the five requests are still in the current window and about five requests remain. Updated the comment and assertion to match the actual algorithm behavior.

## Review Notes
- Verified representative corrected snippets locally with `cargo check` using Rust 1.93.0, `actix-web 4.13.0`, `axum 0.8.9`, and `tower 0.5.3`.
- The limiter is suitable as an in-memory single-process example. The post correctly notes that distributed deployments need a shared store such as Redis.
