# Validation Summary: How to Use Azure Service Bus with .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- Azure Service Bus
- Azure.Messaging.ServiceBus
- ASP.NET Core dependency injection and background services
- Polly retry policies

## Sources Consulted
- Microsoft Learn: Azure Service Bus client library for .NET - https://learn.microsoft.com/en-us/dotnet/api/overview/azure/messaging.servicebus-readme?view=azure-dotnet
- Microsoft Learn: Azure Service Bus queues, topics, and subscriptions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions
- Microsoft Learn: Azure Service Bus duplicate detection - https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Microsoft Learn: Azure Service Bus message sessions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Microsoft Learn: ServiceBusProcessorOptions API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusprocessoroptions?view=azure-dotnet
- Microsoft Learn: ServiceBusSessionProcessorOptions API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussessionprocessoroptions?view=azure-dotnet
- Microsoft Learn: ServiceBusSender.SendMessagesAsync API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebussender.sendmessagesasync?view=azure-dotnet
- Microsoft Learn: Azure Service Bus quotas and limits - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas
- Microsoft Learn: Azure Service Bus dead-letter queues - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues

## Issues Found
- The `ServiceBusSender` introduction said the sender handles batching, retries, and connection management. The retry and connection behavior is configured on `ServiceBusClient`, while the sender supports batching APIs. Updated the wording to distinguish those responsibilities.
- The processor sample set `AutoCompleteMessages = false` but the comment described automatic completion after successful processing. Updated the comment to explain that automatic completion is disabled so the handler can explicitly settle messages.
- The session processor sample described `SessionIdleTimeout` as automatic session lock renewal. Microsoft documents `SessionIdleTimeout` as the amount of idle time before closing the current session, while `MaxAutoLockRenewalDuration` controls automatic session lock renewal. Added `MaxAutoLockRenewalDuration` and corrected the `SessionIdleTimeout` comment.
- The Polly snippet placed `using Polly;` and `using Polly.Retry;` after a class declaration, which is not valid for ordinary C# source files. Moved those using directives to the top of the snippet.
- The batch publishing sample collected overflow messages recursively, which could recurse forever if a single message exceeded the maximum batch size. Reworked it to create service-sized batches iteratively and throw a clear exception for a single oversized message.
- The `SendListAsync` comment incorrectly claimed `SendMessagesAsync(IEnumerable<ServiceBusMessage>)` automatically batches lists that exceed size limits. Microsoft documents that this overload sends the set atomically and fails with `MessageSizeExceeded` when the messages exceed one batch. Updated the comment accordingly.
- The ASP.NET Core dependency injection snippet used `ILogger<T>` but did not include `Microsoft.Extensions.Logging`. Added the missing using directive.

## Review Notes
The current Azure.Messaging.ServiceBus SDK documentation reviewed was version 7.20.1. The post uses the current `Azure.Messaging.ServiceBus` package family, not the older Service Bus SDKs that Microsoft has announced for retirement on September 30, 2026. I could not run a local C# compile because the `dotnet` CLI is not installed in this environment; API validation was performed against official Microsoft Learn documentation.
