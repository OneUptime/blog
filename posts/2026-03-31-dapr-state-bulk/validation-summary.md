# Validation Summary: How to Use Dapr State Bulk Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management HTTP API and transaction API)
- Python (requests library for HTTP calls)
- Go (net/http standard library and dapr/go-sdk)
- Mermaid (diagram)

## Sources Consulted
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Go SDK (pkg.go.dev): https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr runtime source (BulkGetResponse struct): https://github.com/dapr/dapr

## Issues Found

1. **Incorrect atomicity claim for bulk save** (line 36): The post stated "All items are saved atomically where supported, or as a batch otherwise." This is wrong — the standard save endpoint (`POST /v1.0/state/{storeName}`) performs a batch operation, not an atomic one. Individual items may succeed or fail independently. Atomicity is only available through the transaction endpoint. Fixed to clarify that bulk save is a batch operation and to point readers to the transaction endpoint for atomic writes.

2. **Inconsistent math in performance diagram** (mermaid diagram): The diagram showed 1000ms for individual saves vs 5ms for bulk save, then claimed "20x throughput improvement." The actual ratio of those numbers is 200x, not 20x. Fixed to "200x fewer round-trips" to match the numbers shown.

## Review Notes
- The Dapr official docs reference page shows `"value"` as the field name in bulk get responses, while the actual Dapr runtime implementation uses `"data"` (matching the `json:"data"` struct tag in the Go source). The blog post uses `"data"`, which matches the real API behavior. This is a known docs-vs-implementation discrepancy in the Dapr project.
- The Go SDK signatures (`SaveBulkState`, `GetBulkState`, `SetStateItem`) were verified against pkg.go.dev and are all correct.
- The Python examples correctly use the HTTP API endpoints and are syntactically valid.
- The transaction endpoint format for bulk delete is correct.
- The `parallelism` field description is accurate — it controls concurrent reads within the sidecar.
- The post could mention that the Go SDK also provides `DeleteBulkState` and `DeleteBulkStateItems` methods for bulk deletion (rather than only showing the HTTP transaction approach), but this is an enhancement rather than an error.
