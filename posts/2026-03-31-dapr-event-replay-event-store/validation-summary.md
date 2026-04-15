# Validation Summary: How to Implement Event Replay from Dapr Event Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr State Management API
- Go (Golang)
- Event Sourcing / Event Replay patterns

## Sources Consulted
- Dapr Go SDK source and Client interface (`github.com/dapr/go-sdk/client`) — verified `GetState` and `SaveState` method signatures
- Other validated Dapr blog posts in this repository (e.g., `2026-03-31-dapr-go-state-management`, `2026-03-31-dapr-go-client`, `2026-03-31-dapr-cache-ttl-state`) for consistent API usage patterns
- Dapr State Management API documentation (https://docs.dapr.io/developing-applications/building-blocks/state-management/)

## Issues Found

1. **Missing `encoding/json` import in first code block** (line 29): The `ReplayStream` function uses `json.Unmarshal` but the `encoding/json` package was not included in the import block. Added it to the imports.

2. **`SaveCheckpoint` passes struct instead of `[]byte` to `SaveState`** (line 110): The Dapr Go SDK's `SaveState` method requires `[]byte` for the data parameter, but the code passed a `ReplayCheckpoint` struct directly. This would cause a compile error. Fixed by adding `json.Marshal(cp)` before the `SaveState` call, with proper error handling.

3. **`LoadCheckpoint` silently ignores `json.Unmarshal` error** (line 120): The error return from `json.Unmarshal` was discarded. If the stored checkpoint data is corrupted, the function would silently return sequence 1 instead of reporting the error. Fixed by checking and returning the error.

## Review Notes
- The `RebuildProjection` function hardcodes `"Order"` as the aggregate type (lines 145, 149) rather than accepting it as a parameter. This limits reusability but is acceptable for an illustrative example.
- The `GetState` call passes `"consistency": "strong"` via the metadata map. While the idiomatic Dapr Go SDK approach uses `GetStateWithConsistency` with a `StateConsistencyStrong` constant, metadata-based consistency hints are a recognized pattern and not incorrect.
- The `SaveCheckpoint` and `LoadCheckpoint` functions use a different state store name (`"statestore"`) than the event store (`"event-store"`). This is actually correct practice — checkpoints should be stored separately from events.
