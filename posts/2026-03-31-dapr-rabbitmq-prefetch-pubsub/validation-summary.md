# Validation Summary: How to Tune RabbitMQ Prefetch for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub component)
- RabbitMQ (prefetch / basic.qos)
- Kubernetes (scaling, annotations)
- RabbitMQ Management Plugin and HTTP API

## Sources Consulted
- Dapr RabbitMQ Pub/Sub component specification: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Kubernetes annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- RabbitMQ Management CLI documentation: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Consumers documentation: https://www.rabbitmq.com/docs/consumers

## Issues Found
- **Incorrect metadata field `deadLetterExchange`**: The blog post used `deadLetterExchange` with a string value (`"dlx-orders"`) as a Dapr RabbitMQ pub/sub metadata field. This field does not exist in the Dapr RabbitMQ component specification. The correct field is `enableDeadLetter`, which is a boolean (`"true"` / `"false"`) that enables Dapr's built-in dead-letter topic forwarding. Fixed the YAML snippet in the "Handling Nacks and Requeues" section accordingly.

## Review Notes
- All other metadata fields (`host`, `username`, `password`, `prefetchCount`, `durable`, `deletedWhenUnused`, `autoAck`, `requeueInFailure`, `reconnectWait`) are valid Dapr RabbitMQ pub/sub component fields.
- The Dapr publish API endpoint format `/v1.0/publish/{pubsubname}/{topic}` is correct.
- The `secretKeyRef` pattern with `name` and `key` subfields is the correct way to reference secrets in Dapr components.
- The `consumer_utilization` metric is a real RabbitMQ management API metric.
- The `rabbitmqadmin list queues` command syntax is valid; `message_stats.ack_details.rate` is a supported parameter.
- The prefetch count guidelines table provides reasonable general recommendations, though optimal values are always workload-dependent.
