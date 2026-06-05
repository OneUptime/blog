# Validation Summary: How to Trace Azure Service Bus Messages with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Bus
- Azure.Messaging.ServiceBus for .NET
- OpenTelemetry .NET
- System.Diagnostics.Activity and ActivitySource
- OpenTelemetry Collector
- OTLP exporter

## Sources Consulted
- Microsoft Learn: Distributed tracing and correlation through Service Bus messaging - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-end-to-end-tracing
- Microsoft Learn: Troubleshooting guide for Azure Service Bus - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-troubleshooting-guide
- Microsoft Learn: Azure Service Bus message sessions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Microsoft Learn API reference: ProcessMessageEventArgs - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.processmessageeventargs
- Microsoft Learn API reference: ProcessSessionMessageEventArgs.GetSessionStateAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.processsessionmessageeventargs.getsessionstateasync
- Azure SDK Blog: Introducing experimental OpenTelemetry support in the Azure SDK for .NET - https://devblogs.microsoft.com/azure-sdk/introducing-experimental-opentelemetry-support-in-the-azure-sdk-for-net/
- OpenTelemetry .NET SDK documentation: Customizing the SDK for tracing - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry Collector documentation: Processors - https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib: Resource Detection Processor - https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor
- OpenTelemetry Collector Contrib: Attributes Processor - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The post said Service Bus OpenTelemetry tracing was available generally from `Azure.Messaging.ServiceBus` 7.x and implied basic tracing worked out of the box. Microsoft documents OpenTelemetry support for the Service Bus .NET client as experimental from version 7.5.0 and the Azure SDK requires enabling `Azure.Experimental.EnableActivitySource` or `AZURE_EXPERIMENTAL_ENABLE_ACTIVITY_SOURCE`. Updated the version wording, setup code, and troubleshooting note.
- The OpenTelemetry setup only subscribed to `Azure.*`, so the custom `OrderService.*` activities shown later in the post would not be exported. Added `.AddSource("OrderService.*")` and explained why it is needed.
- The processor and session snippets used `Activity.RecordException`, which is provided by OpenTelemetry extension methods, without importing `OpenTelemetry.Trace`. Added the missing using statements.
- The session processor snippet subscribed to `HandleErrorAsync` without defining that method in the snippet. Added a matching error handler using the same pattern as the non-session processor.
- The introduction said the guide covered manual context propagation, but the article relies on the Azure SDK's built-in propagation through `Diagnostic-Id`. Updated the wording to avoid claiming manual propagation content that was not present.
- The diagram described `Diagnostic-Id` as a header. Updated it to "property" to match Azure Service Bus message/application property terminology.

## Review Notes
The collector configuration is valid for a collector distribution that includes contrib processors such as `resourcedetection` and `attributes`. The Resource Detection Processor documentation notes that the `resourcedetection` component name is retained as a deprecated alias for `resource_detection`; the current snippet should still work, but a future update could switch to `resource_detection/azure` naming to avoid deprecation warnings.
