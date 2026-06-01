# Validation Summary: How to Create Subscription Filters in Azure Service Bus Topics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Bus topics and subscriptions
- Azure Service Bus subscription rules, SQL filters, boolean filters, and correlation filters
- Azure CLI Service Bus commands
- Azure.Messaging.ServiceBus .NET SDK
- C# examples for Service Bus administration and publishing

## Sources Consulted
- Microsoft Learn: Azure Service Bus topic filters and actions: https://learn.microsoft.com/en-us/azure/service-bus-messaging/topic-filters
- Microsoft Learn: Azure Service Bus subscription rule SQL filter syntax: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-sql-filter
- Microsoft Learn: Azure Service Bus subscription rule SQL action syntax: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-sql-rule-action
- Microsoft Learn: Azure CLI `az servicebus topic subscription rule`: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription/rule
- Microsoft Learn: Azure.Messaging.ServiceBus.Administration `CorrelationRuleFilter`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.correlationrulefilter
- Microsoft Learn: Azure Service Bus messages, payloads, and serialization: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messages-payloads

## Issues Found
- The description and SQL filter overview implied that filters can route based on message content or body. Microsoft documentation states that all Service Bus subscription filters evaluate message properties and cannot evaluate the message body. Updated the wording to say filters route based on message properties only.
- The correlation filter description said correlation filters are "cheaper" than SQL filters. Official documentation supports that they are more efficient and have less throughput impact; the wording was changed to "more efficient" to avoid implying a billing difference.
- The SQL rule action example used a `CASE` expression. Service Bus SQL rule action syntax supports `SET` and `REMOVE` actions with constants, properties, arithmetic, and documented functions, but not `CASE`. Replaced the example with a supported `SET DiscountPercent = 20` action for a matching customer tier.
- The multiple-rules section described OR behavior without the documented action caveat. Updated it to clarify that rules without actions produce a single message even if multiple rules match, while each matching rule with an action produces its own message copy.

## Review Notes
The Azure CLI examples use current `az servicebus topic subscription rule create` and `delete` parameters. The .NET examples use the current Azure.Messaging.ServiceBus administration model, including `CreateRuleOptions`, `SqlRuleFilter`, `SqlRuleAction`, and `CorrelationRuleFilter.ApplicationProperties`.
