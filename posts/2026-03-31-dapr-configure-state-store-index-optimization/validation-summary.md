# Validation Summary: How to Configure State Store Index Optimization for Dapr Query API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (State Management, Query API)
- Redis Stack (RedisJSON, RediSearch)
- Go (Dapr Go SDK)
- Kubernetes (kubectl)

## Sources Consulted
- [Dapr Redis State Store Reference](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/) — queryIndexes configuration and supported field types
- [Dapr State Management API Reference](https://docs.dapr.io/reference/api/state_api/) — query endpoint path and filter operators
- [Dapr How-To: Query State](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/) — query API usage, filter syntax, sort/pagination format
- [Dapr Go SDK (pkg.go.dev)](https://pkg.go.dev/github.com/dapr/go-sdk/client) — QueryStateAlpha1 method signature, QueryResponse and QueryItem struct definitions
- [Dapr Go SDK source (state.go)](https://github.com/dapr/go-sdk/blob/main/client/state.go) — verified QueryResponse.Results field and QueryItem.Value field names
- [Redis FT.INFO command](https://redis.io/docs/latest/commands/ft.info/) — RediSearch index inspection command

## Issues Found

1. **Invalid field type "TAG" in queryIndexes configuration**: The `queryIndexes` metadata field in Dapr's Redis state store component only supports `TEXT` and `NUMERIC` as field types. The post used `"type": "TAG"` for the `active` field, which is not a supported Dapr queryIndexes type. While RediSearch itself supports TAG fields, Dapr's queryIndexes abstraction does not expose this type. Changed `"TAG"` to `"TEXT"` on the `active` field index definition.

2. **Missing Content-Type header on pagination curl commands**: The two curl commands in the "Paginating Through Large Result Sets" section were missing the `-H "Content-Type: application/json"` header. Without this header, curl sends data as `application/x-www-form-urlencoded` by default, which is incorrect for a JSON payload. Added the header to both commands for correctness and consistency with the earlier curl examples in the post.

## Review Notes
- The Dapr State Query API remains at alpha status (`v1.0-alpha1`) and has not been promoted to stable. Users should be aware this API may change in future Dapr releases.
- The Go SDK method `QueryStateAlpha1` reflects this alpha status in its name. If/when the API is promoted to stable, the method name will likely change.
- The Go code example ignores the error from `dapr.NewClient()` with `_`. This is acceptable for a tutorial but would not be recommended in production code.
