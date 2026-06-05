# Validation Summary: Troubleshoot ASP.NET Core Minimal API Routes Not Producing OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ASP.NET Core Minimal APIs
- OpenTelemetry .NET SDK
- OpenTelemetry ASP.NET Core instrumentation
- OpenTelemetry HTTP client instrumentation
- .NET `Activity` and `ActivitySource`
- .NET CLI / NuGet package installation

## Sources Consulted
- OpenTelemetry .NET ASP.NET Core traces getting started: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-aspnetcore/
- OpenTelemetry.Instrumentation.AspNetCore NuGet package and README: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.AspNetCore
- OpenTelemetry.Exporter.InMemory NuGet package: https://www.nuget.org/packages/OpenTelemetry.Exporter.InMemory
- OpenTelemetry .NET repository README: https://github.com/open-telemetry/opentelemetry-dotnet
- Microsoft Learn, `dotnet package add` / `dotnet add package` command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn, install and manage NuGet packages with the dotnet CLI: https://learn.microsoft.com/en-us/nuget/consume-packages/install-use-packages-dotnet-cli

## Issues Found
- The package update command claimed to install the latest ASP.NET Core instrumentation library while pinning `OpenTelemetry.Instrumentation.AspNetCore` to `1.9.0`. That version is no longer the latest stable release. Changed the command to `dotnet add package OpenTelemetry.Instrumentation.AspNetCore`, which follows the official CLI behavior of installing the latest available package version unless a version is specified.

## Review Notes
The core guidance is correct: ASP.NET Core server spans require enabling ASP.NET Core instrumentation with `AddAspNetCoreInstrumentation()`, and custom `ActivitySource` spans require registering the source with `.AddSource("MyApp")`. The in-memory exporter example is appropriate for tests, but it assumes the test project references `OpenTelemetry.Exporter.InMemory` and that a local ASP.NET Core server can bind to the configured URL.
