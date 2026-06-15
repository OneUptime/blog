# Validation Summary: How to Implement Correlation ID Tracing in ASP.NET Core

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ASP.NET Core middleware
- .NET dependency injection
- IHttpClientFactory and DelegatingHandler
- Serilog structured logging and LogContext
- RabbitMQ .NET client
- Background tasks and AsyncLocal
- OpenTelemetry .NET tracing
- xUnit and ASP.NET Core integration testing

## Sources Consulted
- Microsoft Learn: Write custom ASP.NET Core middleware - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/write
- Microsoft Learn: Make HTTP requests with IHttpClientFactory in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests
- Microsoft Learn: HttpResponse.OnStarting API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.httpresponse.onstarting
- Microsoft Learn: ASP.NET Core best practices for response headers and OnStarting - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices
- Serilog.AspNetCore README - https://github.com/serilog/serilog-aspnetcore
- Serilog enrichment and LogContext documentation - https://github.com/serilog/serilog/wiki/Enrichment
- OpenTelemetry ASP.NET Core instrumentation documentation - https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.AspNetCore/README.md
- OpenTelemetry OTLP exporter documentation - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Exporter.OpenTelemetryProtocol/README.md
- RabbitMQ .NET/C# client API guide - https://www.rabbitmq.com/client-libraries/dotnet-api-guide
- RabbitMQ .NET client v7 migration guide - https://github.com/rabbitmq/rabbitmq-dotnet-client/blob/main/v7-MIGRATION.md

## Issues Found
- The HttpClient delegating handler injected the scoped `ICorrelationIdAccessor`. `IHttpClientFactory` creates a separate DI scope for handlers, so request-scoped state can be stale or unavailable. Changed the handler to read the current request correlation ID through `IHttpContextAccessor` and registered `AddHttpContextAccessor()` plus the handler as transient.
- The RabbitMQ examples used pre-v7 synchronous APIs such as `IModel`, `CreateModel()`, `CreateBasicProperties()`, `EventingBasicConsumer`, `BasicPublish`, `BasicAck`, and `BasicNack`. Updated them to the current RabbitMQ .NET client v7 async API: `IChannel`, `CreateChannelAsync()`, `BasicProperties`, `AsyncEventingBasicConsumer`, `BasicPublishAsync`, `BasicAckAsync`, `BasicNackAsync`, and `BasicConsumeAsync`.
- The RabbitMQ publisher method used a synchronous `void` signature, which is incompatible with the current async client calls. Changed it to `PublishAsync<T>` returning `Task`.
- The middleware unit test asserted the response header immediately after invoking middleware, but the header is added in an `OnStarting` callback. Added `context.Response.StartAsync()` before asserting the response header.

## Review Notes
The examples are intentionally illustrative and omit surrounding `using` statements, package references, and sample interface definitions. The OpenTelemetry section is technically valid, but future revisions could mention that W3C trace context (`traceparent`) is the standard cross-service tracing mechanism and correlation IDs are an additional application-level convention.
