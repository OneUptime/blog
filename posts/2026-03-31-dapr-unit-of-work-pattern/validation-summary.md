# Validation Summary: How to Use Dapr with Unit of Work Pattern

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, transactions)
- Dapr .NET SDK (`Dapr.Client`)
- C# / .NET (dependency injection, async/await)
- Unit of Work design pattern
- Moq (unit testing)

## Sources Consulted
- Dapr .NET SDK source code on GitHub: https://github.com/dapr/dotnet-sdk (`StateTransactionRequest`, `DaprClient`, `StateOperationType`)
- Dapr state management transactions documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/

## Issues Found
1. **Incorrect `StateTransactionRequest` constructor call (two occurrences)**
   - **What was wrong:** Both the `Add` and `Remove` methods passed a nonexistent named parameter `jsonSerializerOptions: null` to the `StateTransactionRequest` constructor. This parameter does not exist on the class. The actual constructor signature is `(string key, byte[]? value, StateOperationType operationType, string? etag = null, ...)`. The parameter order was also incorrect — `value` should come before `operationType`.
   - **What was changed:** Removed the `jsonSerializerOptions: null` argument and reordered parameters to match the actual constructor: `key`, `value`, `operationType`, `etag`.
   - **Why:** The original code would not compile. `StateTransactionRequest` accepts `key`, `value` (byte[]?), `operationType`, and optional `etag`/`metadata`/`options` — there is no serializer options parameter.

## Review Notes
- `ExecuteStateTransactionAsync`, `GetStateEntryAsync`, `StateOperationType.Upsert`, and `StateOperationType.Delete` are all verified correct against the Dapr .NET SDK.
- `List<StateTransactionRequest>` is correctly assignable to the `IReadOnlyList<StateTransactionRequest>` parameter expected by `ExecuteStateTransactionAsync`.
- The DI registration using `AddDaprClient()` and scoped lifetime for the Unit of Work is appropriate.
- The test correctly uses Moq to verify the interaction pattern. Note that `mockUow.Verify(u => u.CommitAsync(default), Times.Once)` uses `default` for `CancellationToken`, which matches the call site since no token is passed — this is correct.
- The post's description mentions ETags for optimistic concurrency, but the code examples pass `etag: null` everywhere. This is fine for a basic tutorial but readers implementing production systems should be aware they need to capture and pass ETags from read operations to get true optimistic concurrency.
