# Validation Summary: How to Implement Transactions Across Azure Service Bus Queues

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure.Messaging.ServiceBus .NET SDK
- System.Transactions.TransactionScope
- Azure Functions Service Bus bindings
- C#
- Transactional Outbox pattern

## Sources Consulted
- Microsoft Learn: Transactions in Azure Service Bus - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-transactions
- Microsoft Learn: ServiceBusClientOptions.EnableCrossEntityTransactions property - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusclientoptions.enablecrossentitytransactions
- Microsoft Learn: Azure Service Bus bindings for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus
- Microsoft Learn: Azure Service Bus quotas and limits - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas

## Issues Found
- The post described a `ServiceBusTransactionGroup` pattern, but the current `Azure.Messaging.ServiceBus` SDK documentation uses `TransactionScope` with `ServiceBusClientOptions.EnableCrossEntityTransactions` for cross-entity transactions. I changed the heading and explanation to match the supported SDK behavior.
- The list of transaction-supported operations omitted message lock renewal. I added it to match the official Service Bus transactions documentation.
- Cross-queue transaction examples did not state that `EnableCrossEntityTransactions` must be enabled. I added targeted notes/comments explaining that the client must be configured with this option for transactions that span multiple Service Bus entities.
- The manual receive example said the message would be abandoned and redelivered after a transaction failure. For manual receiving, if the message is not completed, it is redelivered when the lock expires. I corrected the comment.
- The Azure Functions example manually completed the trigger message without disabling auto-completion. I added `AutoCompleteMessages = false` and noted that `enableCrossEntityTransactions` must be enabled in `host.json` for cross-entity transactions.

## Review Notes
The examples remain illustrative and assume application-specific types and helpers such as `Order`, `FulfillmentRequest`, `NotificationRequest`, `ProcessMessage`, and `CreateFulfillmentRequest` exist. The current Microsoft documentation also notes that Service Bus Basic tier does not support transactions and that management operations cannot be mixed with messaging operations in a transaction; those would be useful additions in a future expansion.
