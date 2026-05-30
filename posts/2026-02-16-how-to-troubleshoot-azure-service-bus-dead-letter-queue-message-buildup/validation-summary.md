# Validation Summary: How to Troubleshoot Azure Service Bus Dead-Letter Queue Message Buildup

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Azure Service Bus queues and topic subscriptions
- Azure Service Bus dead-letter queues
- Azure CLI
- Azure.Messaging.ServiceBus for .NET
- Azure Monitor metric alerts

## Sources Consulted
- Microsoft Learn: Overview of Service Bus dead-letter queues: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Microsoft Learn: Enable dead lettering on message expiration for Azure Service Bus queues and subscriptions: https://learn.microsoft.com/azure/service-bus-messaging/enable-dead-letter
- Microsoft Learn: Azure CLI `az servicebus queue`: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue
- Microsoft Learn: Azure CLI `az servicebus topic subscription`: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription
- Microsoft Learn: `ServiceBusReceiver.DeadLetterMessageAsync`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceiver.deadlettermessageasync
- Microsoft Learn: `ServiceBusProcessorOptions`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusprocessoroptions
- Microsoft Learn: Supported metrics for Microsoft.ServiceBus/Namespaces: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-servicebus-namespaces-metrics
- Microsoft Learn: Azure CLI `az monitor metrics alert create`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert

## Issues Found
- Clarified that TTL expiration moves messages to the DLQ only when dead-lettering on message expiration is enabled. Microsoft documents this as an entity setting rather than unconditional behavior.
- Clarified that subscription filter evaluation errors are dead-lettered only when dead-lettering on filter evaluation exceptions is enabled.
- Added the correct topic subscription DLQ path format, because subscriptions use `<topic path>/Subscriptions/<subscription path>/$deadletterqueue`, not the queue path format.
- Changed the Azure Monitor alert condition from `total DeadletteredMessages > 100` to `avg DeadletteredMessages > 100`. The Service Bus `DeadletteredMessages` metric supports Average, Minimum, and Maximum aggregation, not Total.

## Review Notes
The C# examples use the current `Azure.Messaging.ServiceBus` SDK patterns for receivers, processors, dead-lettering, and auto lock renewal. The Azure CLI examples match the documented command and option names, but local CLI execution could not be performed because `az` is not installed in this workspace.
