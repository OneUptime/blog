# How to Configure RabbitMQ for Dapr Pub/Sub with Exchanges and Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Pub/Sub, Exchange, Queue

Description: Configure RabbitMQ exchanges, bindings, and queue settings for Dapr pub/sub to control message routing, durability, and dead-letter handling.

---

RabbitMQ's exchange and queue model provides fine-grained control over message routing that complements Dapr's pub/sub abstraction. Understanding how Dapr maps to RabbitMQ constructs helps you configure durability, dead-lettering, and routing correctly.

## Dapr RabbitMQ Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
  namespace: default
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: host
    value: "amqp://user:password@rabbitmq.default.svc.cluster.local:5672"
  - name: durable
    value: "true"
  - name: deletedWhenUnused
    value: "false"
  - name: autoAck
    value: "false"
  - name: reconnectWait
    value: "0"
  - name: concurrencyMode
    value: "parallel"
  - name: prefetchCount
    value: "10"
  - name: exchangeKind
    value: "fanout"
```

## Exchange Types and Dapr Topics

Dapr maps each pub/sub topic to a RabbitMQ exchange. The exchange kind affects routing:

- `fanout` - All bound queues receive every message (default Dapr behavior)
- `topic` - Route by pattern-matched routing key

For most Dapr use cases, `fanout` is correct since Dapr manages the consumer group (queue) binding.

## Pre-Creating Exchanges for Production

Pre-create exchanges with specific settings before deploying services:

```bash
# Create a durable fanout exchange for orders
rabbitmqadmin declare exchange \
  name=orders \
  type=fanout \
  durable=true \
  auto_delete=false

# Verify the exchange exists
rabbitmqadmin list exchanges
```

## Dead Letter Exchange Configuration

Configure dead-letter exchanges for messages that fail processing:

```bash
# Create dead-letter exchange
rabbitmqadmin declare exchange \
  name=orders-dlx \
  type=fanout \
  durable=true

# Create dead-letter queue
rabbitmqadmin declare queue \
  name=orders-dead-letter \
  durable=true

# Bind dead-letter queue to DLX
rabbitmqadmin declare binding \
  source=orders-dlx \
  destination=orders-dead-letter

# Create main queue with DLX policy
rabbitmqadmin declare queue \
  name=order-processor-orders \
  durable=true \
  arguments='{"x-dead-letter-exchange": "orders-dlx", "x-message-ttl": 300000}'
```

Enable dead-letter configuration in the Dapr component:

```yaml
  - name: enableDeadLetter
    value: "true"
  - name: maxLen
    value: "10000"
```

## Message Acknowledgment and Prefetch

Configure acknowledgment and prefetch for reliable processing:

```yaml
  - name: autoAck
    value: "false"     # Manual ack - don't lose messages on consumer crash
  - name: prefetchCount
    value: "5"         # Fetch 5 messages per consumer before waiting for acks
```

With manual ack, messages are only removed from the queue after the Dapr subscriber returns a successful response. The subscriber can return a JSON body with a `status` field: `SUCCESS` (ack), `RETRY` (nack and requeue), or `DROP` (ack and discard). A non-2xx response triggers a retry, except for HTTP 404, which causes the message to be dropped.

## Monitoring RabbitMQ Metrics

Monitor queue depth and consumer counts via RabbitMQ management API:

```bash
# Check queue depth for order-processor
curl -u admin:password \
  http://rabbitmq-management:15672/api/queues/%2F/order-processor-orders | \
  jq '{messages: .messages, consumers: .consumers, ack_rate: .message_stats.ack_details.rate}'
```

Integrate with Prometheus using the RabbitMQ Prometheus plugin:

```yaml
# ServiceMonitor for RabbitMQ Prometheus metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-monitor
spec:
  endpoints:
  - port: prometheus
    interval: 30s
    path: /metrics
```

## Summary

Dapr pub/sub with RabbitMQ maps topics to exchanges and consumer app IDs to queues. Configuring `durable: true`, manual `autoAck`, and a dead-letter exchange ensures messages survive broker restarts and processing failures. Prefetch count controls throughput, while RabbitMQ's management API and Prometheus plugin provide visibility into queue health.
