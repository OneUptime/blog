# How to Build Real-Time Notification Systems with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Notification, Pub/Sub, Real-Time, Microservice

Description: Learn how to build a scalable real-time notification system using Dapr pub/sub for event routing and multi-channel delivery.

---

Notification systems need to deliver messages reliably across multiple channels - push notifications, email, SMS, and in-app alerts - while handling fan-out to many recipients. Dapr's pub/sub model simplifies this by decoupling event sources from notification delivery logic.

## System Architecture

```text
Event Sources -> notification-topic -> Notification Router -> Channel Workers
                                                            -> email-topic
                                                            -> push-topic
                                                            -> sms-topic
```

Each channel worker subscribes to its own topic, enabling independent scaling and failure isolation.

## Publish Notification Events

Any service can trigger a notification without knowing which channels will deliver it:

```python
from dapr.clients import DaprClient
import json

def notify_user(user_id: str, event_type: str, payload: dict):
    with DaprClient() as client:
        notification = {
            "userId": user_id,
            "eventType": event_type,
            "payload": payload,
            "timestamp": "2026-03-31T10:00:00Z"
        }
        client.publish_event(
            pubsub_name='pubsub',
            topic_name='notifications',
            data=json.dumps(notification),
            data_content_type='application/json'
        )

# Usage in any service
notify_user("user123", "order.shipped", {"orderId": "ORD-456", "trackingId": "TRK-789"})
```

## Build the Notification Router

The router subscribes to the main topic and routes to channel-specific topics based on user preferences:

```python
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json

app = Flask(__name__)

@app.route('/notifications', methods=['POST'])
def handle_notification():
    event = request.json
    user_id = event['data']['userId']

    # Fetch user notification preferences
    prefs = get_user_preferences(user_id)

    with DaprClient() as client:
        if prefs.get('email'):
            client.publish_event('pubsub', 'email-notifications', json.dumps(event['data']))

        if prefs.get('push'):
            client.publish_event('pubsub', 'push-notifications', json.dumps(event['data']))

        if prefs.get('sms') and is_urgent(event['data']['eventType']):
            client.publish_event('pubsub', 'sms-notifications', json.dumps(event['data']))

    return jsonify({"status": "routed"}), 200
```

## Email Channel Worker

```python
@app.route('/email-notifications', methods=['POST'])
def send_email():
    data = request.json['data']

    template = get_email_template(data['eventType'])

    send_smtp_email(
        to=get_user_email(data['userId']),
        subject=template['subject'],
        body=template['body'].format(**data['payload'])
    )

    return '', 200
```

## Configure Subscriptions

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: notification-router-sub
spec:
  pubsubname: pubsub
  topic: notifications
  route: /notifications
scopes:
- notification-router
---
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: email-worker-sub
spec:
  pubsubname: pubsub
  topic: email-notifications
  route: /email-notifications
scopes:
- email-worker
```

## Handle Delivery Failures with Dead Letters

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: push-worker-sub
spec:
  pubsubname: pubsub
  topic: push-notifications
  route: /push-notifications
  deadLetterTopic: failed-push-notifications
```

A separate retry service subscribes to `failed-push-notifications` to attempt redelivery after a delay.

## Rate Limiting Notifications

Protect users from notification floods by tracking counts in Dapr state:

```python
def check_rate_limit(user_id: str) -> bool:
    with DaprClient() as client:
        result = client.get_state('statestore', f'notif-count:{user_id}')
        count = int(result.data or 0)

        if count >= 10:  # Max 10 notifications per hour
            return False

        client.save_state('statestore', f'notif-count:{user_id}', str(count + 1))
        return True
```

## Summary

Dapr pub/sub provides the backbone for scalable notification systems by decoupling event publishers from delivery channels. A router service subscribes to a central notifications topic and fans out to channel-specific topics based on user preferences. Dead-letter topics capture failed deliveries for retry, while Dapr state management enables per-user rate limiting to prevent notification overload.
