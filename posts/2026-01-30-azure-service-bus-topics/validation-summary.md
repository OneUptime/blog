# Validation Summary: How to Implement Azure Service Bus Topics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus topics and subscriptions
- Azure CLI
- Azure.Messaging.ServiceBus for .NET
- C#
- Message filters, sessions, batching, dead-letter queues, and monitoring

## Sources Consulted
- Microsoft Learn: Azure Service Bus queues, topics, and subscriptions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions
- Microsoft Learn: Azure CLI `az servicebus topic` reference - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az servicebus topic subscription` reference - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription?view=azure-cli-latest
- Microsoft Learn: Enable dead lettering for Azure Service Bus queues and subscriptions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-dead-letter
- Microsoft Learn: Azure Service Bus topic filters - https://learn.microsoft.com/en-us/azure/service-bus-messaging/topic-filters
- Microsoft Learn: Azure Service Bus message sessions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Microsoft Learn: Azure Service Bus message sequencing - https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing
- Microsoft Learn: Azure Service Bus dead-letter queues - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Microsoft Learn: Azure.Messaging.ServiceBus .NET API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus?view=azure-dotnet
- Microsoft Learn: Azure.Messaging.ServiceBus.Administration .NET API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration?view=azure-dotnet

## Issues Found
- The Azure CLI subscription example used `--dead-lettering-on-message-expiration`, which is not the current CLI option. Changed it to `--enable-dead-lettering-on-message-expiration`.
- Several .NET examples passed `BinaryData` directly to `JsonSerializer.Deserialize<T>()`. Updated those examples to use `BinaryData.ToObjectFromJson<T>()`, which matches the Azure SDK type.
- The processor example said throwing an exception could abandon or dead-letter a message. Throwing causes retry/abandon behavior; explicit dead-lettering requires `DeadLetterMessageAsync`. Updated the comment.
- The sessions section claimed sessions provide exactly-once delivery. Azure Service Bus sessions provide ordered handling for related messages, while handlers still need to be idempotent. Updated the wording.
- The session publishing example sent messages out of workflow order while claiming the receiver gets them in sequence. Updated it to send messages in the intended enqueue order.
- The session processor comment described `SessionIdleTimeout` as keeping the lock alive. It controls when an idle session is closed so the processor can move to another session. Updated the comment.
- The dead-letter reasons list omitted the requirement that filter evaluation errors are dead-lettered only when dead-lettering on filter evaluation exceptions is enabled. Clarified the bullet.
- The complete C# example had compile-level omissions: `OrderEventPublisher` did not implement `PublishOrderUpdatedAsync`, several classes had readonly dependencies without constructors, and a batch retry path did not handle a too-large message after creating a new batch. Added minimal code to correct those issues.

## Review Notes
The snippets are still illustrative and rely on domain types such as `OrderCreatedEvent`, `OrderUpdatedEvent`, `IOrderEvent`, and services such as `IOrderService` being defined by the application. Production code should prefer Microsoft Entra ID authentication over connection strings where possible.
