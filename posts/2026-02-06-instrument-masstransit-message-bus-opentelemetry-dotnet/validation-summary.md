# Validation Summary: How to Instrument MassTransit Message Bus with OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- .NET / ASP.NET Core
- MassTransit
- RabbitMQ transport for MassTransit
- OpenTelemetry .NET tracing
- OTLP exporter
- MassTransit consumers, sagas, request/response, and retry middleware

## Sources Consulted
- MassTransit monitoring and observability documentation: https://masstransit.io/documentation/configuration/observability
- MassTransit bus and endpoint configuration documentation: https://masstransit.io/documentation/configuration
- MassTransit exceptions, retry, redelivery, outbox, and faults documentation: https://masstransit.io/documentation/concepts/exceptions
- MassTransit request/response documentation: https://masstransit.io/documentation/concepts/requests
- MassTransit upstream source for `DiagnosticHeaders.DefaultListenerName`, retry configurator, retry context, and request timeout APIs: https://github.com/MassTransit/MassTransit
- OpenTelemetry .NET instrumentation documentation: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET exporter documentation: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET exception reporting documentation: https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/

## Issues Found
- The setup used `.AddHttpClientInstrumentation()` but did not include the required `OpenTelemetry.Instrumentation.Http` package. Added the missing `dotnet add package OpenTelemetry.Instrumentation.Http` command.
- The OpenTelemetry setup registered only MassTransit's ActivitySource, so the custom `OrderService` and `PaymentService` activities shown later would not be exported. Added `.AddSource("OrderService", "PaymentService")`.
- The MassTransit ActivitySource was registered with a hard-coded `"MassTransit"` string. Replaced it with `DiagnosticHeaders.DefaultListenerName`, matching official MassTransit documentation and source.
- The initial MassTransit setup mixed explicit receive endpoints with `cfg.ConfigureEndpoints(context)` and described `ConfigureEndpoints` as enabling OpenTelemetry. Simplified the sample to use `ConfigureEndpoints` for registered consumers and corrected the comment.
- The controller's custom `CreateOrder` span used `ActivityKind.Producer`, even though the actual producer span is created by MassTransit during publish. Changed it to `ActivityKind.Internal`.
- The retry sample used `r.OnRetry(...)`, which is not part of the current `IRetryConfigurator` API. Replaced it with supported retry configuration plus a consumer-side `context.GetRetryAttempt()` / `context.GetRetryCount()` example.
- The performance snippet still used `.AddSource("MassTransit")`. Updated it to `DiagnosticHeaders.DefaultListenerName`.
- The conclusion claimed every message appears in traces, which conflicts with the preceding 10% sampling example. Updated the wording to clarify that sampling exports only sampled traces.

## Review Notes
The local environment does not have the .NET SDK installed, so compile verification could not be performed with `dotnet build`. API-level validation was performed against official documentation and the upstream MassTransit source. The examples are still illustrative snippets rather than a complete runnable application because some referenced services and consumers, such as `PaymentProcessedConsumer`, are not fully defined in the post.
