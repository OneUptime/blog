# Validation Summary: How to Use Dapr Service Invocation with Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Rust (programming language)
- Dapr Rust SDK (`dapr` crate v0.13)
- Dapr Service Invocation building block
- gRPC (via Tonic)
- Protocol Buffers (prost / prost-types)
- Actix-web (HTTP server framework)
- Dapr CLI

## Sources Consulted
- Dapr Rust SDK docs.rs documentation: https://docs.rs/dapr/0.13.0/dapr/
- Dapr Rust SDK Client struct API: https://docs.rs/dapr/0.13.0/dapr/client/struct.Client.html
- Dapr Rust SDK InvokeServiceResponse type alias: https://docs.rs/dapr/0.13.0/dapr/client/type.InvokeServiceResponse.html
- Dapr Rust SDK error module: https://docs.rs/dapr/0.13.0/dapr/error/index.html
- Dapr Rust SDK source on GitHub: https://github.com/dapr/rust-sdk/blob/master/dapr/src/client.rs
- Dapr Rust SDK Cargo.toml (v0.13.0 dependencies): https://docs.rs/crate/dapr/0.13.0/source/Cargo.toml
- crates.io dapr package: https://crates.io/crates/dapr

## Issues Found

1. **Incorrect prost version in Cargo.toml**: The post specified `prost = "0.12"` but `dapr = "0.13"` depends on `prost = "0.11"` and `tonic = "0.8"`. Using prost 0.12 would cause dependency resolution conflicts. Fixed to `prost = "0.11"`.

2. **Missing prost-types dependency**: The `invoke_service` method accepts `Option<prost_types::Any>` as its data parameter, but the Cargo.toml did not include `prost-types` as a dependency. Added `prost-types = "0.11"`.

3. **Wrong data parameter type in invoke_service calls**: The post passed `Some(serde_json::to_vec(&request_body)?)` (which is `Option<Vec<u8>>`) to `invoke_service`, but the method signature requires `Option<prost_types::Any>`. The `Any` type is a protobuf wrapper with `type_url: String` and `value: Vec<u8>` fields. Fixed both the "Basic Service Invocation" and "Invoking with Structured Response" code blocks to construct `Any { type_url: String::new(), value: serde_json::to_vec(...)? }`.

4. **Connect URL missing gRPC port**: The post used `"https://127.0.0.1"` which would default to port 443 (HTTPS default), but the Dapr sidecar gRPC endpoint runs on port 50001 by default (matching the `--dapr-grpc-port 50001` flag in the post's own `dapr run` command). Fixed to `"https://127.0.0.1:50001"`.

5. **Non-existent `dapr::error::Status` type**: The error handling section imported `use dapr::error::Status;` but this type does not exist in the Dapr Rust SDK. The `dapr::error` module contains only `Error` (enum) and `GrpcError` (struct). Removed the incorrect import since the code snippet did not actually use it.

## Review Notes
- The `dapr` crate v0.13 is functional but outdated; the latest version is 0.17+. The SDK remains in alpha status with potential breaking API changes between versions. A future update of this post to a newer SDK version may be warranted.
- The response data access patterns (`response.data` as `Option<Any>`, accessing `.value` for the raw bytes) are correct for the protobuf `Any` type used in the Dapr gRPC protocol.
- The Actix-web service implementation and `dapr run` / `dapr invoke` CLI commands are correct.
- The `dapr invoke` CLI flags (`--app-id`, `--method`, `--verb`, `--data`) are all valid and correctly used.
