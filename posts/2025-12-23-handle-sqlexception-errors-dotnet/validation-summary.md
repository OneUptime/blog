# Validation Summary: How to Handle SqlException Errors in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET / C#
- Microsoft SQL Server
- ADO.NET (`SqlConnection`, `SqlCommand`, `SqlException`, `SqlError`)
- Entity Framework Core (`DbUpdateException`, `DbContext.SaveChangesAsync`)
- Exception handling and retry/backoff patterns

## Sources Consulted
- Microsoft Learn — Database Engine error severities and system error messages (`sys.messages`) for SQL Server error numbers (2627, 2601, 547, 515, 8115, 8152, 1205, 53, 18456, 4060, 229, 208)
  - https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/database-engine-events-and-errors
- Microsoft Learn — `SqlException` Class (properties: `Number`, `State`, `Class`, `Server`, `Procedure`, `LineNumber`, `Errors`)
  - https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlexception
- Microsoft Learn — `SqlError` Class
  - https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlerror
- EF Core `SqlServerTransientExceptionDetector` (transient error number set: 49920, 49919, 49918, 41839, 41325, 41305, 41302, 41301, 40613, 40501, 40197, 10936, 10929, 10928, 10060, 10054, 10053, 1205, 233, 121, 64, 20, -2)
  - https://github.com/dotnet/efcore
- Microsoft Learn — `DbUpdateException` Class
  - https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.dbupdateexception

## Issues Found
No technical issues found.

All SQL Server error numbers cited in the prose, code, and summary table are correct:
- 2627 (PRIMARY KEY/UNIQUE constraint violation), 2601 (duplicate key with unique index), 547 (FK/constraint conflict), 515 (cannot insert NULL), 8115 (arithmetic overflow), 8152 (string/binary truncation), 1205 (deadlock victim), -2 (client-side command timeout), 53 (server not found/network), 18456 (login failed), 4060 (cannot open database), 229 (permission denied), 208 (invalid object name).

The transient error list aligns with the well-known transient set (including 49918/49919/49920, 1205, 1222, 121, 53). The retry loop correctly lets the exception propagate once `retryCount` reaches `maxRetries` (the `when` filter no longer matches).

C# is syntactically valid: `await using` is supported because `SqlConnection`, `SqlCommand`, and `DbDataReader` implement `IAsyncDisposable`; switch expressions and exception filters (`when`) are used correctly; `throw ex` is valid as a throw expression inside a switch arm; and `DbUpdateException.InnerException is SqlException` is the correct EF Core pattern for unwrapping provider exceptions.

## Review Notes
- The snippets reference fields such as `_logger` without declaring them in every class (e.g., `SqlErrorHandler`, `SqlRetryPolicy`). These are illustrative excerpts rather than compile-ready files, which is consistent with the post's tutorial style and not a technical error.
- `_ => throw ex` re-throws but resets the exception stack trace; `throw;` would preserve it, but a bare `throw;` statement is not valid inside a switch expression arm, so `throw ex` is the pragmatic choice here. A future improvement could use `ExceptionDispatchInfo.Throw(ex)` to preserve the original stack trace.
- The post does not specify whether types come from `System.Data.SqlClient` or `Microsoft.Data.SqlClient`. Both expose the same API surface used here; `Microsoft.Data.SqlClient` is the currently recommended package for new development.
- `(int)await command.ExecuteScalarAsync()` assumes a non-null scalar result; for an `OUTPUT INSERTED.Id` insert this is safe, but defensive null-checking could be noted for general use.
