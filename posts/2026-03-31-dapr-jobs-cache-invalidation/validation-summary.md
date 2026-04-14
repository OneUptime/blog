# Validation Summary: How to Use Dapr Jobs for Cache Invalidation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Jobs API (alpha)
- Dapr State Management API
- Dapr Redis Output Binding
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Node.js / Express
- Python / Requests
- Go

## Sources Consulted
- Dapr Jobs API Reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs Features & Concepts: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-features-concepts/
- Dapr Jobs How-To Guide: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Redis Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/redis/
- Dapr Go SDK client package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK common types: https://github.com/dapr/go-sdk/blob/main/service/common/type.go
- Dapr Jobs Go HTTP Quickstart: https://github.com/dapr/quickstarts/tree/master/jobs/go/http

## Issues Found

### 1. Fabricated bulk state delete endpoint (Critical)
**What was wrong:** The `deleteCacheKeys` JavaScript function used `DELETE /v1.0/state/{storeName}/bulk` with a body of `[{key, etag}]`. This endpoint does not exist in the Dapr State Management API and would return a 404/405 error at runtime.
**What was changed:** Replaced with the state transactions endpoint `POST /v1.0/state/{storeName}/transaction`, using an array of `{operation: "delete", request: {key}}` objects. This is the correct Dapr API for performing multiple state operations atomically.

### 2. Fabricated Redis binding `del-match` metadata (Critical)
**What was wrong:** The Python example used `"del-match": "true"` in the Redis binding metadata to perform pattern-based key deletion. This metadata field does not exist in the Dapr Redis output binding. The binding's `delete` operation only supports exact key deletion.
**What was changed:** Removed the `del-match` metadata field, renamed the function from `invalidate_cache_by_pattern` to `invalidate_cache_key` to accurately reflect that it deletes a single exact key, and updated the surrounding description text accordingly.

### 3. Go SDK `SaveState` data parameter type (Minor)
**What was wrong:** The Go example called `daprClient.SaveState(ctx, "statestore", k, v, nil)` where `v` came from ranging over a `map`. The `SaveState` method requires the data parameter to be `[]byte`.
**What was changed:** Wrapped `v` with `[]byte(v)` to ensure the correct type is passed, assuming the map values are strings.

## Review Notes
- The Dapr Jobs API uses the `v1.0-alpha1` version prefix, indicating it is still in alpha. Readers should be aware that the API may change in future Dapr releases.
- The `findCacheKeys` and `fetchProductsFromDatabase` functions in the JavaScript example are referenced but not defined. This is acceptable for a tutorial showing the pattern, but readers will need to implement these themselves.
- The Go example assumes `loadConfigFromDatabase()` returns a `map[string]string`. The type is not explicitly shown, which could cause confusion if the actual return type differs.
- The 6-field cron expression format used (`"0 0 9-17 * * 1-5"`) is correct for Dapr Jobs, which uses seconds as the first field. This differs from traditional 5-field cron and could confuse readers familiar with standard cron syntax.
