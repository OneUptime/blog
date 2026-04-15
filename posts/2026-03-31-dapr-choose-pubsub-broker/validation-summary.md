# Validation Summary: How to Choose the Right Pub/Sub Broker for Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub building block)
- Apache Kafka
- RabbitMQ
- Redis Streams
- Azure Service Bus
- Azure Event Hubs
- AWS SNS/SQS
- GCP Pub/Sub
- Dapr In-Memory pub/sub

## Sources Consulted
- Dapr Kafka pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr RabbitMQ pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Redis pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Azure Service Bus pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr AWS SNS/SQS pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr GCP Pub/Sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Microsoft Azure Service Bus documentation (message TTL/retention)
- Microsoft Azure Event Hubs documentation (retention periods by tier)
- Google Cloud Pub/Sub documentation (ordering keys, message retention)

## Issues Found

1. **RabbitMQ metadata field name `host` incorrect** — Changed `host` to `connectionString`. The Dapr RabbitMQ component uses `connectionString` for the broker connection URI, not `host`.

2. **Azure Service Bus component type incorrect for pub/sub** — Changed `pubsub.azure.servicebus.queues` to `pubsub.azure.servicebus.topics`. The queues variant is for point-to-point messaging; the topics variant is the correct one for pub/sub fan-out patterns.

3. **AWS SNS/SQS component type missing `aws.` prefix** — Changed `pubsub.snssqs` to `pubsub.aws.snssqs`. The official Dapr component type name includes the `aws.` namespace prefix.

4. **Azure Service Bus retention understated** — Changed "Up to 7 days" to "Up to 14 days (Basic) / unlimited (Standard+)". The Basic tier supports up to 14 days TTL, while Standard and Premium tiers support effectively unlimited message TTL.

5. **GCP Pub/Sub ordering incorrectly described as "Best effort"** — Changed to "Per ordering key". GCP Pub/Sub supports ordered delivery when using ordering keys with `enable_message_ordering` on the subscription.

6. **GCP Pub/Sub retention understated** — Changed "Up to 7 days" to "Up to 31 days". The 7-day value is the default, but the maximum configurable retention is 31 days.

## Review Notes
- The Azure Event Hubs retention of "Up to 90 days" is correct but only applies to Premium and Dedicated tiers. Standard tier supports up to 7 days. This is acceptable as-is since the post describes the maximum capability.
- The Kafka and Redis Streams component YAML examples are correct and use current field names.
- The decision flowchart and general architectural guidance are sound.
