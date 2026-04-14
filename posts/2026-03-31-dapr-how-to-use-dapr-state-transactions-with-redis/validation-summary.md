# Validation Summary: How to Use Dapr State Transactions with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, transactional state API)
- Redis (MULTI/EXEC transactions)
- Python (requests library, Dapr HTTP API)
- C# / .NET (Dapr .NET SDK, DaprClient)

## Sources Consulted
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Management Overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/
- Dapr .NET SDK source (StateTransactionRequest): https://github.com/dapr/dotnet-sdk

## Issues Found

1. **Incorrect HTTP status code for missing keys (optimistic concurrency code)**: The `update_with_retry` function checked for `resp.status_code == 404` to detect non-existent keys. Dapr's state GET API returns HTTP 204 (No Content) for missing keys, not 404. Changed `404` to `204`.

2. **Wrong endpoint for bulk state save**: The `bulk_upsert_orders` function posted to `/v1.0/state/statestore/bulk`, but the `/bulk` path is the bulk GET (read) endpoint. Bulk save uses the same endpoint as single save: `POST /v1.0/state/statestore` with a JSON array body. Removed `/bulk` from the URL.

## Review Notes
- The post correctly notes that Redis MULTI/EXEC does not roll back on individual command errors, which is an important nuance often missed.
- The first Python code example (`basic_transaction.py`) handles the 204-vs-200 case correctly by accident: it checks `status_code == 200` before calling `.json()` and falls through to a default otherwise.
- The .NET SDK code is correct: `StateTransactionRequest` constructor parameter is indeed named `options` (not `stateOptions`), and the `StateOperationType`, `ConcurrencyMode`, and `ConsistencyMode` enum values are all accurate.
- The summary's recommendation to use hash tags for Redis Cluster key colocation is sound advice.
