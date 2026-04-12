# Validation Summary: How to Use MySQL with Entity Framework Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Entity Framework Core (EF Core 7+)
- Pomelo.EntityFrameworkCore.MySql provider
- .NET / C#
- MySqlConnector (underlying ADO.NET driver used by Pomelo)

## Sources Consulted
- Microsoft EF Core providers documentation: https://learn.microsoft.com/en-us/ef/core/providers/
- Pomelo.EntityFrameworkCore.MySql GitHub repository: https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql
- Microsoft EF Core raw SQL queries documentation: https://learn.microsoft.com/en-us/ef/core/querying/sql-queries
- Microsoft EF Core ExecuteUpdate/ExecuteDelete documentation: https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete
- Microsoft RelationalDbContextOptionsBuilder API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.infrastructure.relationaldbcontextoptionsbuilder-2.commandtimeout
- MySqlConnector connection string options: https://mysqlconnector.net/connection-options/

## Issues Found
No technical issues found.

## Review Notes
- The post implicitly targets EF Core 7+ due to the use of `ExecuteUpdateAsync` and `ExecuteDeleteAsync`, which were introduced in EF Core 7.0. This is not stated explicitly but is consistent throughout.
- `CommandTimeout(60)` is called on the Pomelo-specific options builder, which inherits this method from `RelationalDbContextOptionsBuilder`. This is valid but slightly uncommon — some developers set it on the `DbContextOptionsBuilder` directly instead.
- The `CreatedAt` default value (`DateTime.UtcNow`) is set at C# object instantiation time, not as a database-level default. This is a common and correct pattern, though readers should be aware it reflects application-side time, not database server time.
- `FromSqlRaw` with `{0}` placeholders correctly parameterizes the query via `DbParameter` objects. The newer `FromSqlInterpolated` / `FromSql` (EF Core 7+) APIs are slightly more discoverable for this use case but `FromSqlRaw` remains fully supported.
