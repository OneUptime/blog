# Validation Summary: How to Troubleshoot Missing Entity Framework Core Spans When the

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry .NET
- OpenTelemetry Entity Framework Core instrumentation
- Entity Framework Core
- DiagnosticSource
- ASP.NET Core dependency injection
- NuGet and .NET CLI

## Sources Consulted
- OpenTelemetry EntityFrameworkCore instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.EntityFrameworkCore/README.md
- OpenTelemetry EntityFrameworkCore instrumentation options source: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.EntityFrameworkCore/EntityFrameworkInstrumentationOptions.cs
- NuGet package page for OpenTelemetry.Instrumentation.EntityFrameworkCore: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.EntityFrameworkCore
- NuGet V3 package versions for OpenTelemetry.Instrumentation.EntityFrameworkCore: https://api.nuget.org/v3-flatcontainer/opentelemetry.instrumentation.entityframeworkcore/index.json
- OpenTelemetry SqlClient instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/tree/main/src/OpenTelemetry.Instrumentation.SqlClient
- Microsoft Learn EF Core diagnostic listeners documentation: https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/diagnostic-listeners
- Microsoft Learn dotnet package add command documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add

## Issues Found
- The install command omitted `--prerelease`, but the official OpenTelemetry EF Core instrumentation package is currently prerelease-only. Updated the command to `dotnet add package --prerelease OpenTelemetry.Instrumentation.EntityFrameworkCore`.
- The version compatibility snippet referenced `OpenTelemetry.Instrumentation.EntityFrameworkCore` version `1.9.0`, which is not a published package version. Updated it to the current published prerelease version, `1.15.1-beta.1`.
- The configuration example used `SetDbStatementForText` and `SetDbStatementForStoredProcedure`, which are not available on the current `EntityFrameworkInstrumentationOptions` API. Removed those properties and kept the supported `EnrichWithIDbCommand` example.
- The text implied SQL/parameter capture could be enabled through those removed options. Replaced it with the current `OTEL_DOTNET_EXPERIMENTAL_EFCORE_ENABLE_TRACE_DB_QUERY_PARAMETERS` environment-variable guidance for query parameter attributes.
- The integration test used EF Core's `UseInMemoryDatabase`, but the official instrumentation documentation says EF Core instrumentation currently supports relational databases. Updated the test to use SQLite in-memory with an open `SqliteConnection` and `EnsureCreatedAsync()`.

## Review Notes
The core troubleshooting guidance is correct: EF Core diagnostic events are exposed through `DiagnosticSource`, and OpenTelemetry requires `AddEntityFrameworkCoreInstrumentation()` to collect EF Core database spans. The package remains beta/prerelease, so future API and semantic-convention changes should be rechecked during later validations.
