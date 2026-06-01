# Validation Summary: How to Implement Request-Reply Pattern with Azure Service Bus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Bus
- Azure Service Bus queues
- Azure Service Bus message sessions
- Azure.Messaging.ServiceBus .NET SDK
- C#
- Request-reply messaging pattern

## Sources Consulted
- Microsoft Learn: Azure Service Bus message sessions: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Microsoft Learn: Enable Azure Service Bus message sessions: https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-message-sessions
- Microsoft Learn: ServiceBusClient.AcceptSessionAsync API: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusclient.acceptsessionasync
- Microsoft Learn: ServiceBusReceiver.ReceiveMessageAsync API: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceiver.receivemessageasync
- Microsoft Learn: ServiceBusReceivedMessage.ReplyToSessionId API: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceivedmessage.replytosessionid
- Microsoft Learn: ServiceBusMessage properties, including SessionId, ReplyToSessionId, CorrelationId, and TimeToLive: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusmessage
- Microsoft Learn: CreateQueueOptions properties, including RequiresSession, DefaultMessageTimeToLive, and DeadLetteringOnMessageExpiration: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.createqueueoptions
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The original requester sample used one reply session per requester instance and then received a single reply, throwing if the first message had a different `CorrelationId`. That is unsafe for concurrent requests from the same requester instance and for stale late replies. I changed the sample to use a unique reply session per request by setting `ReplyToSessionId` to the request's `MessageId`, then accepting that specific session for the reply.
- The original requester sample used `ReceiveAndDelete`, which could lose a reply if deserialization or correlation validation failed. I changed the sample to use the default peek-lock mode and complete the reply only after validating and deserializing it.
- The original timeout handling only applied to `ReceiveMessageAsync`; accepting a session can also wait for broker interaction. I added a `CancellationTokenSource` around both `AcceptSessionAsync` and `ReceiveMessageAsync` so the caller's timeout bounds the full wait path.
- The post recommended short TTLs for replies but the responder sample did not set a message-level reply TTL. I added a `TimeToLive` value to the reply message.

## Review Notes
- Azure Service Bus sessions are supported only in Standard and Premium tiers, not Basic. The post's examples assume a tier that supports sessions.
- Creating a sender per reply still works, but the post correctly notes later that production code should cache `ServiceBusSender` instances.
- The sample still omits production concerns such as idempotency for duplicate request processing, business error payload design, and sender caching implementation details.
