# Validation Summary: How to Configure RabbitMQ for Dapr Pub/Sub with Exchanges and Queues

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr pub/sub building block
- RabbitMQ (exchanges, queues, dead-letter exchanges)
- Dapr RabbitMQ pub/sub component (`pubsub.rabbitmq`)
- rabbitmqadmin CLI
- RabbitMQ Management API
- Prometheus / ServiceMonitor for monitoring

## Sources Consulted
- Dapr RabbitMQ pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr pub/sub API reference (subscriber response handling): https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

1. **Wrong metadata field name `concurrency`**: The component YAML used `concurrency` but the correct Dapr RabbitMQ metadata field is `concurrencyMode`. Changed `concurrency` to `concurrencyMode`.

2. **Unsupported exchange types listed**: The post listed `direct` and `headers` as supported `exchangeKind` values. The official Dapr RabbitMQ documentation only documents `fanout` and `topic` as supported values. Removed `direct` and `headers` from the list.

3. **Non-existent `ackWaitTime` metadata field**: The post included `ackWaitTime` as a Dapr component metadata field, but this field does not exist in the Dapr RabbitMQ component spec. Removed the field from the acknowledgment configuration snippet.

4. **Wrong metadata field name `deadLetterExchange`**: The post used `deadLetterExchange` with a string value (the exchange name). The correct Dapr metadata field is `enableDeadLetter` with a boolean value `"true"`. When enabled, Dapr handles dead-letter routing internally. Changed the field name and value accordingly.

5. **Incorrect subscriber nack behavior description**: The post stated "A 404 or 500 causes a nack, re-queuing the message." This is incorrect: HTTP 404 causes the message to be **dropped** (not requeued), while other non-2xx responses trigger a retry. Additionally, the description omitted Dapr's `status` response field (`SUCCESS`, `RETRY`, `DROP`) which gives subscribers fine-grained control over message handling. Updated the description to accurately reflect the Dapr pub/sub subscriber response protocol.

## Review Notes
- The post uses `host` as the metadata field name for the RabbitMQ connection string. The current official Dapr documentation uses `connectionString` as the field name. However, `host` is widely used in Dapr examples and remains functional as an alias, so it was not changed.
- The `reconnectWait` value of `"0"` means no delay between reconnection attempts, which could cause a tight reconnection loop in production. This is not technically incorrect but may not be ideal for production deployments.
- The `rabbitmqadmin` CLI commands and RabbitMQ Management API examples are syntactically correct.
- The ServiceMonitor YAML for Prometheus is valid Kubernetes resource syntax.
