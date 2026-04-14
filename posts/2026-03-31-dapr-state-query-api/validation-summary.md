# Validation Summary: How to Query State Using the Dapr Query API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr State Management building block
- Dapr Query State API (alpha)
- Dapr Go SDK (`QueryStateAlpha1`)
- curl / HTTP API

## Sources Consulted
- Dapr State Management How-To: Query State API — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr State API Reference — https://docs.dapr.io/reference/api/state_api/
- Dapr Go SDK source (`client/state.go`) — QueryStateAlpha1 method signature and QueryResponse/QueryItem structs
- Dapr proto definition (`dapr/proto/runtime/v1/state.proto`) — QueryStateResponse message

## Issues Found
1. **Response example included undocumented `metadata` field with `count`**: The original response example showed `"metadata": {"count": "10"}` as part of the standard query response. While the `metadata` map exists in the protobuf definition for `QueryStateResponse`, the `count` key is not documented as a standard response field — its contents are component-specific and not guaranteed. Removed the `metadata` field from the response example to avoid misleading readers into depending on it.

## Review Notes
- The Query State API is still in alpha (`v1.0-alpha1`). The blog correctly notes this, but readers should be aware the API may change in future Dapr releases.
- The blog shows only POST for the query endpoint; Dapr also accepts PUT, but omitting this is not an error.
- The pagination example passes `"token": ""` on the first request. The official docs typically omit `token` entirely on the first query, but passing an empty string is functionally equivalent and not incorrect.
- The Go SDK example omits error handling for brevity, which is acceptable for a tutorial snippet. In production code, the `err` return from `QueryStateAlpha1` should be checked.
- `item.Value` in the Go SDK is `[]byte`; printing it with `%s` works for JSON-encoded state data, which is the typical use case.
