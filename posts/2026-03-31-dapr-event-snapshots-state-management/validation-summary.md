# Validation Summary: How to Implement Event Snapshots with Dapr State Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Go (programming language)
- Redis (as Dapr state store backend)
- Event Sourcing (architecture pattern)

## Sources Consulted
- Dapr State Management API documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr Go SDK source and API reference: https://github.com/dapr/go-sdk
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr component YAML schema: https://docs.dapr.io/operations/components/component-schema/
- Other validated Dapr blog posts in this repository for cross-referencing API usage patterns

## Issues Found

### 1. `SaveState` called with struct instead of `[]byte`
- **What was wrong:** The `SaveSnapshot` function passed a `Snapshot` struct directly to `client.SaveState()`. The Dapr Go SDK's `SaveState` method requires the data parameter to be `[]byte`, not `interface{}`.
- **What was changed:** Added `json.Marshal(snap)` to serialize the struct to `[]byte` before passing it to `SaveState`, with proper error handling.
- **Why:** The code would fail to compile because the Dapr Go SDK signature is `SaveState(ctx context.Context, storeName string, key string, data []byte, meta map[string]string, so ...StateOption) error`.

### 2. Invalid `keyPrefix` value in component YAML
- **What was wrong:** The state store component YAML used `keyPrefix: "snapshots"`, which is not a valid value. The Dapr `keyPrefix` metadata field only accepts `appid` (default), `name`, or `none`.
- **What was changed:** Changed `value: "snapshots"` to `value: "name"`, which prefixes keys with the component name (`snapshot-store`), achieving the intended namespace separation.
- **Why:** Using an arbitrary string for `keyPrefix` is not supported by Dapr state stores. The `name` option prefixes keys with the component name, providing equivalent separation.

## Review Notes
- The code snippets omit import statements (e.g., `encoding/json`, `fmt`, `context`), which is acceptable for a blog tutorial but readers should be aware they need to add the proper imports.
- Error handling is minimal in the `LoadAggregate` function — `json.Unmarshal` errors are silently discarded. This is acceptable for a tutorial but production code should handle these errors.
- The sequential key-based event replay approach (incrementing sequence numbers with individual `GetState` calls) works but is not optimal for large gaps between snapshot and current sequence. A query-based approach or Dapr pub/sub would be more efficient at scale.
- The `State` field in the `Snapshot` struct uses `interface{}` which will deserialize as `map[string]interface{}` from JSON, requiring the re-marshal/unmarshal pattern shown in `LoadAggregate`. This is a correct workaround but worth noting for readers.
