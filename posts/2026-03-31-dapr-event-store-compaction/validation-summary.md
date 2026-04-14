# Validation Summary: How to Implement Event Store Compaction with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr State Management API (SaveState, GetState, DeleteState, SaveStateWithETag)
- Dapr Jobs API (alpha)
- Go (Golang)

## Sources Consulted
- Dapr Go SDK source code on GitHub (`github.com/dapr/go-sdk`) — verified function signatures for `DeleteState`, `GetState`, `SaveState`, `SaveStateWithETag`
- Dapr Jobs API documentation — verified that jobs are scheduled programmatically (not via YAML component declarations)
- Dapr state store TTL documentation — confirmed `ttlInSeconds` metadata key support

## Issues Found

1. **`SaveStateWithETag` data parameter type mismatch (Strategy 3)**: The code passed an `Event` struct directly to `SaveStateWithETag`, but the Dapr Go SDK expects `[]byte` for the `data` parameter. Added `json.Marshal(event)` to serialize the event before passing it. Also removed a trailing `nil` argument intended for the variadic `...StateOption` parameter, which would cause a compile error since `StateOption` is a struct type.

2. **Non-existent YAML `kind: Job` resource (Scheduled Job section)**: The post showed a YAML declaration with `apiVersion: dapr.io/v1alpha1` and `kind: Job`, but Dapr does not support declarative YAML-based job scheduling. Jobs are created programmatically via the Dapr Jobs HTTP API or Go SDK. Replaced with a Go code example using `client.ScheduleJobAlpha1()`.

3. **Incorrect job handler endpoint path (Scheduled Job section)**: The handler was registered at `/jobs/event-compaction` (plural), but Dapr invokes app callbacks at `/job/<name>` (singular). Changed to `/job/event-compaction`.

## Review Notes
- The Dapr Jobs API is currently in alpha (`v1.0-alpha1` / `ScheduleJobAlpha1`). The API may change in future Dapr releases.
- Strategy 2 (Archive and Compact) silently ignores errors from `SaveState` and `DeleteState` calls within the loop. In production code, these errors should be handled to avoid silent data loss during archival.
- The `GetState` return value in Strategy 2 (`item`) is a pointer (`*StateItem`). The nil-safety relies on short-circuit evaluation of `err != nil || len(item.Value) == 0`, which is correct but worth noting.
- TTL-based expiration (Strategy 3) depends on the underlying state store component supporting TTL (e.g., Redis, CosmosDB). Not all Dapr state store backends support this feature.
