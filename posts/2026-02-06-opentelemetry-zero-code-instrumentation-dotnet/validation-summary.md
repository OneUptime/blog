# Validation Summary: How to Use OpenTelemetry Zero-Code Instrumentation for .NET Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry .NET Automatic Instrumentation
- .NET and .NET Framework
- CLR Profiling API
- ASP.NET Core
- HttpClient
- SQL Client
- Entity Framework Core
- Docker and Docker Compose
- Kubernetes and OpenTelemetry Operator
- OTLP exporters

## Sources Consulted
- OpenTelemetry .NET zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/dotnet/
- OpenTelemetry .NET auto-instrumentation configuration documentation: https://opentelemetry.io/docs/zero-code/dotnet/configuration/
- OpenTelemetry .NET available instrumentations documentation: https://opentelemetry.io/docs/zero-code/dotnet/instrumentations/
- OpenTelemetry .NET troubleshooting documentation: https://opentelemetry.io/docs/zero-code/dotnet/troubleshooting/
- OpenTelemetry Kubernetes Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry .NET Automatic Instrumentation GitHub repository: https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation
- OpenTelemetry Operator auto-instrumentation image package reference: https://github.com/orgs/open-telemetry/packages/container/package/opentelemetry-operator%2Fautoinstrumentation-dotnet
- Microsoft SQL Server Linux container environment variable documentation: https://learn.microsoft.com/sql/linux/sql-server-linux-configure-environment-variables

## Issues Found
- Corrected the architecture explanation so it no longer implies all .NET auto-instrumentation is profiler bytecode rewriting. Current documentation describes SDK injection plus supported source and bytecode instrumentations.
- Replaced the Windows `otel-dotnet-auto-install.ps1` install flow with the supported `OpenTelemetry.DotNet.Auto.psm1` PowerShell module flow.
- Corrected the Windows default installation path and profiler environment variable from `CORECLR_PROFILER_PATH` to the bitness-specific `CORECLR_PROFILER_PATH_64`.
- Removed the example `OTEL_DOTNET_AUTO_PLUGINS` value because the documented variable expects colon-separated assembly-qualified plugin type names, and the sample was not needed for standard zero-code instrumentation.
- Updated OTLP examples from gRPC on port 4317 to `http/protobuf` on port 4318 to match the current default zero-code path and avoid requiring `Grpc.Net.Client` in the application.
- Replaced unsupported instrumentation option variable names with the documented SQL Client and Entity Framework Core `SET_DBSTATEMENT_FOR_TEXT` variables.
- Replaced the unsupported JSON configuration file and `OTEL_DOTNET_AUTO_CONFIG_FILE` example with the documented `App.config` / `Web.config` option for .NET Framework `OTEL_*` settings.
- Replaced the Kubernetes hand-written init container example with the documented OpenTelemetry Operator `Instrumentation` CR and `instrumentation.opentelemetry.io/inject-dotnet` annotation pattern.
- Replaced unsupported profiler log variables in troubleshooting with the documented `COREHOST_TRACE` and `COREHOST_TRACEFILE` host tracing variables.
- Updated the SQL Server container example from deprecated `SA_PASSWORD` to `MSSQL_SA_PASSWORD`.

## Review Notes
- The Docker example remains a manually managed installation pattern. The official docs also recommend NuGet-based deployment where applicable and the Kubernetes Operator for Kubernetes workloads.
- Several OpenTelemetry .NET auto-instrumentation settings are marked experimental in the official docs, so environment variable names may change in future releases.
