# Validation Summary: How to Configure Dead Letter Queues in Azure Service Bus with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Service Bus (queues and topics)
- Azure Service Bus Dead Letter Queues
- Azure CLI
- Azure Monitor (metrics alerts)
- Python (Flask)
- Azure Service Bus SDK for Python

## Sources Consulted
- Dapr Azure Service Bus Queues component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-queues/
- Dapr Pub/Sub API reference (subscriber response statuses): https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Dead Letter Topics documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Azure CLI `az servicebus queue` reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue
- Azure CLI `az servicebus topic subscription` reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription
- Azure Service Bus Dead Letter Queues documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Azure Monitor supported metrics for Service Bus: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-servicebus-namespaces-metrics

## Issues Found

1. **Incorrect HTTP status code behavior (critical)**: The post claimed that returning HTTP 400 would "dead-letter immediately" (non-retriable) while HTTP 500 would trigger retries. This is incorrect — Dapr does not distinguish between 4xx and 5xx status codes. Any non-2xx response without an explicit status in the response body is treated as a RETRY. Fixed by rewriting the explanation and code example to use Dapr's explicit response statuses (`SUCCESS`, `RETRY`, `DROP`) in the JSON response body, which is the correct mechanism for controlling retry behavior.

2. **Wrong Azure CLI flag name**: The post used `--dead-lettering-on-message-expiration` in both the queue create and topic subscription create commands. The correct flag is `--enable-dead-lettering-on-message-expiration`. Fixed both occurrences.

3. **Non-existent Azure CLI command**: The post referenced `az servicebus message dead-letter resubmit` for replaying dead-lettered messages. This command does not exist in the Azure CLI. Replaced with a Python script using the `azure-servicebus` SDK that demonstrates how to receive from the dead letter subqueue and resubmit messages to the original queue, and noted that Service Bus Explorer in the Azure Portal is also an option.

4. **Incorrect Azure Monitor metric name**: The alert condition used `DeadLetteredMessageCount` but the correct Azure Monitor metric for Service Bus is `DeadletteredMessages` (note the lowercase 'l' and no 'Count' suffix). Fixed in the `az monitor metrics alert create` command.

## Review Notes
- The Dapr component metadata fields (`maxDeliveryCount`, `lockDurationInSec`, `maxActiveMessages`) are all valid for the `pubsub.azure.servicebus.queues` component type.
- The approach of subscribing to `task-queue/$deadletterqueue` via a Dapr declarative subscription is a valid pattern but may require additional testing in production — an alternative is to use the Azure Service Bus SDK directly for DLQ consumers.
- The `DeadLetterReason` metadata access pattern shown in the DLQ consumer code is correct.
- The `countDetails.deadLetterMessageCount` query path for `az servicebus queue show` is correct.
