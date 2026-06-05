# Validation Summary: How to Use the JetBrains Rider OpenTelemetry Plugin for In-IDE Trace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JetBrains Rider OpenTelemetry plugin
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry .NET SDK
- ASP.NET Core
- .NET `ActivitySource`
- NuGet and `dotnet add package`

## Sources Consulted
- JetBrains Rider OpenTelemetry documentation: https://www.jetbrains.com/help/rider/OpenTelemetry.html
- OpenTelemetry .NET exporters documentation: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET instrumentation documentation: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET OTLP exporter README: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md
- Microsoft `ActivitySource.StartActivity` API documentation: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity

## Issues Found
- The post described a bottom "OpenTelemetry" tool window after installation. Current Rider documentation says the plugin adds an OpenTelemetry service in the Services window, so the UI references were updated.
- The .NET sample hard-coded HTTP/protobuf endpoints on `http://localhost:4318/v1/traces` and `/v1/metrics`. Those are valid OTLP HTTP paths in general, but Rider's direct integration is documented as an OTLP gRPC service with a random or configured port, and Rider can inject `OTEL_EXPORTER_OTLP_ENDPOINT` for IDE-launched .NET apps. The sample now uses `.AddOtlpExporter()` without hard-coded endpoints.
- The sample injected `HttpClient` directly into a minimal API handler without registering HTTP client services. It now registers `builder.Services.AddHttpClient()` and injects `IHttpClientFactory`.
- The metrics explanation implied runtime metrics were automatically available from the shown setup. It now describes metrics emitted by configured instrumentation and meters, and the sample adds the ASP.NET Core hosting and Kestrel meters used by Rider's official manual instrumentation example.
- The post claimed auto-instrumentation covers database calls. The shown packages cover ASP.NET Core and outgoing HTTP instrumentation, so the text was narrowed to incoming and outgoing HTTP calls.
- The debugging section implied Rider shows an active in-progress span at a breakpoint. Since spans are exported after they are emitted, the text now says to inspect completed spans after the request completes and exports.
- The filtering and navigation section claimed filtering by service/span/status and double-click navigation from span attributes. Current Rider documentation describes trace filtering by time, duration, or ID, and Navigate To Code for log entries with the required original message template attribute. The section was corrected accordingly.

## Review Notes
The post is technically relevant and valid after corrections. The `dotnet` CLI is not installed in this review environment, so CLI/package syntax was checked against official documentation rather than local `dotnet --help` output.
