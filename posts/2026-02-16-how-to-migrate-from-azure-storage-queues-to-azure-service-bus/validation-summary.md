# Validation Summary: How to Migrate from Azure Storage Queues to Azure Service Bus

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Queue Storage
- Azure Service Bus queues, topics, subscriptions, sessions, duplicate detection, scheduled delivery, dead-letter queues, and transactions
- Azure.Messaging.ServiceBus for .NET
- Azure.Storage.Queues for .NET
- Azure Resource Manager / Bicep templates
- Azure Monitor metrics

## Sources Consulted
- Azure Queue Storage introduction: https://learn.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction
- Azure Queue Storage PowerShell guide, including best-effort FIFO behavior and visibility timeout behavior: https://learn.microsoft.com/en-us/azure/storage/queues/storage-powershell-how-to-use-queues
- Azure Queue Storage trigger documentation, including poison message dequeue count behavior: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger
- Azure.Storage.Queues QueueClient.SendMessageAsync API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclient.sendmessageasync
- Azure.Storage.Queues QueueClientOptions API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclientoptions
- Azure Service Bus queues, topics, and subscriptions overview: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions
- Azure Service Bus advanced features overview: https://learn.microsoft.com/en-us/azure/service-bus-messaging/advanced-features-overview
- Azure Service Bus quotas and limits: https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas
- Azure Service Bus message sessions documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Azure Service Bus dead-letter queues documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Azure Service Bus .NET client library overview: https://learn.microsoft.com/en-us/dotnet/api/overview/azure/messaging.servicebus-readme
- Azure.Messaging.ServiceBus ServiceBusProcessorOptions.AutoCompleteMessages API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusprocessoroptions.autocompletemessages
- Microsoft.ServiceBus/namespaces 2024-01-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2024-01-01/namespaces
- Microsoft.ServiceBus/namespaces/queues Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces/queues
- Microsoft.ServiceBus/namespaces/topics 2024-01-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2024-01-01/namespaces/topics

## Issues Found
- The post described Azure Storage Queues as a basic FIFO queue. Azure documentation describes queue retrieval as best-effort FIFO and notes ordering is not always guaranteed. Updated the wording to "best-effort FIFO behavior."
- The Service Bus message-size bullet implied 100 MB was generally available in Premium. Azure Service Bus quotas specify 100 MB for single messages in Premium when using AMQP, with lower limits for other protocols and batches. Updated the wording to include the AMQP/Premium nuance.
- The Bicep sample used a preview Service Bus API version. The resource shape was valid, but the post presents a current migration guide, so the sample now uses the stable `2024-01-01` API version verified against the Service Bus Bicep reference.
- The message serialization section said Storage Queues store messages as strings and that Storage Queues require string messages. Current `Azure.Storage.Queues` supports `string` and `BinaryData`, but queue messages must be representable in an XML request with UTF-8 encoding unless Base64 message encoding is configured. Updated the explanation and code comment.
- The sender C# snippet placed `using Azure.Messaging.ServiceBus;` after top-level statements, which is invalid C# syntax. Moved all `using` directives to the top and added the missing `System` import for `Guid`.
- The consumer C# snippet used `JsonSerializer` without importing `System.Text.Json`. Added the missing import.

## Review Notes
The examples remain illustrative rather than complete standalone applications because `Order` and `ProcessOrder` are domain placeholders. The Service Bus client-lifetime guidance is consistent with the official .NET client library recommendation that clients, senders, receivers, and processors are safe to cache and reuse as singletons.
