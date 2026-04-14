# Validation Summary: How to Implement Event Store with Dapr and MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- MongoDB (as Dapr state store backend)
- Go (programming language)
- Event Sourcing (architecture pattern)

## Sources Consulted
- Dapr Go SDK source code (`github.com/dapr/go-sdk/client`): verified `SaveStateWithETag`, `GetState`, `PublishEvent` method signatures, `StateOption`/`StateOptions` types, and concurrency/consistency constants
- Dapr MongoDB state store component spec (`dapr/components-contrib`): verified metadata field names (`host`, `databaseName`, `collectionName`, `writeconcern`, `readconcern`)
- Dapr state management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr MongoDB state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/

## Issues Found

### 1. `SaveStateWithETag` data parameter type mismatch
- **What was wrong:** The `AppendEvent` function passed a `DomainEvent` struct directly as the `data` parameter to `client.SaveStateWithETag`. The Dapr Go SDK method signature requires `[]byte`, not `interface{}`.
- **What was changed:** Added `json.Marshal(event)` to serialize the event to `[]byte` before passing it to `SaveStateWithETag`.
- **Why:** Passing a struct directly to a `[]byte` parameter would cause a compile error.

### 2. `SaveStateWithETag` options parameter type mismatch
- **What was wrong:** The code constructed a `*StateOptions` struct and passed it as the last argument. The Dapr Go SDK uses the functional options pattern — `SaveStateWithETag` accepts variadic `...StateOption` (where `StateOption` is `func(*StateOptions)`), not a `*StateOptions` pointer.
- **What was changed:** Replaced `&dapr.StateOptions{...}` with `dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite)` and `dapr.WithConsistency(dapr.StateConsistencyStrong)` functional option helpers.
- **Why:** Passing `*StateOptions` where `...StateOption` is expected would cause a compile error.

### 3. Missing `encoding/json` import in store.go
- **What was wrong:** The `store.go` imports block did not include `encoding/json`, but `json.Marshal` is now needed in `AppendEvent` (and `json.Unmarshal` is used in `LoadEventStream`).
- **What was changed:** Added `"encoding/json"` to the import block.
- **Why:** Missing import would cause a compile error.

## Review Notes
- The `LoadEventStream` function loads events one-by-one via sequential `GetState` calls. This works but is inefficient for large event streams. Dapr's query state API or MongoDB's native query capabilities could improve performance. This is a design trade-off, not an error.
- Type assertions in `RebuildAccount` (e.g., `e.Payload["amount"].(float64)`) will panic if the key is missing or the type doesn't match. Production code should use the comma-ok idiom. Acceptable for a tutorial.
- The `AppendAndPublish` function has a dual-write concern: if `PublishEvent` fails after `AppendEvent` succeeds, the event is persisted but not published. The Dapr outbox pattern or transactional outbox would address this in production. Worth noting but not an error in a tutorial context.
- The `HandleWithdraw` and `LoadEventStream` code blocks are shown without package/import declarations. Readers should understand these need `time` and `encoding/json` imports respectively in whatever file they reside in.
