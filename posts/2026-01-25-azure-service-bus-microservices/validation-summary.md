# Validation Summary: How to Build Event-Driven Microservices with Azure Service Bus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- Azure Service Bus
- Azure.Messaging.ServiceBus
- ASP.NET Core hosted background services
- Queues, topics, subscriptions, sessions, scheduled messages, and dead-letter queues

## Sources Consulted
- Microsoft Learn: Azure Service Bus Queue Quickstart for .NET Apps - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dotnet-get-started-with-queues
- Microsoft Learn: Azure Service Bus Topics Quickstart With .NET - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dotnet-how-to-use-topics-subscriptions
- Microsoft Learn: Azure Service Bus queues, topics, and subscriptions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions
- Microsoft Learn: Azure Service Bus client library for .NET - https://learn.microsoft.com/en-us/dotnet/api/overview/azure/messaging.servicebus-readme
- Microsoft Learn: ServiceBusSender class - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender
- Microsoft Learn: ServiceBusProcessorOptions class - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusprocessoroptions
- Microsoft Learn: ServiceBusClient.CreateProcessor method - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusclient.createprocessor
- Microsoft Learn: ProcessMessageEventArgs class - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.processmessageeventargs
- Microsoft Learn: ServiceBusSender.ScheduleMessageAsync method - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.schedulemessageasync
- Microsoft Learn: ServiceBusSender.CancelScheduledMessageAsync method - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.cancelscheduledmessageasync
- Microsoft Learn: Duplicate detection in Azure Service Bus - https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Microsoft Learn: Message sessions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Microsoft Learn: Message deferral - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-deferral
- Microsoft Learn: dotnet add package command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-add-package

## Issues Found
- Fixed the batch publishing sample. The original code created a new batch after the current batch filled, but the new batch was scoped to the `if` block and was never sent. The corrected version keeps the active batch in a reassigned variable, sends and disposes full batches, then sends the remaining batch.
- Added missing abstract `InventoryEvent` and `PaymentEvent` base records. The topic routing switch referenced these types, so the snippet would not compile as shown without them.
- Renamed the "Message Scheduling and Deferral" section to "Message Scheduling" because the sample demonstrates scheduled delivery only, not Service Bus message deferral.

## Review Notes
- The SDK APIs used in the post align with the current `Azure.Messaging.ServiceBus` documentation.
- Duplicate detection requires enabling duplicate detection on the queue or topic; setting `MessageId` alone is necessary but not sufficient for broker-side duplicate detection.
- Sessions require a session-enabled queue or subscription and are supported in Standard and Premium tiers, not Basic.
- Local compilation was not run because the `dotnet` CLI is not installed in this environment.
