# Validation Summary: How to Use Dapr Distributed Lock with .NET SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (`Dapr.Client` NuGet package)
- Dapr Distributed Lock API (Alpha)
- Redis as lock store backend
- C# / .NET

## Sources Consulted
- Dapr Distributed Lock building block documentation: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/
- Dapr .NET SDK source code (`DaprClient.cs`): https://github.com/dapr/dotnet-sdk
- Dapr Lock API reference: https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr Redis lock component specification: https://docs.dapr.io/reference/components-reference/supported-lock/redis-lock/

## Issues Found
- **Leader Election example missing try/finally block (Step 4):** The `Unlock()` call was placed after `RunLeaderTask()` without a `try/finally` wrapper. If `RunLeaderTask()` threw an exception, the lock would not be released until it auto-expired (60 seconds). This contradicted the blog's own Summary advice to "always release locks in a `finally` block." Fixed by wrapping the leader task execution in a `try/finally` block consistent with all other examples in the post.

## Review Notes
- The Dapr Distributed Lock API is currently in Alpha status. The .NET SDK methods are decorated with `[Experimental("DAPR_DISTRIBUTEDLOCK")]`, which means using them will produce compiler warnings unless suppressed. The blog does not mention this, but it is not a code correctness issue.
- The `TryLockResponse` class implements `IAsyncDisposable`, enabling an `await using` pattern as an alternative to manual `try/finally` with explicit `Unlock()`. The blog's manual approach is valid but readers may benefit from knowing about the disposable pattern.
- All method names (`Lock`, `Unlock`), parameter types (`string storeName`, `string resourceId`, `string lockOwner`, `Int32 expiryInSeconds`), return types (`TryLockResponse` with `bool Success`), and component configuration (`lock.redis`, `v1`) were verified as correct against the current Dapr .NET SDK.
