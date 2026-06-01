# Validation Summary: How to Use the Saga Pattern for Distributed Transactions in Azure Service Bus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure CLI
- Azure Functions Service Bus trigger
- Azure.Messaging.ServiceBus for .NET
- Azure Cosmos DB for NoSQL .NET SDK
- C#
- Saga pattern and orchestration

## Sources Consulted
- Azure Service Bus dead-lettering on message expiration: https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-dead-letter
- Azure CLI `az servicebus namespace create`: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace?view=azure-cli-latest
- Azure CLI `az servicebus queue create`: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue?view=azure-cli-latest
- Azure Service Bus message expiration and TTL: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-expiration
- Azure Service Bus dead-letter queues: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Azure Functions Service Bus trigger bindings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Azure.Messaging.ServiceBus `ServiceBusMessage`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusmessage?view=azure-dotnet
- Azure Cosmos DB .NET `Container.ReplaceItemAsync`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.container.replaceitemasync?view=azure-dotnet
- Azure Cosmos DB .NET item creation: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-dotnet-create-item

## Issues Found
- The Service Bus command queues were created without enabling dead-lettering on message expiration, but the timeout example relied on TTL-expired messages going to a dead-letter queue. Added `--enable-dead-lettering-on-message-expiration true` to each command queue creation command.
- The post said each service had a command queue and a reply queue, while the implementation creates one shared `saga-replies` queue for the orchestrator. Updated the comment to match the implementation.
- The Cosmos DB sample used `CosmosContainer`, omitted the required item `id`, and called `CreateItemAsync`/`ReplaceItemAsync` without the partition key used elsewhere. Updated the sample to use `Container`, include an `id`, and pass `PartitionKey` values consistently.
- The orchestrator declared an unused sender array but used an undeclared `_serviceBusClient`. Replaced the field with `ServiceBusClient`.
- The orchestrator called `SendCompensationCommand` without defining it. Added a matching compensation command sender.
- The Azure Functions Service Bus handler used `ServiceBusMessageActions` without setting `AutoCompleteMessages = false`. Updated the trigger attribute to prevent automatic settlement conflicts.
- The C# samples deserialized `ServiceBusReceivedMessage.Body` directly with `JsonSerializer.Deserialize<T>`. Updated them to deserialize `message.Body.ToString()`, which matches the `BinaryData` body exposed by the current Service Bus SDK.
- The timeout handler monitored `saga-replies/$deadletterqueue`, but TTL was set on command messages sent to participant queues. Updated the text and sample to monitor a command queue dead-letter queue instead.
- The summary described sagas as providing distributed transaction consistency guarantees. Adjusted the wording to describe reliable distributed workflow management and eventual consistency guarantees.

## Review Notes
The timeout section now correctly covers commands that expire before being picked up. A production implementation should also track application-level deadlines for commands that are received but never produce a reply, because message TTL does not detect a participant that consumes a command and then fails before responding.
