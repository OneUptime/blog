# Validation Summary: How to Handle Nested Objects in Dapr State Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block)
- Dapr .NET SDK (`DaprClient`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- C# / .NET
- Go
- JSON serialization
- Optimistic concurrency with ETags

## Sources Consulted
- Dapr .NET SDK source — `DaprClient.cs`: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs
- Dapr .NET SDK state management examples — `StateStoreETagsExample.cs`, `StateStoreTransactionsExample.cs`: https://github.com/dapr/dotnet-sdk/tree/master/examples/Client/StateManagement
- Dapr Go SDK package docs: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr docs — How-To: Save and get state: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr docs — .NET SDK getting started: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr docs — Go SDK getting started: https://docs.dapr.io/developing-applications/sdks/go/go-client/

## Issues Found
1. **`StateTransactionRequest` constructor incorrect (C#)**: The post passed `etag` as a 4th positional constructor argument: `new(stateKey, bytes, StateOperationType.Upsert, etag)`. The constructor only accepts 3 parameters `(key, value, operationType)`. The ETag must be set via the `ETag` property after construction. Fixed to use object initializer syntax: `new(..., StateOperationType.Upsert) { ETag = etag }`.

## Review Notes
- All other C# APIs (`GetStateAndETagAsync<T>`, `TrySaveStateAsync`, `ExecuteStateTransactionAsync`, `StateOperationType.Upsert`) are correct.
- All Go SDK APIs (`GetState`, `SaveStateWithETag`) are correct with accurate parameter order and return types.
- The `deepMerge` Go function is a correct recursive map merge implementation.
- The optimistic concurrency retry pattern in the C# example is a sound approach.
- The post correctly notes that Dapr treats state values as opaque blobs with no nested-field awareness.
