# How to Implement Batch Notification Processing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Notification, Batch Processing, Pub/Sub, Workflow

Description: Learn how to process large batches of notifications reliably using Dapr pub/sub for queuing and Workflow for ordered delivery.

---

Batch notification processing sends large volumes of push notifications, in-app alerts, or SMS messages to user segments. Dapr pub/sub handles the work queue with built-in retry for failed deliveries, while Dapr state store tracks per-user and per-campaign progress.

## Batch Notification Architecture

```text
Campaign API -> Pub/Sub Queue -> Notification Processor -> Channel Workers
                                    (per-user batches)     - Push (FCM/APNs)
                                                           - In-App
                                                           - SMS
```

## Enqueue Notifications via Pub/Sub

Split a large campaign into individual notification events:

```python
from dapr.clients import DaprClient
import json

def enqueue_campaign_notifications(campaign_id: str, user_segment: list):
    with DaprClient() as client:
        # Publish individual notification events
        for user in user_segment:
            notification = {
                "campaignId": campaign_id,
                "userId": user['id'],
                "channel": user.get('preferredChannel', 'push'),
                "title": "Special offer just for you",
                "body": f"Hi {user['name']}, check out today's deals",
                "data": {"campaignId": campaign_id, "action": "open_app"}
            }

            client.publish_event(
                pubsub_name='pubsub',
                topic_name='pending-notifications',
                data=json.dumps(notification),
                publish_metadata={"partitionKey": user['id']}
            )

    print(f"Enqueued {len(user_segment)} notifications for campaign {campaign_id}")
```

## Process Notifications from Queue

Subscribe and route to channel-specific handlers:

```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/pending-notifications', methods=['POST'])
def process_notification():
    event = request.json
    notification = event['data']

    channel = notification['channel']

    if channel == 'push':
        result = send_push_notification(notification)
    elif channel == 'sms':
        result = send_sms_notification(notification)
    elif channel == 'inapp':
        result = store_inapp_notification(notification)
    else:
        result = {'success': False, 'error': f'Unknown channel: {channel}'}

    # Track result
    track_notification_result(
        notification['campaignId'],
        notification['userId'],
        result
    )

    if result['success']:
        return '', 200
    else:
        return '', 500  # Trigger Dapr retry
```

## Push Notification Sender with Rate Limiting

```python
import time
from collections import defaultdict

rate_limiter = defaultdict(lambda: {'count': 0, 'reset': time.time() + 1})

def send_push_notification(notification: dict) -> dict:
    # Rate limit: 1000 per second
    limiter = rate_limiter['fcm']
    if limiter['count'] >= 1000:
        if time.time() < limiter['reset']:
            raise Exception("Rate limit exceeded")
        limiter['count'] = 0
        limiter['reset'] = time.time() + 1

    limiter['count'] += 1

    # Send via FCM
    fcm_payload = {
        "to": get_device_token(notification['userId']),
        "notification": {
            "title": notification['title'],
            "body": notification['body']
        },
        "data": notification.get('data', {})
    }

    response = send_to_fcm(fcm_payload)
    return {"success": response.status_code == 200}
```

## Batch Progress Tracking with Dapr State

```python
def track_notification_result(campaign_id: str, user_id: str, result: dict):
    with DaprClient() as client:
        # Track per-user status
        client.save_state(
            'statestore',
            f'notif:{campaign_id}:{user_id}',
            json.dumps({
                "status": "sent" if result['success'] else "failed",
                "processedAt": datetime.utcnow().isoformat()
            }),
            state_metadata={"ttlInSeconds": "604800"}  # 7 days TTL
        )

        # Update campaign stats (not atomic; use etags for concurrency safety)
        result_key = f'campaign:{campaign_id}:stats'
        stats = json.loads(
            client.get_state('statestore', result_key).data or
            '{"sent": 0, "failed": 0}'
        )
        if result['success']:
            stats['sent'] += 1
        else:
            stats['failed'] += 1
        client.save_state('statestore', result_key, json.dumps(stats))
```

## Campaign Progress API

```python
@app.route('/campaigns/<campaign_id>/progress', methods=['GET'])
def get_progress(campaign_id: str):
    with DaprClient() as client:
        stats = client.get_state('statestore', f'campaign:{campaign_id}:stats')

    return jsonify(json.loads(stats.data or '{}')), 200
```

## Summary

Batch notification processing with Dapr uses pub/sub as a durable work queue that survives service restarts and scales by adding more subscriber replicas. Individual notification events are partitioned by user ID for ordered processing per user. Non-2xx responses from handlers trigger Dapr's built-in retry mechanism for failed deliveries. Dapr state tracks per-user and per-campaign statistics for progress monitoring.
