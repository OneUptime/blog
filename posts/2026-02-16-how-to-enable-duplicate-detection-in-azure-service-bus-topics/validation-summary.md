# Validation Summary: How to Enable Duplicate Detection in Azure Service Bus Topics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus topics
- Azure Service Bus queues
- Azure Service Bus duplicate detection
- Azure CLI
- Azure.Messaging.ServiceBus for .NET
- Azure.Messaging.ServiceBus.Administration for .NET
- Azure Functions Service Bus trigger
- C#

## Sources Consulted
- Microsoft Learn: Azure Service Bus duplicate detection - https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Microsoft Learn: Enable duplicate message detection for an Azure Service Bus queue or topic - https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-duplicate-detection
- Microsoft Learn: Azure CLI `az servicebus topic` reference - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic
- Microsoft Learn: TopicProperties.RequiresDuplicateDetection - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.topicproperties.requiresduplicatedetection
- Microsoft Learn: TopicProperties class - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.topicproperties
- Microsoft Learn: ServiceBusSender.SendMessagesAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.sendmessagesasync
- Microsoft Learn: Azure Functions Service Bus trigger - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger

## Issues Found
- The introduction and description implied duplicate detection prevents consumer-side redelivery after a processing crash. Updated the wording to clarify that broker duplicate detection handles duplicate sends, while receive redelivery still requires consumer-side idempotency.
- The post said duplicate detection only checks `MessageId`. Updated the limitation to include the documented partitioning behavior: with partitioning enabled, uniqueness is based on `MessageId` plus `PartitionKey`; with partitioning disabled, it is based on `MessageId`.
- The batching limitation was too broad and described behavior that is not the key documented caveat. Replaced it with Microsoft's documented warning about combining deduplication, batching, and partitioning.
- The Azure Functions sample manually completed messages without disabling automatic completion. Added `AutoCompleteMessages = false` to the `ServiceBusTrigger` attribute, as required when using `ServiceBusMessageActions` for manual settlement.
- Reworded "exactly once" consumer language to avoid implying that broker duplicate detection alone prevents all duplicate processing scenarios.

## Review Notes
The Azure CLI flags, duplicate detection window format and maximum, topic/queue creation behavior, .NET Service Bus sender APIs, and administration properties matched current Microsoft documentation. The Basic tier does not support duplicate detection; the post does not discuss tiers, so this is a possible future clarification rather than a correctness issue in the existing examples.
