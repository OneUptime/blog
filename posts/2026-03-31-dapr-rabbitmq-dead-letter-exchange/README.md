# How to Configure RabbitMQ Dead Letter Exchanges for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Dead Letter, Pub/Sub, Error Handling

Description: Configure RabbitMQ dead letter exchanges for Dapr pub/sub to handle message processing failures, with retry policies and dead letter queue inspection workflows.

---

## What Are Dead Letter Exchanges

A dead letter exchange (DLX) in RabbitMQ receives messages that cannot be delivered to their intended consumer: messages that are rejected, expire due to TTL, or exceed the queue's maximum length. Dapr's RabbitMQ component supports DLX routing via the `deadLetterTopic` subscription field.

## Component Configuration

Enable dead letter support in the Dapr RabbitMQ component:

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
      secretKeyRef:
        name: rabbitmq-secret
        key: host
    - name: durable
      value: "true"
    - name: deletedWhenUnused
      value: "false"
    - name: autoAck
      value: "false"
    - name: requeueInFailure
      value: "false"
    - name: enableDeadLetter
      value: "true"
    - name: deliveryMode
      value: "2"
    - name: publisherConfirm
      value: "true"
```

The key settings are `autoAck: "false"` (so Dapr controls when to ack) and `requeueInFailure: "false"` (so failures go to DLX instead of re-queuing indefinitely).

## Subscription with Dead Letter Topic

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: rabbitmq-pubsub
  topic: orders
  route: /orders
  deadLetterTopic: orders-dlq
```

## Application Handler

Handle messages and signal success, drop, or retry to Dapr:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    data = event.get('data', {})

    try:
        process_order(data)
        return jsonify({"status": "SUCCESS"}), 200
    except ValidationError as e:
        # Do NOT retry validation errors - discard permanently
        app.logger.error(f"Validation failed: {e}")
        return jsonify({"status": "DROP"}), 200  # Dapr acks and discards the message
    except TransientError as e:
        # Retry transient errors; exhausted retries route to DLQ
        app.logger.warning(f"Transient error: {e}")
        return '', 500  # Dapr will retry, then dead-letter on exhaustion

@app.route('/orders-dlq', methods=['POST'])
def handle_dead_letter():
    event = request.json
    # Log, alert, or store for manual review
    app.logger.error(f"Dead letter received: {event}")
    store_for_review(event)
    return jsonify({"status": "SUCCESS"}), 200
```

## Inspecting Dead Letter Messages

```bash
# View messages in the DLQ via RabbitMQ management
kubectl exec -it rabbitmq-0 -- rabbitmqctl list_queues \
  name messages consumers

# Peek at a DLQ message (does not consume)
kubectl exec -it rabbitmq-0 -- rabbitmqadmin get queue=orders-dlq ackmode=ack_requeue_true
```

## Replaying Dead Letter Messages

To replay DLQ messages after fixing the bug:

```bash
# Shovel messages from DLQ back to the original topic
kubectl exec -it rabbitmq-0 -- rabbitmqctl set_parameter shovel replay-orders \
  '{"src-protocol": "amqp091", "src-uri": "amqp://", "src-queue": "orders-dlq",
    "dest-protocol": "amqp091", "dest-uri": "amqp://", "dest-exchange": "orders"}'
```

## TTL-Based Dead Lettering

Set message TTL to auto-expire stale messages to DLQ:

```yaml
- name: ttlInSeconds
  value: "3600"
```

Messages older than 1 hour automatically move to the dead letter queue.

## Summary

Configuring RabbitMQ dead letter exchanges for Dapr requires enabling `enableDeadLetter: "true"` in the component, setting `autoAck: "false"` and `requeueInFailure: "false"`, and specifying a `deadLetterTopic` in the subscription manifest. Applications signal permanent failures by returning HTTP 200 with `status: DROP`, while transient errors return 500 for automatic retry. Dead letter queues serve as an audit trail for failed messages and support replay workflows after bug fixes.
