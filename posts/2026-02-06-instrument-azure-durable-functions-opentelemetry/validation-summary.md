# Validation Summary: How to Instrument Azure Durable Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Durable Functions
- Durable Task SDK / Durable Task Scheduler
- Azure Functions .NET isolated worker
- OpenTelemetry for .NET
- OTLP exporter
- C# ActivitySource and Activity

## Sources Consulted
- Microsoft Learn: Orchestrator function code constraints, https://learn.microsoft.com/en-us/azure/durable-task/common/durable-task-code-constraints
- Microsoft Learn: Durable Functions diagnostics and distributed tracing, https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/durable-functions-diagnostics
- Microsoft Learn: OpenTelemetry distributed tracing with Durable Task Scheduler, https://learn.microsoft.com/en-us/azure/durable-task/sdks/durable-task-scheduler-opentelemetry-tracing
- Microsoft Learn: .NET isolated worker process guide, https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Microsoft Learn: Durable Functions isolated worker API mapping, https://learn.microsoft.com/en-us/azure/durable-task/durable-functions/durable-functions-isolated-api-mapping
- Microsoft Learn: Durable Functions programming model overview, https://learn.microsoft.com/en-us/azure/azure-functions/durable/programming-model-overview
- OpenTelemetry .NET instrumentation docs, https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET exporters docs, https://opentelemetry.io/docs/languages/dotnet/exporters/
- NuGet Gallery: OpenTelemetry, OpenTelemetry.Extensions.Hosting, OpenTelemetry.Exporter.OpenTelemetryProtocol, OpenTelemetry.Instrumentation.Http, and Microsoft.Azure.Functions.Worker.OpenTelemetry package pages

## Issues Found
- The setup registered only a custom `DurableFunctions.Orchestrations` source, which would not capture workflow spans emitted by the Durable Task SDK. Added `AddSource("Microsoft.DurableTask")` and clarified that SDK workflow spans provide the full orchestration/activity/sub-orchestration/timer trace.
- The post did not include Durable Functions distributed tracing configuration. Added the required `host.json` `durableTask.tracing` configuration with distributed tracing enabled and version `V2`.
- The Azure Functions OpenTelemetry setup was missing isolated worker defaults. Added `Microsoft.Azure.Functions.Worker.OpenTelemetry` and `.UseFunctionsWorkerDefaults()`.
- The OTLP exporter defaulted to `http://localhost:4318` without setting HTTP/protobuf. Changed the example to use the .NET OTLP gRPC default port `4317` and set `OtlpExportProtocol.Grpc`.
- NuGet package versions were outdated. Updated OpenTelemetry package references to current stable versions verified on NuGet as of 2026-06-05.
- The orchestrator example implied a custom span could safely cover the whole orchestration across durable awaits. Reworked the example to use short replay-aware custom spans and clarified that the Durable Task SDK provides the long-lived workflow spans.
- The post said activity functions run exactly once. Corrected this to Durable Task's at-least-once execution semantics and noted that activity logic should be idempotent.
- The custom context propagation section incorrectly implied workflow trace context is not automatically propagated. Updated it to apply only to additional custom spans that need explicit custom parent-child relationships.
- The sub-orchestration and long-running orchestration sections implied manual custom spans were responsible for workflow nesting and long-running trace shape. Updated them to distinguish Durable Task workflow spans from supplemental custom business spans.
- The activity example used `RecordException` without importing the OpenTelemetry tracing extension namespace. Added `using OpenTelemetry.Trace;`.

## Review Notes
The examples are still illustrative and include placeholder application types and services such as `OrderResult`, `PaymentResult`, `shippingService`, and `paymentGateway`. A future improvement would be to provide a complete runnable sample project, but the technical guidance and API usage in the post are now aligned with official documentation.
