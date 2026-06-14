# Validation Summary: How to Build Webhook Handlers with Signature Verification in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Axum
- Tokio
- HMAC-SHA256
- GitHub webhooks
- Stripe webhooks
- Serde and serde_json

## Sources Consulted
- Axum extractor documentation: https://docs.rs/axum/0.8.9/axum/extract/
- Axum `DefaultBodyLimit` documentation: https://docs.rs/axum/0.8.9/axum/extract/struct.DefaultBodyLimit.html
- HMAC crate documentation: https://docs.rs/hmac/0.12.1/hmac/
- HMAC `Mac::verify_slice` documentation: https://docs.rs/hmac/0.12.1/hmac/trait.Mac.html
- Tower `ServiceExt` documentation: https://docs.rs/tower/0.5.3/tower/trait.ServiceExt.html
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Stripe webhook signature documentation: https://docs.stripe.com/webhooks/signature
- Stripe webhook endpoint and replay protection documentation: https://docs.stripe.com/webhooks

## Issues Found
- The dependency snippet used `axum = "0.7"`. I updated it to `axum = "0.8"` so the tutorial targets the current Axum release family documented on docs.rs.
- The dependency snippet omitted crates used by later examples. I added `tracing = "0.1"` for the error-handling snippet and `tower = { version = "0.5", features = ["util"] }` under `dev-dependencies` for the `ServiceExt::oneshot` tests.
- The Stripe example converted the raw body with `String::from_utf8_lossy` before verification. That can change the exact bytes being signed, so I changed it to build Stripe's signed payload from the timestamp, a literal dot byte, and the original request body bytes.
- The Stripe signature parser kept only one `v1` signature. Stripe's header can contain multiple signatures, so I changed the parser to collect all `v1` signatures and accept the request if any one verifies.

## Review Notes
- The GitHub HMAC-SHA256 flow, `X-Hub-Signature-256` handling, raw-body-before-JSON guidance, and use of `Mac::verify_slice` for constant-time verification are technically correct.
- Axum's `Bytes` extractor has a documented default 2 MB body limit. The post's recommendation to set an explicit production limit remains valid, but a future update could show the exact `DefaultBodyLimit::max(...)` layer configuration.
