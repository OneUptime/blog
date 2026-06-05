# Validation Summary: How to Migrate from Application Insights to OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- .NET / ASP.NET Core
- Azure Application Insights
- Azure Monitor OpenTelemetry Distro
- OpenTelemetry .NET SDK
- OpenTelemetry tracing, metrics, and logs
- OTLP exporter
- SqlClient, HttpClient, ASP.NET Core, and runtime instrumentation
- System.Diagnostics.ActivitySource and System.Diagnostics.Metrics

## Sources Consulted
- Microsoft Learn: Application Insights FAQ: https://learn.microsoft.com/en-us/azure/azure-monitor/app/application-insights-faq
- Microsoft Learn: Migrate from Application Insights Classic API SDKs to Azure Monitor OpenTelemetry: https://learn.microsoft.com/en-us/azure/azure-monitor/app/migrate-to-opentelemetry
- Microsoft Learn: Configure Azure Monitor OpenTelemetry: https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-configuration
- Microsoft Learn: dotnet package remove command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-remove
- Microsoft Learn: Install and manage NuGet packages with the dotnet CLI: https://learn.microsoft.com/en-us/nuget/consume-packages/install-use-packages-dotnet-cli
- OpenTelemetry .NET documentation: https://opentelemetry.io/docs/languages/dotnet/
- OpenTelemetry .NET instrumentation documentation: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET exporters documentation: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET metrics documentation: https://opentelemetry.io/docs/languages/dotnet/metrics/getting-started-aspnetcore/
- OpenTelemetry .NET metric instruments documentation: https://opentelemetry.io/docs/languages/dotnet/metrics/instruments/
- OpenTelemetry.Instrumentation.AspNetCore README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.AspNetCore/README.md
- OpenTelemetry.Instrumentation.SqlClient README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.SqlClient/README.md
- OneUptime OTLP collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post claimed the classic Application Insights SDK is in maintenance mode. Current Microsoft guidance is more nuanced: Azure Monitor OpenTelemetry Distro is recommended for new ASP.NET Core Application Insights projects, while Application Insights .NET SDK 3.x provides an OpenTelemetry-based compatibility migration path. Updated the wording accordingly.
- The post used `SqlClientInstrumentationOptions.SetDbStatementForText`, which is not part of the current `OpenTelemetry.Instrumentation.SqlClient` guidance. Removed that option and kept `RecordException = true`.
- The SQL pitfall stated that query text is not captured by default and recommended `SetDbStatementForText = true`. Updated this to warn about sensitive SQL query data and experimental query parameter capture based on current SqlClient instrumentation docs.
- The exception example used `activity?.RecordException(ex)`. Current OpenTelemetry .NET documentation shows `activity?.AddException(ex)`. Updated the snippet and added the required `using OpenTelemetry.Trace;`.
- The custom event mapping was too absolute. Updated it to clarify that Application Insights custom events can map to span events when the event belongs to a traced operation.

## Review Notes
The post is technically relevant and code-focused. I could not compile the C# snippets locally because the `dotnet` SDK is not installed in this environment, so validation was performed against current official documentation and API examples.
