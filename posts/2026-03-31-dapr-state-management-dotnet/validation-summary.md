# Validation Summary: How to Use Dapr State Management with .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- .NET / C#
- Dapr .NET SDK (`Dapr.Client` NuGet package)
- Redis (as example state store backend)

## Sources Consulted
- Official Dapr .NET SDK GitHub repository: https://github.com/dapr/dotnet-sdk
- Dapr.Client NuGet package: https://www.nuget.org/packages/Dapr.Client
- Dapr .NET SDK client documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr State Management how-to guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/

## Issues Found

### 1. Incorrect method in State Options section
- **What was wrong:** The code used `SaveStateAsync` with an `etag:` named parameter, but `SaveStateAsync` does not accept an `etag` parameter. Only `TrySaveStateAsync` accepts an etag for optimistic concurrency control.
- **What was changed:** Replaced `await _dapr.SaveStateAsync(Store, "user-1", user, etag: etag, stateOptions: options);` with `bool saved = await _dapr.TrySaveStateAsync(Store, "user-1", user, etag, stateOptions: options);`.
- **Why:** `SaveStateAsync` has no `etag` parameter in its signature. `TrySaveStateAsync` is the correct method when combining etag-based concurrency with `StateOptions`, especially since `ConcurrencyMode.FirstWrite` requires an etag.

### 2. Undefined variables in Transactions section
- **What was wrong:** The `TransferCredits` method used `fromBalance` and `toBalance` variables that were never declared or assigned, which would cause a compilation error.
- **What was changed:** Added two lines to read the current balances from the state store before constructing the transaction: `var fromBalance = await _dapr.GetStateAsync<int>(Store, fromKey);` and `var toBalance = await _dapr.GetStateAsync<int>(Store, toKey);`.
- **Why:** The transaction operations serialize `fromBalance - amount` and `toBalance + amount`, so the current balances must be read first.

### 3. Type mismatch in Bulk Operations section
- **What was wrong:** `GetBulkStateAsync` requires `IReadOnlyList<string>` for the keys parameter, but `Enumerable.Range(...).Select(...)` returns `IEnumerable<string>`, which does not implicitly convert to `IReadOnlyList<string>`. The code would not compile.
- **What was changed:** Added `.ToList()` to the keys LINQ expression to produce a `List<string>`, which implements `IReadOnlyList<string>`.
- **Why:** `List<T>` implements `IReadOnlyList<T>`, satisfying the parameter type requirement.

## Review Notes
- The `GetBulkStateAsync` call returns `IReadOnlyList<BulkStateItem>` where `Value` is a raw JSON string, not a deserialized object. The `Console.WriteLine` in the example will print raw JSON, which is correct but readers should be aware of this behavior. A generic overload `GetBulkStateAsync<TValue>` exists for deserialized results.
- The Transactions example reads balances and then executes the transaction without etag protection, meaning a concurrent modification between the reads and the transaction could cause incorrect balances. This is a known limitation of the pattern shown and is acceptable for a tutorial example, but production code should use etag-based concurrency.
- The description mentions "state store query API" but the post does not cover querying. This is a minor metadata inaccuracy but does not affect the technical content.
