# Validation Summary: How to Configure Auto-Forwarding Between Azure Service Bus Queues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Bus queues, topics, and subscriptions
- Azure Service Bus auto-forwarding
- Azure Service Bus dead-letter queues
- Azure CLI `az servicebus`
- Azure.Messaging.ServiceBus .NET administration client
- Azure Functions Service Bus trigger for C#

## Sources Consulted
- Microsoft Learn: Chaining Service Bus entities with autoforwarding - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-auto-forwarding
- Microsoft Learn: Enable auto forwarding for Azure Service Bus queues and subscriptions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-auto-forward
- Microsoft Learn: Overview of Service Bus dead-letter queues - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Microsoft Learn: Azure CLI `az servicebus queue` reference - https://learn.microsoft.com/en-us/cli/azure/servicebus/queue?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az servicebus topic subscription` reference - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription?view=azure-cli-latest
- Microsoft Learn: `ServiceBusAdministrationClient.QueueExistsAsync`, `TopicExistsAsync`, and `SubscriptionExistsAsync` API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.servicebusadministrationclient.queueexistsasync?view=azure-dotnet
- Microsoft Learn: `CreateQueueOptions` and `CreateSubscriptionOptions` API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.createqueueoptions?view=azure-dotnet
- Microsoft Learn: Azure Functions Service Bus trigger - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Microsoft Learn: Service Bus subscription rule SQL filter syntax - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-sql-filter

## Issues Found
- Removed session-enabled destination queue examples and session-based claims. Microsoft documentation states auto-forwarding is not supported for session-enabled queues or subscriptions, and forwarding to a session-enabled destination can fail.
- Replaced the queue-to-queue setup snippet. The original snippet described a normal queue forwarding chain but configured only dead-letter forwarding.
- Reordered the message aggregation CLI example so the destination queue is created before source queues use `--forward-to`. The destination must exist before forwarding is configured.
- Corrected the claim that the source queue name can be checked in custom properties by default. The post now tells readers to add a custom property such as `SourceQueue` when sending.
- Fixed .NET administration examples to use `.Value` from `Response<bool>` returned by `TopicExistsAsync`, `SubscriptionExistsAsync`, and `QueueExistsAsync`.
- Updated the Azure Functions trigger example to set `AutoCompleteMessages = false` when using `ServiceBusMessageActions.CompleteMessageAsync`.
- Replaced transfer dead-letter queue monitoring language with source dead-letter queue monitoring for auto-forwarding failures.
- Added missing limitations for the Basic tier and session-enabled entities.

## Review Notes
The local Azure CLI was not installed in the review environment, so CLI flags were verified against the official Azure CLI reference instead of local `az --help` output.
