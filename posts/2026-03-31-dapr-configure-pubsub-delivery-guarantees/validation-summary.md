# Validation Summary: How to Configure Pub/Sub Delivery Guarantees in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub building block, declarative subscriptions, CloudEvents)
- Go (idempotent handler example)
- Python (Prometheus metrics example)
- Azure Service Bus (duplicate detection)
- Kafka, Redis Streams, RabbitMQ, Azure Event Hubs (ordering/deduplication comparison)
- Kubernetes (testing delivery guarantees)
- Azure CLI

## Sources Consulted
- Dapr Pub/Sub Overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr Subscription Schema (v2alpha1): https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr CloudEvents format: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Azure Service Bus component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Azure Service Bus Duplicate Detection: https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Azure CLI `az servicebus topic create` reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic

## Issues Found

1. **Azure CLI flag incorrect** (line 76): The post used `--requires-duplicate-detection` which is not a valid Azure CLI flag for `az servicebus topic create`. Changed to `--enable-duplicate-detection`, which is the correct flag name. The `--requires-duplicate-detection` property name exists in ARM templates and PowerShell but not in the Azure CLI.

2. **Go idempotency handler logic bug** (lines 56-59): The code used `processedIDs.LoadOrStore` to record the message ID *before* calling `processOrder`. If `processOrder` failed and Dapr retried the message, the retry would hit the idempotency check and be incorrectly skipped as a duplicate, causing silent message loss. Added `processedIDs.Delete(envelope.ID)` in the error path so that retried messages are reprocessed correctly.

## Review Notes
- The Dapr Subscription apiVersion `dapr.io/v2alpha1` is correct and is the recommended version for declarative subscriptions.
- The handler status values `SUCCESS` and `RETRY` are correct. Dapr also supports `DROP` which is not mentioned but is not required for the scope of this post.
- The ordering guarantees table is accurate in the context of Dapr's pub/sub abstraction layer. Some backends (e.g., Kafka with idempotent producers) offer native deduplication features at the producer level, but these are not exposed through Dapr's pub/sub component configuration and are outside the scope of this guide.
- The claim that Dapr passes the CloudEvents `id` as the Azure Service Bus MessageId is generally accurate for the Dapr Azure Service Bus pub/sub component, enabling broker-level deduplication.
- The Python monitoring example uses `prometheus_client` correctly.
