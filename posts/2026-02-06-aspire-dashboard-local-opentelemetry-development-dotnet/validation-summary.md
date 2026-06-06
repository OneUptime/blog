# Validation Summary: How to Use the Aspire Dashboard for Local OpenTelemetry Development in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET Aspire Dashboard
- Aspire CLI
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry .NET SDK
- ASP.NET Core
- Docker
- C# ActivitySource and Meter instrumentation

## Sources Consulted
- Microsoft / Aspire docs: Run the Aspire dashboard standalone: https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/standalone
- Microsoft / Aspire docs: Aspire dashboard configuration reference: https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/configuration
- Microsoft / Aspire docs: Aspire CLI overview and install guidance: https://learn.microsoft.com/en-us/dotnet/aspire/cli/install
- Microsoft / Aspire docs: `aspire dashboard run` command reference: https://aspire.dev/reference/cli/commands/aspire-dashboard-run/
- OpenTelemetry docs: .NET exporters and OTLP exporter configuration: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry docs: .NET instrumentation examples: https://opentelemetry.io/docs/languages/dotnet/instrumentation/

## Issues Found
- The post described `aspire-dashboard` as a globally installed .NET tool and used `aspire-dashboard` commands. Current official docs use the Aspire CLI and `aspire dashboard run`, so the install/run examples were updated.
- The custom frontend port example used `--urls`, but the current Aspire CLI option is `--frontend-url`. The command examples and troubleshooting text were updated.
- The authentication example used `--frontend-authmode BrowserToken`. Browser token authentication is now the default for `aspire dashboard run`; the example was replaced with `--allow-anonymous` for local-only development.
- The Docker command mapped host ports `4317` and `4318` to the same container ports. The official image exposes OTLP/gRPC on container port `18889` and OTLP/HTTP on container port `18890`, so the mapping was corrected to `-p 4317:18889 -p 4318:18890`.
- The C# sample used `OtlpExportProtocol.Grpc` without importing `OpenTelemetry.Exporter`. Added the missing `using OpenTelemetry.Exporter;`.
- The appsettings example used an `OpenTelemetry` JSON shape that the shown code did not bind. Replaced it with standard launch profile environment variables using `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`, and `OTEL_SERVICE_NAME`.
- The development launch profile used `Profiles` instead of the standard `profiles` key and omitted `OTEL_EXPORTER_OTLP_PROTOCOL`. Updated the JSON.
- The helper shell script registered its cleanup trap after `dotnet run`, so the dashboard process cleanup was not reliably active while the app ran. Moved the trap immediately after capturing the dashboard PID.
- The standalone dashboard section claimed a Resources View with health status. Official docs state Aspire resource features are disabled in standalone mode unless a resource service is configured, so the section was narrowed to resource attributes visible in telemetry details.

## Review Notes
The local environment did not have the `dotnet` CLI installed, so the C# examples could not be compiled locally. API and command validation was performed against current official Aspire and OpenTelemetry documentation instead.
