# Validation Summary: How to Trace Entity Framework Core Queries with OpenTelemetry in ASP.NET Core

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server provider for EF Core
- OpenTelemetry .NET tracing and metrics
- OpenTelemetry EF Core instrumentation
- EF Core command interceptors
- Swashbuckle / Swagger UI

## Sources Consulted
- OpenTelemetry.Instrumentation.EntityFrameworkCore NuGet README: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.EntityFrameworkCore
- OpenTelemetry .NET custom instrumentation docs: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET metrics docs: https://opentelemetry.io/docs/languages/dotnet/metrics/
- OpenTelemetry .NET EF Core instrumentation source: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.EntityFrameworkCore/Implementation/EntityFrameworkDiagnosticListener.cs
- Microsoft EF Core interceptors documentation: https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/interceptors
- Microsoft IDbCommandInterceptor API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.diagnostics.idbcommandinterceptor
- Microsoft dotnet package add CLI documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Swashbuckle with ASP.NET Core documentation: https://learn.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle
- Microsoft IMeterFactory API reference: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics.imeterfactory

## Issues Found
- The EF Core OpenTelemetry instrumentation package was installed without `--prerelease`. The current package is still prerelease, so the command was updated to `dotnet add package OpenTelemetry.Instrumentation.EntityFrameworkCore --prerelease`.
- The setup used `AddSwaggerGen`, `UseSwagger`, and `UseSwaggerUI` without explicitly adding Swashbuckle. Current ASP.NET Core templates no longer reliably include Swashbuckle by default, so `dotnet add package Swashbuckle.AspNetCore` was added.
- The article claimed EF Core instrumentation captures query parameters by default. Official docs state parameter value attributes are controlled by the experimental `OTEL_DOTNET_EXPERIMENTAL_EFCORE_ENABLE_TRACE_DB_QUERY_PARAMETERS` flag and are disabled by default, so the wording was corrected.
- The enrichment example used `command.Connection?.DataSource`, but `EnrichWithIDbCommand` receives an `IDbCommand`, whose connection exposes `Database` but not `DataSource`. The tag was changed to `db.name` with `command.Connection?.Database`.
- Repository code used `Activity.RecordException` without importing the OpenTelemetry extension namespace. `using OpenTelemetry.Trace;` was added.
- Controller code returned `Order` but did not import the model namespace. `using EfCoreTracingDemo.Models;` was added.
- Custom metrics were created but the OpenTelemetry pipeline did not subscribe to the custom meter. A `.WithMetrics(...)` configuration with `.AddMeter("EfCoreTracingDemo.Database")` was added.
- The trace diagram and conclusion implied EF Core instrumentation creates transaction spans. The instrumentation source listens to EF Core database command diagnostic events, so the transaction span claims were narrowed to EF Core database commands.
- The metrics interceptor registration could be read as a second `AddDbContext` registration. The text was changed to say to update the existing DbContext registration.

## Review Notes
The local environment does not have the `dotnet` SDK available on PATH, so I could not compile the snippets in this workspace. The review was performed against official documentation, NuGet package metadata, and the OpenTelemetry EF Core instrumentation source.
