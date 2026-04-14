# Validation Summary: How to Build a Logging and Monitoring Platform with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub, bindings, state management, configuration)
- Go (Dapr Go SDK)
- Elasticsearch (as log storage backend via HTTP binding)
- OpenTelemetry (distributed tracing)
- Jaeger / Grafana Tempo (trace backends)

## Sources Consulted
- Dapr Go SDK source code — https://github.com/dapr/go-sdk/blob/main/client/client.go
- Dapr Go SDK common types — https://github.com/dapr/go-sdk/blob/main/service/common/type.go
- Dapr Go SDK binding types — https://github.com/dapr/go-sdk/blob/main/client/binding.go
- Dapr HTTP output binding specification — https://docs.dapr.io/reference/components-reference/supported-bindings/http/
- Dapr supported bindings list — https://docs.dapr.io/reference/components-reference/supported-bindings/
- Dapr configuration overview (tracing/OTel) — https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

### 1. Dead code in `flush()` method
**What was wrong:** The `docs` variable was constructed in a loop (building index metadata and marshaling each log entry) but was never used. Instead, `buildElasticsearchBulk(batch)` was called separately with the original `batch` slice, making the `docs` construction dead code.
**What was changed:** Removed the unused `docs` variable and its construction loop.
**Why:** Dead code in a tutorial is confusing and suggests the two approaches were mixed up during writing.

### 2. Invalid Dapr binding operation `"bulk"`
**What was wrong:** The `InvokeBinding` call used `Operation: "bulk"`, which is not a valid operation for any standard Dapr binding. Dapr does not have a native Elasticsearch binding; the comment correctly notes this uses an HTTP binding, whose valid operations are HTTP methods: `post`, `get`, `put`, `delete`, `patch`, `head`, `options`, `trace`.
**What was changed:** Changed `Operation: "bulk"` to `Operation: "post"`, since Elasticsearch's `_bulk` API endpoint accepts POST requests.
**Why:** Using an invalid operation would cause a runtime error when the binding is invoked.

## Review Notes
- Dapr does not have a native Elasticsearch output binding component. The post correctly uses an HTTP binding for this purpose, but readers should be aware they need to configure an HTTP binding component with Elasticsearch's URL (including the `_bulk` endpoint path) and appropriate metadata.
- The Go code snippets use `dapr.Client` and `dapr.InvokeBindingRequest` which implies the import alias `dapr "github.com/dapr/go-sdk/client"`. This is non-standard (the typical import uses `client` as the package name) but would work with the alias. Since imports are omitted from blog snippets, this is acceptable.
- The `PublishEvent`, `GetState`, `SaveState` API calls all match the current Dapr Go SDK signatures correctly.
- The `TopicEvent.RawData` field usage is correct.
- The OpenTelemetry Configuration YAML (`spec.tracing.otel` with `endpointAddress`, `isSecure`, `protocol`) is correct per Dapr documentation.
- Error handling is intentionally minimal throughout the snippets, which is typical for tutorial-style blog posts.
