# Validation Summary: How to Handle Poison Messages in Azure Service Bus Queues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Bus queues
- Azure Service Bus dead-letter queues
- Azure.Messaging.ServiceBus .NET SDK
- Azure Functions Service Bus trigger
- Azure CLI
- Azure Monitor metric alerts

## Sources Consulted
- Azure Service Bus dead-letter queues: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Azure CLI `az servicebus queue`: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue?view=azure-cli-latest
- Azure Functions Service Bus trigger: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Azure Functions Service Bus bindings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus
- Azure.Messaging.ServiceBus `ProcessMessageEventArgs`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.processmessageeventargs?view=azure-dotnet
- Azure.Messaging.ServiceBus `ServiceBusReceiverOptions.SubQueue`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceiveroptions.subqueue?view=azure-dotnet
- Azure.Messaging.ServiceBus `ServiceBusReceiver.PeekMessagesAsync`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusreceiver.peekmessagesasync?view=azure-dotnet
- Azure Monitor metric alert CLI: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Supported Azure Service Bus metrics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-servicebus-namespaces-metrics

## Issues Found
- The queue creation command used `--dead-lettering-on-message-expiration`, which is not the current Azure CLI option. Changed it to `--enable-dead-lettering-on-message-expiration`.
- The queue CLI comment said "creating or updating" while the snippet uses `az servicebus queue create`. Narrowed the comment to queue creation.
- The standalone .NET SDK snippet catches `JsonException` without importing its namespace. Added `using System.Text.Json;`.
- The Azure Functions sample used `ServiceBusMessageActions` to complete and dead-letter messages but did not set `AutoCompleteMessages = false` on the trigger. Updated the explanation and trigger attribute to match the Functions binding guidance for manual settlement.
- The Azure Functions snippet also catches `JsonException` indirectly through deserialization examples, so `using System.Text.Json;` was added there as well.
- The dead-letter processor class had `readonly` fields without a constructor assigning them. Added a constructor for `ServiceBusClient` and `ILogger<DeadLetterProcessor>`.
- The Azure Monitor alert command used `--action-group`, which is not the documented parameter for `az monitor metrics alert create`. Changed it to `--action`.

## Review Notes
The remaining code uses domain-specific placeholder types and methods such as `Order`, `ValidateOrder`, `ProcessOrder`, `TransientException`, `IOrderService`, and `InvalidOrderException`; these are acceptable for a focused blog example but would need real implementations in a complete sample project.
