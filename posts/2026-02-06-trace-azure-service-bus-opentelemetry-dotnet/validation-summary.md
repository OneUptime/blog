# Validation Summary: How to Trace Azure Service Bus Messages with OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry for .NET
- Azure Messaging Service Bus SDK for .NET
- ASP.NET Core
- Azure SDK distributed tracing
- W3C trace context propagation
- OTLP exporter

## Sources Consulted
- OpenTelemetry .NET ASP.NET Core tracing documentation: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-aspnetcore/
- OpenTelemetry .NET tracing best practices: https://opentelemetry.io/docs/languages/dotnet/traces/best-practices/
- Azure SDK blog, experimental OpenTelemetry support for .NET: https://devblogs.microsoft.com/azure-sdk/introducing-experimental-opentelemetry-support-in-the-azure-sdk-for-net/
- Azure Monitor OpenTelemetry Distro for .NET documentation, Azure SDK instrumentation section: https://learn.microsoft.com/en-us/dotnet/api/overview/azure/monitor.opentelemetry.aspnetcore-readme?view=azure-dotnet
- Azure Messaging Service Bus troubleshooting, distributed tracing section: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/servicebus/Azure.Messaging.ServiceBus/TROUBLESHOOTING.md#distributed-tracing
- ServiceBusMessageBatch API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusmessagebatch?view=azure-dotnet
- ProcessMessageEventArgs.EntityPath API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.processmessageeventargs.entitypath?view=azure-dotnet
- NuGet package metadata for Azure.Messaging.ServiceBus, OpenTelemetry, OpenTelemetry.Extensions.Hosting, OpenTelemetry.Exporter.OpenTelemetryProtocol, OpenTelemetry.Instrumentation.AspNetCore, and OpenTelemetry.Instrumentation.Http: https://api.nuget.org/v3/index.json

## Issues Found
- The post referenced `OpenTelemetry.Instrumentation.Azure` and `AddAzureServiceBusInstrumentation`, but that package/API is not available on NuGet and is not the documented path for Azure Service Bus tracing. Replaced it with Azure SDK ActivitySource-based tracing by enabling `Azure.Experimental.EnableActivitySource` and subscribing to `Azure.*`.
- The package list was outdated and incomplete for the shown ASP.NET Core and HttpClient instrumentation calls. Updated package versions to current NuGet versions and added the missing ASP.NET Core and Http instrumentation packages.
- The text said the Azure instrumentation package automatically handled Service Bus operations. Updated it to describe the Azure Service Bus SDK's emitted spans and its use of message application properties such as `Diagnostic-Id`, `traceparent`, and `tracestate`.
- The batch sending sample called `ServiceBusMessageBatch.Clear()`, but the .NET API exposes `Dispose()` and `TryAddMessage()` and has no `Clear()` method. Reworked the sample to dispose the full batch, create a new batch, and handle oversized messages.
- The session-processing sample claimed to maintain trace context but did not extract parent context from message properties. Added context extraction before starting the consumer activity.
- The scheduled-message and dead-letter monitor samples had readonly fields without constructors assigning them. Added constructors so the snippets are structurally valid.
- A comment described the consumer span as linked to the producer span while the code uses the extracted context as the parent. Updated the wording to match the implementation.

## Review Notes
The code snippets still use simplified domain types such as `Order` and omit some surrounding application boilerplate, which is normal for a tutorial. The Azure SDK ActivitySource support is still documented as experimental, so future Azure SDK releases may change span shape or attributes.
