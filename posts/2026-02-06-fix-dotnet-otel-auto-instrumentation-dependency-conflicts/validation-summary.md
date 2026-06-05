# Validation Summary: How to Fix OpenTelemetry .NET Auto-Instrumentation Dependency Version Conflicts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry .NET Automatic Instrumentation
- .NET CLR profiling and startup hooks
- NuGet package dependency resolution
- System.Diagnostics.DiagnosticSource
- Grpc.Net.Client
- .NET Framework binding redirects
- .NET CLI package listing

## Sources Consulted
- OpenTelemetry .NET Automatic Instrumentation troubleshooting: https://opentelemetry.io/docs/zero-code/dotnet/troubleshooting/
- OpenTelemetry .NET Automatic Instrumentation configuration: https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation/blob/main/docs/config.md
- OpenTelemetry .NET Automatic Instrumentation design notes: https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation/blob/main/docs/design.md
- OpenTelemetry .NET Automatic Instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation
- OpenTelemetry .NET available instrumentations: https://opentelemetry.io/docs/zero-code/dotnet/instrumentations/
- Microsoft .NET CLI package list documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-list
- Microsoft .NET runtime configuration documentation: https://learn.microsoft.com/en-us/dotnet/core/runtime-config/
- NuGet package page for OpenTelemetry.Instrumentation.GrpcNetClient: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.GrpcNetClient

## Issues Found
- The article described assembly resolution as if the .NET runtime simply chooses between the agent and application assemblies in all cases. Updated the explanation to distinguish standalone profiler deployments, startup hook isolation, and NuGet package deployments based on the official OpenTelemetry design notes.
- The gRPC example claimed a specific bundled `Grpc.Net.Client` version. Reworded it to describe a supported-version or resolved-version mismatch instead of asserting a fixed bundled version.
- The diagnostic command used `$OTEL_DOTNET_AUTO_HOME/lib/net8.0/`, which is not the documented installation layout. Replaced it with a `find` command that works against the documented installation directory.
- The package pinning example used an outdated `System.Diagnostics.DiagnosticSource` version. Updated it to the version currently documented by the OpenTelemetry .NET Automatic Instrumentation README and added the official recommendation to use `OpenTelemetry.AutoInstrumentation` or conflicting packages to align dependency resolution.
- The .NET 6+ section used `System.Runtime.Loader.UseRidGraph` in `runtimeconfig.template.json`, which does not force binding redirects or solve OpenTelemetry assembly conflicts. Replaced it with the documented `OTEL_DOTNET_AUTO_REDIRECT_ENABLED` setting.
- The instrumentation-disable environment variables used a non-existent `*_DISABLED_INSTRUMENTATIONS` pattern. Replaced them with the documented `OTEL_DOTNET_AUTO_TRACES_GRPCNETCLIENT_INSTRUMENTATION_ENABLED=false` setting.

## Review Notes
The manual instrumentation snippets are syntactically plausible but require the relevant OpenTelemetry instrumentation NuGet packages and `using` directives in the consuming application. The `dotnet list package --include-transitive` command remains valid for .NET 9 SDK and earlier; Microsoft documents `dotnet package list --include-transitive` as the .NET 10 noun-first equivalent.
