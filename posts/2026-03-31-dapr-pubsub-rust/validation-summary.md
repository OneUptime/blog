# Validation Summary: How to Use Dapr Pub/Sub with Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Rust
- Dapr Rust SDK (`dapr` crate)
- actix-web 4
- Dapr Pub/Sub building block
- CloudEvents
- Dapr CLI

## Sources Consulted
- Dapr Rust SDK GitHub repository: https://github.com/dapr/rust-sdk
- Dapr Rust SDK on crates.io: https://crates.io/crates/dapr
- Dapr Pub/Sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr Pub/Sub API reference (subscription response format, status codes): https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub message TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-message-ttl/
- Dapr raw payload documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-raw-payload/
- Dapr Rust SDK publisher example: https://github.com/dapr/rust-sdk/blob/master/examples/src/pubsub/publisher.rs

## Issues Found

1. **Outdated crate version**: The post specified `dapr = "0.13"` which, while it exists on crates.io, is severely outdated. The latest stable version is 0.17.0 (published 2025-09-23). The API examples in the post (e.g., `publish_event` with 5 parameters, `Client::<dapr::client::TonicClient>::connect`) match the modern SDK, not the 0.13 API. **Fixed**: Updated to `dapr = "0.17"`.

2. **Unused import**: The subscriber code imported `middleware` from actix-web (`use actix_web::{web, App, HttpServer, HttpResponse, middleware}`) but never used it. This would produce a compiler warning. **Fixed**: Removed the unused `middleware` import.

3. **Incorrect type name in Summary**: The Summary section referenced `DaprClient::publish_event`, but the Rust SDK uses `Client` as the type name (accessed as `dapr::Client`). **Fixed**: Changed to `Client::publish_event`.

## Review Notes
- The `Client::connect()` method reads the gRPC port from the `DAPR_GRPC_PORT` environment variable automatically (it does not accept a port in the address string). This works correctly when using `dapr run` because the CLI sets this env var. The blog doesn't explain this nuance, but since the official examples use the same pattern, this is acceptable.
- The subscription response format uses the legacy `route` field rather than the modern `routes: { default: "/orders" }` format. Both are supported by Dapr for backward compatibility, so this is not incorrect, but readers building new applications may want to use the newer format.
- The dead letter handling section correctly describes that HTTP 404 causes message drop and 5xx causes retry, matching the Dapr API specification.
- The metadata keys `ttlInSeconds` and `rawPayload` are both valid Dapr pub/sub metadata keys, confirmed against official documentation.
- All Dapr CLI flags (`--app-id`, `--app-port`, `--dapr-grpc-port`) are correct and current.
