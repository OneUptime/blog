# Validation Summary: How to Implement Distributed Tracing in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- ASP.NET Core
- OpenTelemetry .NET SDK
- System.Diagnostics Activity and ActivitySource
- OpenTelemetry context propagation and baggage
- OpenTelemetry OTLP exporter
- OpenTelemetry SqlClient instrumentation
- RabbitMQ .NET client
- Serilog log correlation

## Sources Consulted
- Microsoft Learn: .NET distributed tracing: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing
- Microsoft Learn: Add distributed tracing instrumentation in .NET: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs
- OpenTelemetry .NET SDK customization docs: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry .NET SDK extension docs: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/extending-the-sdk/README.md
- OpenTelemetry .NET sampling docs: https://opentelemetry.io/docs/languages/dotnet/sampling/
- OpenTelemetry .NET exception reporting docs: https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- OpenTelemetry .NET exporters docs: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry context propagation docs: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry SqlClient instrumentation README: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.SqlClient/README.md
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- RabbitMQ .NET/C# client API guide: https://www.rabbitmq.com/client-libraries/dotnet-api-guide
- RabbitMQ .NET client v7 migration guide: https://github.com/rabbitmq/rabbitmq-dotnet-client/blob/main/v7-MIGRATION.md
- RabbitMQ .NET client API reference for BasicProperties and IChannel: https://rabbitmq.github.io/rabbitmq-dotnet-client/api/RabbitMQ.Client.BasicProperties.html and https://rabbitmq.github.io/rabbitmq-dotnet-client/api/RabbitMQ.Client.IChannel.html

## Issues Found
- The post description claimed coverage of gRPC context propagation, but the article only covers HTTP and message queues. Removed the gRPC reference from the description.
- The SqlClient instrumentation example used `SetDbStatementForText`, which has been removed from current OpenTelemetry SqlClient instrumentation. Removed that option and kept the valid `RecordException` option.
- The custom RabbitMQ `ActivitySource` was not registered with `.AddSource(...)`, so RabbitMQ producer and consumer spans would not be collected. Added `.AddSource("Messaging.RabbitMQ")`.
- The message queue section broadly stated that there is no built-in support. Narrowed the statement to queue clients that are used without an OpenTelemetry instrumentation package.
- The RabbitMQ example used older synchronous RabbitMQ.Client APIs such as `CreateModel`, `CreateBasicProperties`, and `BasicPublish`. Updated the example to RabbitMQ.Client 7 style APIs: `CreateChannelAsync`, `BasicProperties`, and `BasicPublishAsync`.
- The message queue propagation example manually wrote only `traceparent` and `tracestate`. Replaced it with `Propagators.DefaultTextMapPropagator.Inject` and `Extract` so trace context and baggage propagation follow the OpenTelemetry propagator API.
- The sampling example called `.SetSampler(...)` twice in the same builder chain, which means the second sampler would replace the first. Updated the example to show one active sampler and clarified how to replace it with a custom sampler.
- The custom sampler attempted to "always sample errors" based on tags available at span creation time. That is not reliable for head-based sampling because exception/error status is usually known after the sampling decision. Removed that logic and kept a deterministic trace-ID-based example.

## Review Notes
The local environment did not have the .NET SDK installed, so the snippets were reviewed against official API documentation rather than compiled locally.
