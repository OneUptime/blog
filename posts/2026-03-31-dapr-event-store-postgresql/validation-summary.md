# Validation Summary: How to Implement Event Store with Dapr and PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API, pub/sub API)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- PostgreSQL (as Dapr state store backend)
- Go programming language
- Event sourcing pattern

## Sources Consulted
- Dapr Go SDK source code — `github.com/dapr/go-sdk/client` (`Client` interface, `SaveStateWithETag`, `GetState`, `PublishEvent` method signatures)
- Dapr PostgreSQL state store v1 component spec — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr PostgreSQL state store v2 component spec — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/

## Issues Found

### 1. `SaveStateWithETag` `data` parameter type (line ~73-81)
**What was wrong:** The `AppendEvent` function passed the `event` struct directly to `SaveStateWithETag`, but the SDK method requires `[]byte` for the `data` parameter.
**What was changed:** Added `json.Marshal(event)` to serialize the event to `[]byte` before passing it to `SaveStateWithETag`, with proper error handling.

### 2. `SaveStateWithETag` options parameter type (line ~81)
**What was wrong:** The function passed `&dapr.StateOptions{Concurrency: dapr.StateConcurrencyFirstWrite}` (a `*StateOptions` pointer), but the SDK expects `...StateOption` functional options.
**What was changed:** Replaced with `dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite)`, the correct functional option helper.

### 3. Missing imports in first code block (lines 55-59)
**What was wrong:** The import block was missing `"context"` and `"encoding/json"`, both of which are used in the function body (`context.Background()` and now `json.Marshal`).
**What was changed:** Added both imports to the import block.

## Review Notes
- The Dapr PostgreSQL component YAML configuration is correct for v1. Dapr also offers a v2 of this component (introduced in Dapr 1.13) which uses BYTEA storage instead of JSONB and requires `tablePrefix` instead of `tableName`. The post's use of v1 is valid.
- The `LoadEvents` function uses a sequential key-scanning approach which works but is not efficient at scale — for large event streams, Dapr's State Query API (supported by PostgreSQL v1) would be more appropriate. This is a design choice rather than a correctness issue.
- The `AppendAndPublish` function does not use a transaction between persisting and publishing, so there's a window where the event is stored but not published (or vice versa). This is a known distributed systems challenge, not a code bug, but worth noting for production use.
- The `GetState` and `PublishEvent` API calls are correct.
