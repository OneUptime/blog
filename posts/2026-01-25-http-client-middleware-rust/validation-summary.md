# Validation Summary: How to Build an HTTP Client with Middleware in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Cargo
- reqwest 0.12
- Tokio 1.x
- Tower 0.5
- tower-http 0.6
- http 1.x
- tracing and tracing-subscriber

## Sources Consulted
- Tower 0.5 `Service` trait documentation: https://docs.rs/tower/latest/tower/trait.Service.html
- Tower 0.5 retry `Policy` documentation: https://docs.rs/tower/latest/tower/retry/trait.Policy.html
- Tower 0.5 retry source documentation for policy cloning per request session: https://docs.rs/tower/latest/src/tower/retry/mod.rs.html
- Tower 0.5 timeout documentation and `BoxError` error type: https://docs.rs/tower/latest/tower/timeout/struct.Timeout.html
- Tower 0.5 `TimeoutLayer` documentation: https://docs.rs/tower/latest/tower/timeout/struct.TimeoutLayer.html
- reqwest 0.12 `Client` documentation: https://docs.rs/reqwest/latest/reqwest/struct.Client.html
- reqwest 0.12 `ClientBuilder` documentation: https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html
- Local `cargo new --help` output for Cargo project creation command syntax.

## Issues Found
- `reqwest::Client` was presented as if it could be passed directly into a Tower middleware stack. `reqwest::Client` does not implement Tower's `Service` trait, so I added a small `ReqwestService` adapter that implements `Service<Request<Vec<u8>>>` and calls `Client::execute`.
- The retry stack used `Request<reqwest::Body>`, but Tower retry needs to clone requests and `reqwest::Body` is not a suitable cloneable request body for this example. I changed the request body type in the stack to `Vec<u8>` and converted it to a `reqwest::Request` in the adapter.
- The timeout layer was typed as if it preserved `Svc::Error`. Tower's `TimeoutLayer` changes the service error type to `tower::BoxError`, so I corrected the return type and bounds.
- The custom middleware cloned the inner service and called the clone after `poll_ready` had been called on the original service. Tower's `Service` documentation warns against this pattern, so I changed both middleware examples to use `std::mem::replace` and call the service instance that was ready.
- The final example built a client and request but never built or called the middleware stack. I updated it to create `ReqwestService`, compose the middleware, call `ready()`, execute the request, and log the response status.
- The retry policy used `max_attempts` naming for a value that actually represented retries after the initial attempt. I renamed it to `max_retries` and updated the logged fields.
- The layer-order explanation and comments were adjusted so retry wraps logging/auth and logging records each retry attempt.

## Review Notes
The corrected example was type-checked in a scratch Cargo project using the dependency versions from the post. The adapter buffers the response body into bytes before rebuilding an `http::Response<reqwest::Body>`; that is simple and correct for the tutorial, though a production client might prefer streaming response bodies.
