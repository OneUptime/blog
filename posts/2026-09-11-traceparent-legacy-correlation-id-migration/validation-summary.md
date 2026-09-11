# Validation Summary: Run traceparent and Legacy Correlation IDs During an OTel Migration

## Status
validated

## Post Type
Technical migration guide with package installation commands and an ASP.NET Core implementation example.

## Technologies Covered
- W3C Trace Context: `traceparent`, `tracestate`, trace IDs, parent span IDs, and sampling flags
- OpenTelemetry .NET hosting, ASP.NET Core instrumentation, HttpClient instrumentation, and OTLP export
- ASP.NET Core minimal APIs and middleware
- C# and .NET `Activity`, logging scopes, JSON console logging, and regular expressions
- HTTP and application-defined `X-Correlation-ID` propagation

## Sources Consulted
- W3C Trace Context — header format, processing, sampling, and trust considerations: https://www.w3.org/TR/trace-context/
- Microsoft .NET distributed tracing concepts — Activity identifiers, W3C defaults, and HTTP propagation: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts
- OpenTelemetry context propagation — extraction, injection, parentage, and log correlation: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry .NET ASP.NET Core tracing quickstart — hosting registration and server instrumentation: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-aspnetcore/
- OpenTelemetry HttpClient instrumentation documentation: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.Http/README.md
- OpenTelemetry OTLP exporter documentation — package, registration, and environment configuration: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md
- Microsoft .NET package installation command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft logging overview: https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview
- Microsoft ASP.NET Core logging — default Activity tracking scopes: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-10.0
- Microsoft console log formatting — JSON output and scope inclusion: https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/console-log-formatter
- Microsoft ASP.NET Core middleware — request-delegate overload and pipeline behavior: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-10.0
- Microsoft regular expression anchors — absolute start and end matching: https://learn.microsoft.com/en-us/dotnet/standard/base-types/anchors-in-regular-expressions
- Microsoft HttpClient.DefaultRequestHeaders — restrictions on modifying headers during outstanding requests: https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.defaultrequestheaders?view=net-10.0

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. Static review found the C# syntax, middleware delegate, dependency injection, request construction, cancellation token, disposal, and instrumentation registration consistent with the documented APIs and a standard web project with implicit usings enabled.
- The correlation header check accepts one value containing 1–64 ASCII letters, digits, underscores, or hyphens. Absolute regex anchors reject trailing newlines; missing, multiple, or invalid values receive a generated ID. The resulting value is stored per request and forwarded on a fresh request message.
- The application correctly treats correlation IDs and trace context as separate contracts. The stated gateway trust assumption is essential: the snippet does not authenticate the gateway or implement a public-edge trace restart policy itself.
- ASP.NET Core enables TraceId, SpanId, and ParentId logging scopes by default. JSON console output uses provider-specific names and nesting rather than automatically creating top-level `trace_id` and `span_id` fields. The post correctly tells readers to inspect emitted JSON and configure their logging integration. Its trace exporter configuration does not also export logs over OTLP.
- The log after SendAsync observes the restored server Activity, not the completed outgoing client Activity. Distinct server and client span IDs should be checked in trace telemetry or logs emitted within the corresponding operation.
- Unsampled context remains valid. Lack of exported spans does not imply invalid propagation, and a legacy intermediary may preserve headers without producing its own spans. The post appropriately says an uninstrumented service can break parentage rather than claiming that it always does.
- The package commands use the supported verb-first CLI form. .NET 10 also provides the noun-first `dotnet package add` spelling. Package versions are unpinned, so readers need a supported SDK and mutually compatible package versions.
- All four official documentation links in the post resolved to the intended resources. The localhost downstream URL is an illustrative configurable endpoint that requires a running downstream service, as does the separately configured OTLP collector.
- Validation was documentation-based and static. The local machine has only .NET SDK 6.0.200 and 6.0.201; the sample was not compiled or executed against a current supported runtime. No end-to-end collector, concurrency, malformed-header, or mixed-service-chain tests were run. These remain deployment verification steps described by the article.
