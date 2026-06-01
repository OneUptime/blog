# Validation Summary: How to Implement Dead-Letter Queue Processing in Azure Service Bus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure Service Bus dead-letter queues
- Azure.Messaging.ServiceBus for .NET
- Azure.Messaging.ServiceBus.Administration for .NET
- Azure Functions timer and HTTP triggers
- C#

## Sources Consulted
- Microsoft Learn: Overview of Service Bus dead-letter queues - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Microsoft Learn: Enable dead lettering for Azure Service Bus queues and subscriptions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-dead-letter
- Microsoft Learn: Azure Service Bus message browsing and peeking - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-browsing
- Microsoft Learn: ServiceBusClient.CreateReceiver API - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusclient.createreceiver
- Microsoft Learn: ServiceBusReceiver.PeekMessagesAsync API - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceiver.peekmessagesasync
- Microsoft Learn: ServiceBusReceivedMessage.DeadLetterSource API - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceivedmessage.deadlettersource
- Microsoft Learn: QueueRuntimeProperties API - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.queueruntimeproperties
- Microsoft Learn: Azure Functions timer trigger - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer

## Issues Found
- The introduction implied that TTL-expired messages always enter the DLQ. Azure Service Bus only moves expired messages to the DLQ when dead-lettering on message expiration is enabled, so the wording was corrected.
- The metadata list described `DeadLetterSource` as a general field on every dead-lettered message. In the current .NET SDK documentation, it is only set when a dead-lettered message has been auto-forwarded from the DLQ to another entity, so the description was corrected.
- The resubmission counter used `(int)(long)count`, which can throw if the application property is stored as an `int`. The sample now uses `Convert.ToInt32(count)` before incrementing.

## Review Notes
The code uses the current Azure.Messaging.ServiceBus APIs and current Azure Functions isolated worker attribute style. For production use, resubmitting and completing the original DLQ message can be made more robust with Service Bus transactions to reduce duplicate risk if the send succeeds but completion fails.
