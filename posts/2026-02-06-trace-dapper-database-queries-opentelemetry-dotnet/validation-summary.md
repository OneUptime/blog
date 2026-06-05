# Validation Summary: How to Trace Dapper Database Queries with OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry .NET
- Dapper
- .NET / C#
- Microsoft.Data.SqlClient
- SQL Server
- OTLP exporter
- OpenTelemetry tracing and metrics

## Sources Consulted
- OpenTelemetry .NET SDK tracing customization docs: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry.Instrumentation.AspNetCore package documentation: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.AspNetCore/
- OpenTelemetry.Instrumentation.Http package documentation: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http
- Dapper async API source: https://raw.githubusercontent.com/DapperLib/Dapper/main/Dapper/SqlMapper.Async.cs
- Microsoft.Data.SqlClient documentation: https://learn.microsoft.com/en-us/sql/connect/ado-net/introduction-microsoft-data-sqlclient-namespace
- System.Data.SqlClient deprecation announcement: https://techcommunity.microsoft.com/blog/sqlserver/announcement-system-data-sqlclient-package-is-now-deprecated/4227205
- .NET CLI package add documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add

## Issues Found
- The setup snippet used `AddAspNetCoreInstrumentation()` and `AddHttpClientInstrumentation()` but did not install their packages. Added `OpenTelemetry.Instrumentation.AspNetCore` and `OpenTelemetry.Instrumentation.Http`.
- The setup and repository snippets used `System.Data.SqlClient`, whose NuGet package is deprecated for modern .NET use. Replaced it with `Microsoft.Data.SqlClient`.
- The wrapper called Dapper extension methods with the same names as the instrumented extension methods. Changed internal calls to `SqlMapper.*` to make delegation to Dapper explicit.
- Several span attributes used older database semantic convention names such as `db.statement`, `db.system`, `db.operation`, and `db.name`. Updated them to current names such as `db.query.text`, `db.system.name`, `db.operation.name`, and `db.namespace`.
- Error attributes used non-current `db.error` / `db.error.type` tags or omitted the current error tag. Updated exception paths to set `error.type`.
- The bulk operations section described Dapper as supporting bulk operations, but the sample is repeated execution over a parameter sequence rather than a provider-specific bulk insert API. Reworded the section as batch-style execution.
- The transaction sample began an `IDbTransaction` but did not pass it to the Dapper calls, so the updates would not run inside that transaction. Exposed the transaction from the wrapper and passed it to both calls.
- The transaction sample created a new `ActivitySource` per transaction instance. Changed it to a static `ActivitySource`, matching OpenTelemetry .NET guidance.

## Review Notes
The local environment does not have the `dotnet` CLI installed, so I could not compile the snippets in this workspace. The code was reviewed against official documentation and Dapper source. Some attributes in the samples remain intentionally custom, such as query duration and result count; future improvements could mention that `db.query.text` should be sanitized for non-parameterized SQL before enabling it broadly.
