# Validation Summary: How to Use Dapr State Management with Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (State Management building block)
- Node.js
- @dapr/dapr SDK (v3.x)
- Redis (as state store backing)

## Sources Consulted
- [JavaScript Client SDK | Dapr Docs](https://docs.dapr.io/developing-applications/sdks/js/js-client/)
- [State Management API Reference | Dapr Docs](https://docs.dapr.io/reference/api/state_api/)
- [Redis State Store | Dapr Docs](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- [dapr/js-sdk GitHub Repository](https://github.com/dapr/js-sdk)
- [@dapr/dapr npm package source code](https://www.npmjs.com/package/@dapr/dapr)

## Issues Found

1. **`daprHost` included protocol prefix** — The `DaprClient` constructor had `daprHost: "http://localhost"`. The SDK expects just the hostname (e.g., `"127.0.0.1"`); it prepends the protocol internally. While including the protocol happens to work due to a `://` check in the SDK, it is not the documented convention and could break with future SDK versions. Changed to `"127.0.0.1"`.

2. **`getBulk()` destructured `data` instead of `value`** — The blog destructured `{ key, data }` from `getBulk()` results. With the default HTTP transport, each item in the returned array has the shape `{ key, value, etag }`, not `{ key, data }`. Changed to `{ key, value }` and updated property accesses from `data.name`/`data.price` to `value.name`/`value.price`.

3. **ETags section used `state.get()` to retrieve ETags** — The blog showed `const etag = item.etag` after calling `state.get()`. However, the Node.js SDK's `state.get()` method does not expose ETags — it only returns the stored value. The HTTP API returns the ETag in a response header, but the SDK discards headers. Fixed by switching to `state.getBulk()` which does include `etag` in its response items, and updated the value access pattern accordingly (`item.value.stock` instead of `item.stock`).

## Review Notes
- The `getBulk()` return shape differs between HTTP transport (`{ key, value, etag }`) and gRPC transport (`{ key, data, etag }`). This is an inconsistency in the Dapr Node.js SDK itself. The post now uses the HTTP transport shape, which is the default. A note about this inconsistency could be helpful for readers who switch to gRPC.
- The concurrency and consistency string values (`"first-write"`, `"strong"`) used in the `options` field correspond to the underlying Dapr API values and are accepted by the SDK.
- The component YAML is correct: `dapr.io/v1alpha1` is the current apiVersion, `state.redis` with `v1` is valid, and `actorStateStore` is a recognized metadata field.
- The `state.transaction()` call format with `{ operation, request: { key, value } }` is correct per the SDK's `OperationType`.
