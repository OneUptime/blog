# How to Configure Dead Letter Topics in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Dead Letter, Error Handling, Microservice

Description: Configure dead letter topics in Dapr pub/sub to capture messages that fail repeated delivery, enabling error analysis and manual reprocessing workflows.

---

## What Are Dead Letter Topics

A dead letter topic (DLT) is a special topic where messages are forwarded when they cannot be processed successfully after all retry attempts. Instead of losing failed messages, they are captured for:

- Manual inspection and debugging
- Automated reprocessing after fixing the underlying issue
- Alerting operations teams about processing failures
- Compliance and audit requirements

Dapr supports dead letter topics through subscription configuration.

## How Dead Letter Topics Work in Dapr

When a subscriber returns `RETRY` status, Dapr retries delivery based on component configuration. If all retries are exhausted, Dapr forwards the message to the configured dead letter topic instead of dropping it.

```text
Publisher --> Topic "orders" --> Subscriber
                                     |
                                 Returns RETRY
                                     |
                              [Retry attempts]
                                     |
                              Max retries reached
                                     |
                         --> Dead Letter Topic "orders-dlq"
                                     |
                         DLQ Processor Service
```

## Configuring a Dead Letter Topic in a Subscription

### Declarative Subscription

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/process
  deadLetterTopic: orders-dlq
```

### Programmatic Subscription

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        'pubsubname': 'pubsub',
        'topic': 'orders',
        'route': '/orders/process',
        'deadLetterTopic': 'orders-dlq'
    }])

@app.route('/orders/process', methods=['POST'])
def process_order():
    event = request.get_json()
    order = event.get('data', {})
    
    try:
        # Simulate processing that might fail
        result = process_business_logic(order)
        return jsonify({"status": "SUCCESS"})
    except Exception as e:
        print(f"Processing failed: {e}")
        # Return RETRY to trigger retries, then DLQ if all fail
        return jsonify({"status": "RETRY"})

def process_business_logic(order):
    # Raises exception if processing fails
    if not order.get('customerId'):
        raise ValueError("Missing customerId")
    # ... rest of processing
    return True
```

## Subscribing to the Dead Letter Topic

Create a separate service or endpoint to process dead-lettered messages:

```python
from flask import Flask, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        'pubsubname': 'pubsub',
        'topic': 'orders-dlq',
        'route': '/dlq/orders'
    }])

@app.route('/dlq/orders', methods=['POST'])
def handle_dead_letter():
    cloud_event = request.get_json()
    
    # The dead letter message contains the original event
    original_event = cloud_event.get('data', {})
    event_id = cloud_event.get('id')
    event_time = cloud_event.get('time')
    
    print(f"Dead letter received - Event ID: {event_id}")
    print(f"Original event time: {event_time}")
    print(f"Failed message: {json.dumps(original_event, indent=2)}")
    
    # Save to database for manual review
    save_to_dead_letter_store({
        "event_id": event_id,
        "failed_at": datetime.utcnow().isoformat(),
        "original_data": original_event
    })
    
    # Send alert to operations team
    send_ops_alert(f"Message processing failure: {event_id}")
    
    # Always acknowledge DLQ messages to prevent infinite requeue
    return jsonify({"status": "SUCCESS"})

def save_to_dead_letter_store(record):
    # Store in your database
    print(f"Saving DLQ record: {record['event_id']}")

def send_ops_alert(message):
    # Send Slack/PagerDuty notification
    print(f"ALERT: {message}")
```

## Configuring Retry Policy with Dead Letter

Use Dapr resiliency policies to control retry behavior before messages go to DLQ:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: orders-resiliency
spec:
  policies:
    retries:
      orders-retry:
        policy: exponential
        maxInterval: 60s
        maxRetries: 5

  targets:
    apps:
      order-processor-service:
        retry: orders-retry
```

This means Dapr retries up to 5 times with exponential backoff before sending to the dead letter topic.

## Reprocessing Dead Letter Messages

Create a reprocessing script that reads from the DLQ and republishes to the original topic after fixing the issue:

```python
import requests
import json

DAPR_HTTP_PORT = 3500

def reprocess_dead_letters(dlq_messages: list):
    """Republish dead letter messages back to the original topic"""
    success_count = 0
    
    for message in dlq_messages:
        try:
            # Republish to original topic
            response = requests.post(
                f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/orders",
                headers={"Content-Type": "application/json"},
                data=json.dumps(message['original_data'])
            )
            
            if response.status_code == 204:
                success_count += 1
                print(f"Reprocessed message {message['event_id']}")
            else:
                print(f"Failed to reprocess {message['event_id']}: {response.status_code}")
        except Exception as e:
            print(f"Error reprocessing {message['event_id']}: {e}")
    
    print(f"Reprocessed {success_count}/{len(dlq_messages)} messages")

# Get messages from your DLQ store and reprocess
dead_letters = get_dead_letters_from_db()
reprocess_dead_letters(dead_letters)
```

## Node.js Dead Letter Handler

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([{
    pubsubname: 'pubsub',
    topic: 'orders-dlq',
    route: '/dlq/orders'
  }]);
});

app.post('/dlq/orders', async (req, res) => {
  const { id, time, data } = req.body;
  
  console.error(`Dead letter received: ${id}`);
  console.error(`Failed message data:`, JSON.stringify(data, null, 2));
  
  // Log to your monitoring system
  await logToMonitoring({
    severity: 'ERROR',
    message: `Message processing failure`,
    eventId: id,
    failedAt: new Date().toISOString(),
    payload: data
  });
  
  // Must acknowledge to prevent infinite loop
  res.json({ status: 'SUCCESS' });
});
```

## Summary

Dead letter topics in Dapr are configured via the `deadLetterTopic` field in subscription definitions and capture messages that fail all retry attempts. Always subscribe to your dead letter topics with a dedicated handler that logs failures, stores them for review, and sends operational alerts. Pair DLQ configuration with Dapr resiliency retry policies to control how many attempts are made before messages are dead-lettered.
