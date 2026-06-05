# Validation Summary: How to Use OpenTelemetry with .NET Aspire for Cloud-Native Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET Aspire
- OpenTelemetry
- ASP.NET Core
- Aspire Service Defaults
- Aspire Dashboard
- Aspire PostgreSQL, Redis, and RabbitMQ integrations
- .NET metrics, tracing, and structured logging
- Aspire deployment tooling

## Sources Consulted
- Aspire C# Service Defaults documentation: https://aspire.dev/get-started/csharp-service-defaults/
- Aspire Telemetry documentation: https://aspire.dev/fundamentals/telemetry/
- Aspire Dashboard overview: https://aspire.dev/dashboard/overview/
- Aspire Dashboard configuration: https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/configuration
- Aspire Health checks documentation: https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/health-checks
- Aspire Service discovery documentation: https://learn.microsoft.com/en-us/dotnet/aspire/service-discovery/overview
- Aspire PostgreSQL integration documentation: https://learn.microsoft.com/dotnet/aspire/database/postgresql-component
- Aspire PostgreSQL Entity Framework Core integration documentation: https://learn.microsoft.com/en-us/dotnet/aspire/database/postgresql-entity-framework-integration
- Aspire Redis distributed caching integration documentation: https://learn.microsoft.com/en-us/dotnet/aspire/caching/azure-cache-for-redis-distributed-caching-integration
- Aspire RabbitMQ integration documentation: https://learn.microsoft.com/en-us/dotnet/aspire/messaging/rabbitmq-integration
- Aspire legacy deployment manifest documentation: https://aspire.dev/deployment/azure/manifest-format/
- .NET IMeterFactory API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics.imeterfactory
- .NET metrics instrumentation documentation: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation

## Issues Found
- The post said the AppHost includes OpenTelemetry configuration by default. Updated this to state that the Service Defaults project contains the service OpenTelemetry configuration, while the AppHost starts the dashboard and injects OTLP environment variables.
- The AppHost section implied services automatically export directly by AppHost configuration. Updated this to match Aspire's Service Defaults behavior: exporters are enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` is present.
- The typed `HttpClient` example added `AddStandardResilienceHandler()` after `AddServiceDefaults()`, even though Service Defaults configures standard resilience for HTTP clients. Removed the duplicate call.
- Custom `ActivitySource` used a hard-coded name that Service Defaults would not collect unless the template was customized. Changed it to use `builder.Environment.ApplicationName`, which matches the source registered by Service Defaults.
- The raw Npgsql repository example used `NpgsqlDataSource` without showing the needed Aspire client registration and returned `null` from a non-nullable `Task<Product>`. Added the required `AddNpgsqlDataSource` registration note and changed the return type to `Task<Product?>`.
- The tracing section attributed trace propagation to service discovery. Updated it to distinguish service discovery endpoint resolution from OpenTelemetry HTTP trace-context propagation.
- The RabbitMQ/message example implied Aspire automatically propagates context through custom messaging abstractions. Updated comments to make explicit that the application's messaging abstraction must carry and extract trace context in message metadata.
- The dashboard URL used `http://localhost:15888`, which does not match current documented defaults. Updated the text to use the console-provided URL and mention the standalone dashboard default of `http://localhost:18888`.
- The production OpenTelemetry sample used unsupported AppHost-level `OpenTelemetryOptions`, `OtlpEndpoint`, and `TraceSampler` configuration. Replaced it with current environment-variable based OTLP and sampling configuration on the project resource.
- The deployment manifest command and explanation were outdated. Updated the text to prefer current `aspire deploy` / `aspire publish` guidance and show the current legacy manifest command for troubleshooting older Azure Developer CLI workflows.
- The health-check example listed `/ready`, but Aspire Service Defaults maps `/health` and `/alive`. Updated the comment and noted that default endpoint mapping is Development-only.

## Review Notes
The local environment did not have the `dotnet` CLI installed, so CLI commands could not be verified with local `--help` output. They were checked against current official Aspire documentation instead. Several snippets remain illustrative and depend on application-specific types such as `Product`, `Order`, `IMessagePublisher`, and `IMessageConsumer`.
