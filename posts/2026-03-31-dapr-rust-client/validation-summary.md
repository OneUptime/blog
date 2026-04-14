# Validation Summary: How to Use Dapr Rust Client

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Rust programming language
- Dapr Rust SDK (`dapr` crate)
- gRPC (via Tonic)
- Tokio async runtime
- Serde serialization
- prost-types (protobuf)

## Sources Consulted
- Dapr Rust SDK GitHub repository: https://github.com/dapr/rust-sdk
- Dapr Rust SDK client source (`dapr/src/client.rs`) on the main branch
- Dapr Rust SDK examples directory (`examples/src/client/`)
- crates.io dapr crate page: https://crates.io/crates/dapr

## Issues Found

1. **Outdated crate version**: `dapr = "0.13"` was specified but the latest stable release is 0.17.0. Updated to `dapr = "0.17"`.

2. **Missing `prost-types` dependency**: The `invoke_service` method requires `prost_types::Any` for the data parameter, but the dependency was not listed in `Cargo.toml`. Added `prost-types = "0.12"`.

3. **Incorrect `save_state` signature**: The post called `save_state` with 3 arguments (`store_name`, `key`, `&session`), passing a serializable reference. The actual method takes 6 arguments (`store_name`, `key`, `value: Vec<u8>`, `etag: Option<Etag>`, `metadata: Option<HashMap<String, String>>`, `options: Option<StateOptions>`). Fixed to serialize data to `Vec<u8>` via `serde_json::to_vec` and pass `None` for the remaining optional parameters.

4. **Incorrect `get_state` return type**: The post declared `let retrieved: Option<Session>` as the return type, but `get_state` returns `Result<GetStateResponse, Error>` where `GetStateResponse` contains raw `data: Vec<u8>`. Fixed to receive the response struct and manually deserialize with `serde_json::from_slice`.

5. **Incorrect `invoke_service` data parameter type**: The post passed `Option<Vec<u8>>` but the method expects `Option<prost_types::Any>`. Fixed to wrap the serialized bytes in a `prost_types::Any` struct.

6. **Incorrect `get_secret` signature**: The post called `get_secret` with 3 arguments including a `None` metadata parameter, but the method only takes 2 arguments (`store_name`, `key`). Removed the extra `None` argument.

7. **Non-existent `get_bulk_state` method**: The entire "Bulk State Operations" section used `client.get_bulk_state()`, which does not exist in the Dapr Rust SDK. The SDK provides `save_bulk_states` and `delete_bulk_state` but not a bulk-read method. Replaced the section with a "Bulk State Save" example using `save_bulk_states`.

8. **Unused import**: `use std::collections::HashMap` was imported in the publish events section but never used. Removed the import.

## Review Notes
- The `get_state` response includes `etag` and `metadata` fields that could be useful for optimistic concurrency; the post doesn't mention these but that's acceptable for a getting-started tutorial.
- The `connect` method reads `DAPR_GRPC_PORT` from the environment variable internally, which is set automatically by `dapr run`. This is why no port is needed in the URL string. The post could mention this but it's not incorrect as written.
- The `save_bulk_states` API may vary in its exact parameter format depending on the SDK version; the replacement code follows the pattern from the SDK source.
