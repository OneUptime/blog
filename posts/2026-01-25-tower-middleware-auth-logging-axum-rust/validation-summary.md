# Validation Summary: How to Build Tower Middleware for Auth and Logging in Axum

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Axum
- Tower
- Tower HTTP
- Tokio
- tracing
- pin-project-lite
- curl

## Sources Consulted
- Axum crate documentation: https://docs.rs/axum/latest/axum/
- Axum middleware documentation: https://docs.rs/axum/latest/axum/middleware/
- Axum `from_fn` documentation: https://docs.rs/axum/latest/axum/middleware/fn.from_fn.html
- Axum `Router::layer` documentation: https://docs.rs/axum/latest/axum/struct.Router.html
- Axum `serve` documentation: https://docs.rs/axum/latest/axum/fn.serve.html
- Tower `Service` documentation: https://docs.rs/tower/latest/tower/trait.Service.html
- Tower `ServiceBuilder` documentation: https://docs.rs/tower/latest/tower/struct.ServiceBuilder.html
- pin-project-lite macro documentation: https://docs.rs/pin-project-lite/latest/pin_project_lite/macro.pin_project.html
- Cargo build verification with `cargo check` against `axum 0.7`/`tower 0.4` and current `axum 0.8`/`tower 0.5`.

## Issues Found
- The dependency snippet used older major versions (`axum 0.7`, `tower 0.4`, `tower-http 0.5`). The example code works on the current compatible major versions, so the snippet was updated to `axum 0.8`, `tower 0.5`, and `tower-http 0.6`.
- The `AuthFuture::Authorized` enum variant was constructed like a tuple variant even though it is declared as a struct variant. Changed it to `AuthFuture::Authorized { future: self.inner.call(req) }` so the code compiles.
- The logging middleware snippet used the `pin_project!` macro without importing it. Added `use pin_project_lite::pin_project;`.
- The `ServiceBuilder` ordering explanation said layers are applied "from bottom to top." Tower's documentation states that layers added first are called with the request first. Reworded the sentence while preserving the described behavior.
- The `from_fn` example returned `impl IntoResponse` but did not import `IntoResponse`. Added the missing import.

## Review Notes
The complete middleware example was checked with `cargo check` after the code fixes. The post's custom middleware is technically valid, but for production logging the built-in `tower-http` tracing middleware remains the recommended starting point when custom request/response fields are not required.
