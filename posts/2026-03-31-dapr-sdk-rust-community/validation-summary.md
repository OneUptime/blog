# Validation Summary: How to Use Dapr SDK for Rust (Community SDK)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Rust programming language
- Dapr Rust SDK (`dapr` crate, community-maintained)
- Tonic (gRPC framework for Rust)
- Tokio (async runtime)
- Redis (state store and pub/sub component)
- Kubernetes (deployment example)
- gRPC / Protocol Buffers (prost)

## Sources Consulted
- Dapr Rust SDK docs.rs API documentation: https://docs.rs/dapr/latest/dapr/client/struct.Client.html
- Dapr Rust SDK on crates.io: https://crates.io/crates/dapr
- Dapr Rust SDK GitHub repository: https://github.com/dapr/rust-sdk
- Dapr official documentation for Rust SDK: https://docs.dapr.io/developing-applications/sdks/rust/rust-client/

## Issues Found

1. **Incorrect crate name in overview**: The post referred to the crate as `dapr-client` in the Overview section and architecture diagram. The actual crate name on crates.io is `dapr`. Fixed both references.

2. **Outdated crate version**: The post specified `dapr = "0.15"` which is outdated. Updated to `dapr = "0.17"` (the latest stable release). Also updated compatible dependency versions: `tonic` from `"0.11"` to `"0.12"`, and changed `prost = "0.12"` to `prost-types = "0.13"` (since the code uses `prost_types::Any`, not the `prost` crate directly).

3. **Wrong `save_state` API usage**: The post used `client.save_state(vec![("statestore", "order-1", data.clone())])` passing a vector of tuples. The actual API signature is `save_state(store_name, key, value, etag, metadata, options)` with individual parameters. Fixed to `client.save_state("statestore", "order-1", data.clone(), None, None, None)`.

4. **Missing `data_content_type` parameter in `publish_event`**: The post called `client.publish_event("pubsub", "orders", data, Some(metadata))` but the API requires a `data_content_type` parameter between `topic` and `data`. Fixed to `client.publish_event("pubsub", "orders", "application/json", data, Some(metadata))`.

5. **Wrong third parameter in `invoke_service`**: The post passed `Some(dapr::appcallback::InvokeRequest { ... })` as the third argument. The actual API expects `Option<prost_types::Any>`, not an `InvokeRequest`. Fixed to pass `Some(prost_types::Any { ... })` directly.

6. **Extra parameter in `get_secret`**: The post called `client.get_secret("secretstore", "db-password", None)` with three arguments, but the API only accepts two parameters: `store_name` and `key`. Removed the extra `None` parameter.

7. **Missing `TonicClient` type parameter on `Client::connect`**: The `Client` struct is generic over the transport type. The official docs show `Client::<TonicClient>::connect(addr)`. Added `use dapr::client::TonicClient;` import and updated all `Client::connect` calls to `Client::<TonicClient>::connect`.

## Review Notes
- The `--components-path` flag used in the `dapr run` command was deprecated in Dapr CLI 1.11+ in favor of `--resources-path`. Both still work, but users on newer Dapr versions should prefer `--resources-path`.
- The AppCallback gRPC server implementation section uses direct tonic trait implementation. Newer SDK versions provide helper types (`AppCallbackService`, `Handler`) that may simplify this pattern, but the trait-based approach remains valid.
- The Kubernetes deployment YAML and Dapr component files are correct and follow current conventions.
