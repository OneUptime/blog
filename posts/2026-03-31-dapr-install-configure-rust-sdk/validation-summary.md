# Validation Summary: How to Install and Configure the Dapr Rust SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Rust programming language
- Dapr Rust SDK (`dapr` crate)
- gRPC via `tonic`
- Tokio async runtime
- Redis (as state store component)

## Sources Consulted
- Dapr Rust SDK GitHub repository: https://github.com/dapr/rust-sdk
- Dapr Rust SDK on crates.io: https://crates.io/crates/dapr
- Dapr Rust SDK API documentation: https://docs.rs/dapr
- Dapr Rust SDK source code (`client.rs`) for `save_state`, `get_state`, `connect`, and `connect_with_port` method signatures
- Dapr Rust SDK `Cargo.toml` for MSRV (Minimum Supported Rust Version)

## Issues Found

### 1. Outdated crate version
- **What was wrong:** The post specified `dapr = "0.13"` in the Cargo.toml dependencies.
- **What was changed:** Updated to `dapr = "0.17"` (latest stable release as of review date).
- **Why:** Version 0.13.0 is significantly outdated. The latest stable is 0.17.0 (published 2025-09-23), with 0.18.0-rc.0 available as a release candidate.

### 2. Incorrect Rust minimum version
- **What was wrong:** The prerequisites stated "Rust 1.70 or higher."
- **What was changed:** Updated to "Rust 1.78 or higher."
- **Why:** The Dapr Rust SDK's MSRV (Minimum Supported Rust Version) is 1.78.0, as declared in the workspace Cargo.toml and crates.io metadata.

### 3. Incorrect `save_state` API usage
- **What was wrong:** The post used `client.save_state("statestore", "product-001", &product).await?` with 3 arguments and a reference to a serializable struct.
- **What was changed:** Updated to use all 6 required parameters: `store_name`, `key`, `value` (as `Vec<u8>`), `etag` (`None`), `metadata` (`None`), and `options` (`None`). Added `serde_json::to_vec(&product)?` for manual serialization.
- **Why:** The actual `save_state` method signature requires 6 parameters, and the value must be `Vec<u8>` (raw bytes), not a generic serializable reference. The original code would not compile.

### 4. Incorrect `get_state` return type
- **What was wrong:** The post typed the return value as `Option<Product>`, suggesting `get_state` returns a deserialized generic type.
- **What was changed:** Updated to use the actual `GetStateResponse` return type, check `response.data.is_empty()`, and manually deserialize with `serde_json::from_slice`.
- **Why:** `get_state` returns `Result<GetStateResponse, Error>`, where `GetStateResponse` contains a `data: Vec<u8>` field. Manual deserialization is required. The original code would not compile.

### 5. Misleading explicit port configuration example
- **What was wrong:** The explicit port example used `format!("https://127.0.0.1:{}", port)` with `Client::connect()`, which would cause a double port issue since `connect()` internally reads `DAPR_GRPC_PORT` and appends it.
- **What was changed:** Replaced with `connect_with_port` usage and added a note explaining that `connect()` reads the port from the environment variable internally.
- **Why:** Passing a full address with port to `connect()` would result in an address like `https://127.0.0.1:50001:50001`, causing a connection failure.

## Review Notes
- The component configuration YAML for Redis state store is correct and follows the standard Dapr component spec format.
- The `dapr run` command syntax is correct.
- The `dapr list` and `curl` verification commands are correct.
- The overall structure and explanation of Dapr concepts (sidecar, gRPC communication, state management) are accurate.
- Users should be aware that the Dapr Rust SDK is still pre-1.0 and APIs may continue to evolve between versions.
