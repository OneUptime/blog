# Validation Summary: How to Handle 'Deadlock detected' Issues in C#

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C# / .NET
- async/await and the `SynchronizationContext`
- `lock` / `Monitor` and `SemaphoreSlim`
- ASP.NET (pre-Core) MVC and ASP.NET Core
- Entity Framework Core
- Microsoft SQL Server (deadlock detection / victim, error 1205)
- Polly (resilience / retry policies)

## Sources Consulted
- .NET API docs — `SemaphoreSlim`: https://learn.microsoft.com/dotnet/api/system.threading.semaphoreslim
- .NET API docs — `Monitor.TryEnter`: https://learn.microsoft.com/dotnet/api/system.threading.monitor.tryenter
- Stephen Cleary, "Don't Block on Async Code" (sync-over-async deadlock): https://blog.stephencleary.com/2012/07/dont-block-on-async-code.html
- .NET docs — `ConfigureAwait` FAQ: https://devblogs.microsoft.com/dotnet/configureawait-faq/
- C# language reference — `await` cannot be used inside a `lock` body (CS1996): https://learn.microsoft.com/dotnet/csharp/language-reference/compiler-messages/cs1996
- Microsoft.Data.SqlClient `SqlException`/`SqlError`: https://learn.microsoft.com/dotnet/api/microsoft.data.sqlclient.sqlexception
- SQL Server deadlock guide (error 1205, deadlock victim): https://learn.microsoft.com/sql/relational-databases/sql-server-deadlocks-guide
- EF Core — transactions / `BeginTransactionAsync` / `ExecuteSqlRawAsync`: https://learn.microsoft.com/ef/core/saving/transactions
- SQL Server snapshot isolation: https://learn.microsoft.com/sql/t-sql/statements/set-transaction-isolation-level-transact-sql
- Polly documentation (`Policy.Handle`, `WaitAndRetryAsync`): https://github.com/App-vNext/Polly
- .NET API docs — `Random.Shared`: https://learn.microsoft.com/dotnet/api/system.random.shared

## Issues Found
No technical issues found.

All code examples are syntactically correct and use current, non-deprecated APIs:
- The sync-over-async deadlock explanation correctly scopes the hang to environments with a `SynchronizationContext` (ASP.NET pre-Core, UI apps).
- The lock-ordering fix acquires locks in a deterministic order by `Id`, which is the canonical prevention pattern.
- The claim that `await` cannot appear inside a `lock` body is correct (compiler error CS1996); `SemaphoreSlim.WaitAsync()`/`Release()` is the correct async replacement.
- SQL Server deadlock error number `1205` and the "deadlock victim" message are accurate.
- The `DeadlockRetryPolicy` retry loop is correct: the exception filter `attempt < MaxRetries` allows the final attempt's exception to propagate, so the trailing `throw` is an unreachable guard as intended.
- Polly usage (`AsyncRetryPolicy`, `Policy.Handle<SqlException>(...)`, `WaitAndRetryAsync(retryCount, sleepDurationProvider, onRetry)`) matches a valid overload.
- EF Core APIs (`BeginTransactionAsync`, `ExecuteSqlRawAsync` with parameter placeholders, `AsNoTracking`, `IsolationLevel.Snapshot`) are used correctly.
- `Random.Shared`, `Environment.CurrentManagedThreadId`, async `Main`, and `File.ReadAllTextAsync` are all valid current APIs.

## Review Notes
- The Polly example uses the v7-style API (`Policy.Handle<>`/`WaitAndRetryAsync` returning `AsyncRetryPolicy`). This is still fully supported, but Polly v8+ also offers the newer `ResiliencePipeline`/`ResiliencePipelineBuilder` API. Not an error — just a possible future modernization.
- The Polly registration snippet references an undefined `DeadlockRetryInterceptor`; it is clearly illustrative scaffolding rather than a runnable sample.
- Snapshot isolation (`IsolationLevel.Snapshot`) requires `ALLOW_SNAPSHOT_ISOLATION` to be enabled on the database; the post presents it as a recommendation, which is reasonable, though readers should be aware of that prerequisite.
- The `SqlException` type appears in both `System.Data.SqlClient` and `Microsoft.Data.SqlClient`; the post's error message references the latter (the current recommended package), and the code is correct under either namespace.
