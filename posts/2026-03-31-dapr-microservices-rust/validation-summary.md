# Validation Summary: How to Build Microservices with Dapr and Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Dapr (Distributed Application Runtime)
- Dapr Rust SDK (`dapr` crate)
- Actix Web (Rust HTTP framework)
- Serde / serde_json (Rust serialization)
- prost_types (Protocol Buffers types for Rust)
- Cargo workspaces
- Dapr CLI

## Sources Consulted
- Dapr Rust SDK source code and examples: https://github.com/dapr/rust-sdk
- Dapr Rust SDK `Client::invoke_service` signature (requires `Option<prost_types::Any>` for data parameter)
- Dapr Rust SDK `Client::save_state` signature (requires `Vec<u8>` value and three optional parameters: etag, metadata, options)
- Dapr Rust SDK `Client::publish_event` signature (pubsub_name, topic, data_content_type, data, metadata)
- Dapr Rust SDK `Client::connect` implementation (reads port from `DAPR_GRPC_PORT` env var)
- Dapr CLI `dapr run` command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Cargo workspaces documentation: https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html

## Issues Found

### 1. `invoke_service` data parameter type mismatch
- **What was wrong:** The `invoke_service` call passed `Some(serde_json::to_vec(&check_body).unwrap())` which is `Option<Vec<u8>>`. The Dapr Rust SDK expects `Option<prost_types::Any>` for the data parameter.
- **What was changed:** Wrapped the serialized data in `prost_types::Any { type_url: "".to_string(), value: ... }` and added `use prost_types::Any;` to the imports.
- **Why:** Without wrapping in `prost_types::Any`, the code would fail to compile due to a type mismatch.

### 2. `save_state` wrong value type and missing parameters
- **What was wrong:** The call `client.save_state("statestore", &order.order_id, &order)` had two issues: (a) the value was passed as `&Order` instead of `Vec<u8>`, and (b) three required parameters were missing (etag, metadata, options).
- **What was changed:** Changed the value to `serde_json::to_vec(&order).unwrap()` and added `None, None, None` for the etag, metadata, and options parameters.
- **Why:** The Dapr Rust SDK `save_state` method signature requires 6 parameters: `(store_name, key, value: Vec<u8>, etag: Option<Etag>, metadata: Option<HashMap<String, String>>, options: Option<StateOptions>)`. Without these fixes, the code would not compile.

## Review Notes
- The `Client::connect("https://127.0.0.1")` call is correct -- the SDK automatically reads the gRPC port from the `DAPR_GRPC_PORT` environment variable which Dapr sets when running via `dapr run`.
- The `publish_event` call is correct with all 5 parameters in the right order.
- The `dapr run` CLI commands use the correct `--` separator syntax before `cargo run`.
- The curl test command hits `localhost:8081` (the app port directly) rather than the Dapr sidecar HTTP port. This works for a basic smoke test since the app binds to `0.0.0.0:8081`, but readers should know this bypasses Dapr sidecar middleware on the inbound request path.
- The `cargo run --bin <name>` works in a workspace but `cargo run -p <package>` is the more idiomatic Cargo approach for workspace member selection. Not changed since `--bin` is functionally correct.
