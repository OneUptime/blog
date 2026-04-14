# Validation Summary: How to Use Dapr State Management with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr State Management building block

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (client package, Client interface)
- Dapr Go SDK package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr State Management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr Go SDK getting started guide: https://docs.dapr.io/developing-applications/sdks/go/go-client/

## Issues Found

### 1. `SaveStateWithETag` parameter order was incorrect
**What was wrong:** The blog had `client.SaveStateWithETag(ctx, store, "counter", etag, data, nil)` with `etag` before `data`.
**What was changed:** Swapped to `client.SaveStateWithETag(ctx, store, "counter", data, etag, nil)` — the SDK signature is `(ctx, storeName, key, data, etag, meta, ...StateOption)`.
**Why:** The original parameter order would cause a Go compilation error since `data` is `[]byte` and `etag` is `string`; they are not interchangeable.

### 2. `dapr.Raw()` function does not exist in the Dapr Go SDK
**What was wrong:** The blog used `dapr.Raw(...)` in both the Bulk Operations and Transactional Operations sections to create values for `SetStateItem.Value`.
**What was changed:** Replaced all `dapr.Raw(...)` calls with `[]byte(...)`.
**Why:** `dapr.Raw()` is not an exported function in the Dapr Go SDK. The `SetStateItem.Value` field is of type `[]byte`, so `[]byte(...)` is the correct way to create byte slice values from string literals.

### 3. Unused `opts` variable removed (Go compile error)
**What was wrong:** The ETag section defined `opts := &dapr.StateOptions{...}` but never passed it to any function call. In Go, unused variables cause compilation errors.
**What was changed:** Removed the `opts` variable declaration. The `SaveStateWithETag` function already demonstrates optimistic concurrency via the ETag mechanism itself.
**Why:** Go enforces that all declared variables must be used. The unused variable would prevent compilation. The `SaveStateWithETag` function accepts variadic `...StateOption` functional options (not a `*StateOptions` struct pointer), so the original approach of creating a struct was also the wrong type.

## Review Notes
- The `SaveStateWithETag` function supports optional variadic `StateOption` parameters for concurrency and consistency settings. The blog could be enhanced in the future to demonstrate these using helper functions like `WithConcurrency()` and `WithConsistency()` if they want to show explicit concurrency mode configuration.
- The `GetBulkState` parallelism parameter of `0` means the Dapr runtime will decide the parallelism level. This is correct but could be noted for clarity.
- The overview mentions the "DaprClient interface" — the actual interface name in the SDK is `Client`. This is a minor naming discrepancy but does not affect the code examples.
