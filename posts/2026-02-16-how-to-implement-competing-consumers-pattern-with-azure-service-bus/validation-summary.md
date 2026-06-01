# Validation Summary: How to Implement Competing Consumers Pattern with Azure Service Bus

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Service Bus queues
- Azure.Messaging.ServiceBus for .NET
- Azure Functions Service Bus trigger
- KEDA Azure Service Bus scaler
- Azure CLI
- Application Insights / Kusto Query Language
- C#

## Sources Consulted
- Microsoft Learn: ServiceBusProcessorOptions class, https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusprocessoroptions
- Microsoft Learn: Azure Service Bus bindings for Azure Functions, https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus
- Microsoft Learn: Azure Service Bus trigger for Azure Functions, https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- KEDA documentation: Azure Service Bus scaler, https://keda.sh/docs/2.17/scalers/azure-service-bus/
- Microsoft Learn: Azure CLI az servicebus queue, https://learn.microsoft.com/en-us/cli/azure/servicebus/queue

## Issues Found
- The post described competing consumers as if each message is processed by exactly one consumer. Azure Service Bus PeekLock delivers a locked message to one consumer at a time, but the delivery model is still at-least-once. Updated the wording to avoid implying exactly-once processing.
- The Azure Functions example manually completes messages with `ServiceBusMessageActions` but did not disable automatic completion on the trigger attribute. Added `AutoCompleteMessages = false`, matching the Azure Functions Service Bus trigger guidance.
- The `host.json` snippet mixed older `messageHandlerOptions` settings with current extension 5.x settings. Replaced it with current `autoCompleteMessages`, `maxConcurrentCalls`, and `prefetchCount` properties under `extensions.serviceBus`.
- The idempotency sample inserted a completed processing result before calling `FulfillOrder`, which could cause a retry to skip an order after a fulfillment failure. Updated the sample to use a start/claim operation, perform the work only after winning the race, and mark processing complete afterward.

## Review Notes
- The Azure CLI command shape and KEDA scaler metadata are consistent with current official documentation.
- The C# snippets rely on application-specific placeholder types such as `Order`, `IOrderService`, `IDatabase`, and `DuplicateKeyException`, which is appropriate for a blog example.
