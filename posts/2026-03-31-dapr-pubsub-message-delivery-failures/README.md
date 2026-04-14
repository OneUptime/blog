# How to Fix Dapr Pub/Sub Message Delivery Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Messaging, Troubleshooting, Dead Letter

Description: Diagnose and resolve Dapr pub/sub message delivery failures including dropped messages, failed subscriptions, and dead letter queue issues.

---

Dapr's pub/sub building block abstracts message brokers like Redis Streams, Kafka, and Azure Service Bus. When messages fail to deliver, the cause can be in the broker configuration, the subscription setup, or the message handler itself.

## Understanding Delivery Semantics

Dapr guarantees at-least-once delivery. If your subscriber returns a non-success HTTP status, Dapr retries the message. This means:

- Returning `200` ACKs the message
- Returning `404` causes Dapr to drop the message with an error log
- Returning `500` (or other non-2xx, non-404) causes Dapr to retry (and eventually dead-letter if configured)
- Returning `200` with `{"status": "DROP"}` explicitly drops the message

## Checking If Messages Are Being Published

Verify publishing works at the API level:

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123"}'
```

A `204` response means Dapr accepted the message. Check broker metrics to confirm it arrived.

## Subscription Not Receiving Messages

If your subscriber isn't receiving messages, check its subscription registration. For programmatic subscriptions:

```python
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        'pubsubname': 'pubsub',
        'topic': 'orders',
        'route': '/orders'
    }])
```

Verify Dapr can reach the subscription endpoint:

```bash
kubectl logs <pod-name> -c daprd | grep -i "subscribe\|subscription"
```

## Declarative Subscription YAML

Use a declarative subscription for more control:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
  deadLetterTopic: orders-dead
scopes:
- order-processor
```

## Configuring Dead Letter Topics

Messages that fail delivery go to a dead letter topic. By default, dead-lettering happens on the first failure unless a resiliency policy with retries is configured. Configure and monitor it:

```yaml
spec:
  pubsubname: pubsub
  topic: orders
  deadLetterTopic: orders-dead
```

Subscribe to the dead letter topic to inspect failed messages:

```python
@app.route('/orders-dead', methods=['POST'])
def handle_dead_letter():
    data = request.json
    print(f"Dead letter message: {data}")
    return '', 200
```

## Message Handler Errors

If your handler throws an exception or returns 500, Dapr retries. Ensure idempotency and return explicit status:

```python
@app.route('/orders', methods=['POST'])
def process_order():
    try:
        data = request.json
        # process...
        return '', 200
    except Exception as e:
        # Retry will happen
        return jsonify({"status": "RETRY"}), 200
```

## Checking Broker Connectivity

If Dapr cannot connect to the broker, no messages flow at all. Check the pub/sub component initialization:

```bash
kubectl logs <pod-name> -c daprd | grep -i "pubsub\|kafka\|redis"
```

## Summary

Dapr pub/sub delivery failures usually trace back to subscription misconfiguration, handler errors causing infinite retries, or broker connectivity issues. Ensure your subscriber returns correct HTTP status codes, configure dead letter topics to capture failed messages, and validate broker connectivity from within the cluster.
