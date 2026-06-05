# Validation Summary: How to Set Up OpenTelemetry Tracing in ASP.NET Core with System.Diagnostics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- ASP.NET Core
- .NET distributed tracing
- System.Diagnostics.Activity
- System.Diagnostics.ActivitySource
- HttpClient instrumentation
- OTLP exporter
- Swashbuckle/Swagger UI
- C#

## Sources Consulted
- Microsoft Learn: .NET distributed tracing concepts, https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts
- Microsoft Learn: Adding distributed tracing instrumentation, https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs
- Microsoft Learn: Controller-based ASP.NET Core Web API tutorial, https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api
- Microsoft Learn: OpenAPI support in ASP.NET Core, https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/overview
- OpenTelemetry .NET: Instrumentation documentation, https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET: Reporting exceptions, https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- OpenTelemetry .NET: Exporters documentation, https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET contrib: ASP.NET Core instrumentation README, https://github.com/open-telemetry/opentelemetry-dotnet-contrib/tree/main/src/OpenTelemetry.Instrumentation.AspNetCore
- NuGet: OpenTelemetry.Instrumentation.Http, https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http
- NuGet: OpenTelemetry.Instrumentation.SqlClient, https://www.nuget.org/packages/OpenTelemetry.Instrumentation.SqlClient
- W3C Trace Context Recommendation, https://www.w3.org/TR/trace-context/

## Issues Found
- The project creation command used `dotnet new webapi -n TracingDemo`, but the post later uses MVC controllers. Modern ASP.NET Core Web API templates default to Minimal APIs unless controller support is requested, so the command was changed to `dotnet new webapi --use-controllers -n TracingDemo`.
- The sample calls `AddSwaggerGen()`, `UseSwagger()`, and `UseSwaggerUI()`, but modern ASP.NET Core templates no longer include Swashbuckle by default. Added `dotnet add package Swashbuckle.AspNetCore` to make those calls available.
- The `OrderService` snippet calls `activity?.RecordException(ex)`, which is an OpenTelemetry extension method. Added `using OpenTelemetry.Trace;` so the snippet compiles.
- The post said ASP.NET Core, HttpClient, and SqlClient all create activities out of the box. ASP.NET Core and HttpClient participate in built-in Activity-based HTTP tracing, but SqlClient database tracing is captured through the SqlClient OpenTelemetry instrumentation package. Reworded the claim to avoid implying SqlClient is covered by the packages already shown.

## Review Notes
The remaining examples use current OpenTelemetry .NET patterns: `AddOpenTelemetry().WithTracing(...)`, `ConfigureResource(...AddService(...))`, `ActivitySource`, `AddSource(...)`, `SetSampler(new TraceIdRatioBasedSampler(...))`, ASP.NET Core and HttpClient instrumentation, and OTLP export to the default gRPC endpoint shape. The environment did not have the `dotnet` CLI installed, so validation was performed against official documentation and package references rather than by compiling the sample locally.
