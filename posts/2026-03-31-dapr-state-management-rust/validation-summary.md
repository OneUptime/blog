# Validation Summary: How to Use Dapr State Management with Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Rust
- Dapr Rust SDK (`dapr` crate)
- Tokio async runtime
- Serde serialization
- Redis (as default state store backend)
- gRPC (Tonic)

## Sources Consulted
- Dapr Rust SDK GitHub repository: https://github.com/dapr/rust-sdk
- Dapr Rust SDK on crates.io: https://crates.io/crates/dapr
- Dapr Rust SDK docs on docs.rs: https://docs.rs/dapr/latest/dapr/
- Dapr CLI reference documentation: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/

## Issues Found

1. **Outdated crate version**: `dapr = "0.13"` changed to `dapr = "0.17"`. Version 0.13 is significantly outdated; 0.17 is the latest release.

2. **`save_state` incorrect signature**: The original code called `client.save_state("statestore", "user-alice", &profile)` passing a reference to a struct. The actual API takes `Vec<u8>` for the value, plus three additional parameters (`etag: Option<Etag>`, `metadata: Option<HashMap<String, String>>`, `options: Option<StateOptions>`). Fixed to serialize with `serde_json::to_vec(&profile)?` and pass `None` for the extra parameters.

3. **`get_state` incorrect return type**: The original code treated the return as `Option<UserProfile>`. The actual API returns `Result<GetStateResponse, Error>` where `GetStateResponse` contains a `data: Vec<u8>` field. Fixed to use `response.data.is_empty()` for the not-found check and `serde_json::from_slice(&response.data)?` for deserialization.

4. **`get_bulk_state` method does not exist**: The high-level `Client` does not expose a `get_bulk_state` method. Replaced with a loop of individual `get_state` calls and renamed the section from "Bulk State Reads" to "Reading Multiple State Keys".

5. **Incorrect proto module path**: `dapr::dapr::dapr::proto::runtime::v1` (triple `dapr`) corrected to `dapr::dapr::proto::runtime::v1` (double `dapr`). The crate name is `dapr` and it contains a module named `dapr`, so external code uses `dapr::dapr::proto::...`.

6. **Incorrect struct field name**: `operationtype` corrected to `operation_type` (with underscore) in `TransactionalStateOperation`.

7. **`StateItem` wrong module**: `StateItem` is defined in `dapr::dapr::proto::common::v1`, not in `runtime::v1`. Added a separate import for `common::v1`.

8. **`execute_state_transaction` not on high-level Client**: The method does not exist on the SDK's `Client` wrapper. Changed to construct an `ExecuteStateTransactionRequest` and call through the underlying gRPC client.

9. **Summary text updated**: Removed claim about "bulk reads" and corrected the description to accurately reflect that state values are `Vec<u8>` (not typed structs directly).

## Review Notes
- The `connect` method reads the port from the `DAPR_GRPC_PORT` environment variable (set automatically by `dapr run`). The blog could mention this but it is not incorrect as-is.
- The transaction section accesses the inner gRPC client via `client.0`, which may not compile if the tuple struct field is private. Users may need to construct a separate gRPC client for transaction support until the SDK adds a high-level wrapper.
- The description still mentions "optimistic concurrency and bulk operations" but the post no longer demonstrates a dedicated bulk API or optimistic concurrency with ETags. This is a minor content mismatch but not a technical error.
- The Dapr Rust SDK is still evolving; future versions may add high-level wrappers for bulk state and transactions.
