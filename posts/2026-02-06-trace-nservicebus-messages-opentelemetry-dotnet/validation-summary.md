# Validation Summary: How to Trace NServiceBus Messages with OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NServiceBus
- NServiceBus.RabbitMQ
- OpenTelemetry for .NET
- ASP.NET Core
- .NET Generic Host
- RabbitMQ
- Distributed tracing

## Sources Consulted
- NServiceBus OpenTelemetry documentation: https://docs.particular.net/nservicebus/operations/opentelemetry
- NServiceBus OpenTelemetry documentation for version 8: https://docs.particular.net/nservicebus/operations/opentelemetry?version=core_8
- NServiceBus OpenTelemetry customization sample: https://docs.particular.net/samples/open-telemetry/customizing/
- NServiceBus hosting with Microsoft.Extensions.Hosting: https://docs.particular.net/nservicebus/hosting/core-hosting
- NServiceBus.Extensions.Hosting deprecation guidance: https://docs.particular.net/nservicebus/hosting/extensions-hosting
- NServiceBus recoverability error notifications: https://docs.particular.net/nservicebus/recoverability/subscribing-to-error-notifications
- NServiceBus message headers: https://docs.particular.net/nservicebus/messaging/headers
- NServiceBus RabbitMQ transport documentation: https://docs.particular.net/transports/rabbitmq/
- OpenTelemetry .NET ASP.NET Core tracing getting started: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-aspnetcore/
- OpenTelemetry .NET exporters documentation: https://opentelemetry.io/docs/languages/dotnet/exporters/

## Issues Found
- The package list omitted `OpenTelemetry.Instrumentation.Http` even though the setup code calls `AddHttpClientInstrumentation()`. Added the missing package command.
- The OpenTelemetry setup registered only the NServiceBus source and did not register the custom `ActivitySource("OrderService")`, so custom spans in later examples would not be exported. Added `AddSource("OrderService")`.
- The NServiceBus tracing source guidance was too narrow for current samples. Updated source registration to `NServiceBus.*`, matching current Particular sample guidance.
- The setup used `builder.Host.UseNServiceBus(...)`, which is now deprecated in current NServiceBus hosting guidance. Replaced it with `builder.Services.AddNServiceBusEndpoint(endpointConfiguration)`.
- The setup called `EnableOpenTelemetry()` unconditionally. Current NServiceBus 10+ enables OpenTelemetry instrumentation by default, so the text now notes that the call is for NServiceBus 8 or 9.
- The pipeline behavior used `context.MessageId` on `IIncomingLogicalMessageContext`; the safer documented source at that stage is the message headers. Updated the snippet to read `NServiceBus.Headers.MessageId`.
- The recoverability example called `recoverability.OnMessageSentToErrorQueue(...)`, which is not the current configuration shape. Updated it to `recoverability.Failed(settings => settings.OnMessageSentToErrorQueue((failed, ct) => ...))` and added current task-based retry notification callbacks.
- The performance tuning snippet used the old source list and would omit custom spans. Updated it to include `NServiceBus.*` and `OrderService`.
- The introductory list overstated specific span categories for pipeline behaviors, forwarding, auditing, and recoverability. Adjusted the wording to match documented traces, handler invocation, delayed/retry relationships, and context propagation.

## Review Notes
Local compilation was not possible because the `dotnet` CLI is not installed in the review environment. The review was performed against official Particular/NServiceBus and OpenTelemetry documentation.
