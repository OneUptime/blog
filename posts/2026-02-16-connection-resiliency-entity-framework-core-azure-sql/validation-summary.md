# Validation Summary: How to Use Connection Resiliency with Entity Framework Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Entity Framework Core
- EF Core SQL Server provider
- Azure SQL Database
- Microsoft.Data.SqlClient
- ASP.NET Core / .NET 8
- SQL retry and transaction resiliency patterns

## Sources Consulted
- Microsoft Learn: EF Core connection resiliency and database retries - https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency
- Microsoft Learn: SqlEngineDbContextOptionsBuilder.EnableRetryOnFailure API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.infrastructure.sqlenginedbcontextoptionsbuilder.enableretryonfailure
- Microsoft Learn: SqlServerRetryingExecutionStrategy API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.sqlserverretryingexecutionstrategy
- Microsoft Learn: Microsoft.Data.SqlClient SqlConnectionStringBuilder.ConnectRetryInterval API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnectionstringbuilder.connectretryinterval
- Microsoft Learn: EF Core DbCommandInterceptor.CommandFailed API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.diagnostics.dbcommandinterceptor.commandfailed
- Microsoft Learn: Troubleshoot transient connection errors in Azure SQL Database and SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/database/troubleshoot-common-connectivity-issues

## Issues Found
- The explicit transaction example reused a single injected DbContext across possible retry attempts. EF Core's official pattern replays the delegate and creates a fresh context inside the retry block, so the sample was updated to use `IDbContextFactory<AppDbContext>` and create a new context for each attempt.
- The transaction section did not mention EF Core's documented unknown-commit-state caveat. Added a short warning that operations using store-generated keys should be idempotent or verify success before retrying potentially duplicated writes.
- The `SqlConnectionStringBuilder` snippet omitted the `Microsoft.Data.SqlClient` namespace and described `ConnectRetryCount` / `ConnectRetryInterval` as generic ADO.NET retries. Added the namespace and corrected the wording to SqlClient connection resiliency.
- The circuit breaker counted every exception as a database outage, including business validation errors. Updated it to count only timeout errors and selected Azure SQL transient SqlException numbers.
- The monitoring snippet used `DbCommand` without importing `System.Data.Common`. Added the missing namespace.
- The monitoring section claimed the interceptor logged retry events directly. Adjusted the wording to say it logs failed commands alongside EF Core execution-strategy logs.

## Review Notes
The core EF Core `EnableRetryOnFailure` configuration, custom `SqlServerRetryingExecutionStrategy` API usage, `CreateExecutionStrategy` transaction guidance, and `DbCommandInterceptor.CommandFailed` signature are current and technically valid. Future improvements could show how to register `AddDbContextFactory` in the startup snippet and how to wire EF Core logging filters for `ExecutionStrategyRetrying`, but those are enhancements rather than required corrections.
