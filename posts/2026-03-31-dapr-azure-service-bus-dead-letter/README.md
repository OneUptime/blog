# How to Configure Dead Letter Queues in Azure Service Bus with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Service Bus, Dead Letter Queue, Error Handling, Pub/Sub, Microservice

Description: Set up and monitor Azure Service Bus dead letter queues with Dapr to handle unprocessable messages and prevent message loss in production.

---

## Overview

Azure Service Bus automatically moves messages to a dead letter queue (DLQ) when they exceed the maximum delivery count or when time-to-live expires. Dapr's Service Bus pub/sub component works with DLQs to ensure that problematic messages are captured rather than lost. This guide covers configuring DLQ behavior, monitoring dead-lettered messages, and implementing remediation workflows.

## How Dead Lettering Works with Dapr

When Dapr receives a non-success response from your application, it signals Service Bus to abandon the message. Dapr's pub/sub subscriber API supports three response statuses: `SUCCESS` (message processed), `RETRY` (message should be retried), and `DROP` (message should be discarded without retrying). If your app returns any non-2xx HTTP status without an explicit status in the response body, Dapr treats it as a `RETRY`. After the message is abandoned `maxDeliveryCount` times, Service Bus moves it to the `$deadletterqueue` subqueue. Dapr does not automatically create a DLQ consumer - you must set up a separate process to read and process dead-lettered messages.

## Service Bus Configuration

```bash
# Create queue with DLQ settings
az servicebus queue create \
  --name task-queue \
  --namespace-name dapr-servicebus \
  --resource-group dapr-demo \
  --max-delivery-count 5 \
  --enable-dead-lettering-on-message-expiration true \
  --lock-duration PT30S \
  --default-message-time-to-live PT1H

# For topics
az servicebus topic subscription create \
  --name order-processor \
  --topic-name order-events \
  --namespace-name dapr-servicebus \
  --resource-group dapr-demo \
  --max-delivery-count 5 \
  --enable-dead-lettering-on-message-expiration true
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
  namespace: default
spec:
  type: pubsub.azure.servicebus.queues
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: servicebus-secret
        key: connectionString
    - name: maxDeliveryCount
      value: "5"
    - name: lockDurationInSec
      value: "30"
    - name: maxActiveMessages
      value: "10"
```

## Application Error Handler

When processing fails, use Dapr's response status codes to control retry behavior. Return a JSON body with `"status": "DROP"` to discard non-retriable messages, or `"status": "RETRY"` to retry:

```python
import json
from flask import Flask, request
app = Flask(__name__)

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    data = event.get('data', {})
    try:
        result = process_order(data)
        return json.dumps({"status": "SUCCESS"}), 200
    except ValidationError as e:
        # DROP non-retriable messages to avoid wasting delivery attempts
        return json.dumps({"status": "DROP"}), 200
    except TemporaryError as e:
        # RETRY retriable errors (Service Bus will abandon and redeliver)
        return json.dumps({"status": "RETRY"}), 500

def process_order(data):
    if not data.get('orderId'):
        raise ValidationError("orderId is required")
    # ... process
```

## Reading Dead-Lettered Messages

Create a separate Dapr app to consume the DLQ. Subscribe to the DLQ topic:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: dlq-consumer
spec:
  pubsubname: servicebus-pubsub
  topic: task-queue/$deadletterqueue
  route: /dead-letters
```

```python
@app.route('/dead-letters', methods=['POST'])
def handle_dead_letter():
    event = request.json
    data = event.get('data', {})
    dead_letter_reason = event.get('metadata', {}).get('DeadLetterReason')

    # Log to monitoring system
    print(f"Dead-lettered message: {data}, reason: {dead_letter_reason}")

    # Store in database for investigation
    store_dead_letter(data, dead_letter_reason)
    return '', 200
```

## Monitoring DLQ Depth

```bash
# Check DLQ message count via Azure CLI
az servicebus queue show \
  --name task-queue \
  --namespace-name dapr-servicebus \
  --resource-group dapr-demo \
  --query countDetails.deadLetterMessageCount

# Set up an alert
az monitor metrics alert create \
  --name dlq-not-empty \
  --resource-group dapr-demo \
  --scopes "/subscriptions/.../namespaces/dapr-servicebus/queues/task-queue" \
  --condition "avg DeadletteredMessages > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action myActionGroup
```

## Replaying Dead-Lettered Messages

After fixing the bug, replay DLQ messages. There is no built-in Azure CLI command for this — use Service Bus Explorer (available in the Azure Portal) or write a script with the Azure Service Bus SDK:

```python
from azure.servicebus import ServiceBusClient

conn_str = "your-connection-string"
queue_name = "task-queue"

with ServiceBusClient.from_connection_string(conn_str) as client:
    # Receive from the dead letter queue
    dlq_receiver = client.get_queue_receiver(queue_name, sub_queue="deadletter")
    sender = client.get_queue_sender(queue_name)
    with dlq_receiver, sender:
        messages = dlq_receiver.receive_messages(max_message_count=10, max_wait_time=5)
        for msg in messages:
            # Resubmit to the original queue
            sender.send_messages(msg)
            dlq_receiver.complete_message(msg)
```

## Summary

Azure Service Bus DLQs capture messages that Dapr consumers fail to process after the configured delivery count. Configure `maxDeliveryCount` based on your retry tolerance, subscribe to the `$deadletterqueue` suffix to process failed messages, and set up Azure Monitor alerts so your team is notified when messages start dead-lettering. Use Dapr's `DROP` status for non-retriable errors and `RETRY` for transient failures to prevent wasting delivery attempts on validation failures.
