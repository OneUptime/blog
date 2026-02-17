# How to Choose Between Push and Pull Subscriptions in Google Cloud Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Messaging, Architecture, Cloud Architecture

Description: A practical comparison of push and pull subscription types in Google Cloud Pub/Sub, with guidance on when to use each approach based on your application requirements.

---

When you create a subscription in Google Cloud Pub/Sub, one of the first decisions you make is whether it should be a push or pull subscription. This choice affects how your application receives messages, how you handle scaling, and how you deal with failures. Both approaches work well, but they fit different scenarios. Picking the wrong one can lead to unnecessary complexity or poor performance.

Let me break down how each type works and when to use which.

## How Pull Subscriptions Work

With a pull subscription, your application actively reaches out to Pub/Sub and asks for messages. The subscriber controls the pace. It connects to the Pub/Sub API, requests a batch of messages, processes them, and then acknowledges them.

The flow looks like this:

```
Subscriber -> Pub/Sub: "Give me messages"
Pub/Sub -> Subscriber: "Here are 10 messages"
Subscriber processes messages
Subscriber -> Pub/Sub: "I acknowledge messages 1-10"
```

In practice, you typically use the streaming pull API through a client library, which maintains a persistent connection and receives messages as they become available:

```python
# Pull subscriber using the Google Cloud Pub/Sub client library
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path("my-project", "my-subscription")

def process_message(message):
    """Handle each incoming message."""
    print(f"Received: {message.data.decode('utf-8')}")
    # Process the message here
    message.ack()  # Acknowledge after successful processing

# Start receiving messages with flow control
streaming_pull = subscriber.subscribe(
    subscription_path,
    callback=process_message,
    flow_control=pubsub_v1.types.FlowControl(
        max_messages=100,        # Buffer up to 100 messages
        max_bytes=10 * 1024 * 1024,  # 10 MB buffer limit
    ),
)

print(f"Listening on {subscription_path}")

try:
    streaming_pull.result(timeout=300)  # Block for 5 minutes
except TimeoutError:
    streaming_pull.cancel()
    streaming_pull.result()
```

## How Push Subscriptions Work

With a push subscription, Pub/Sub takes the initiative. It sends messages as HTTP POST requests to an endpoint you specify. Your application exposes an HTTP endpoint, and Pub/Sub delivers messages to it.

The flow looks like this:

```
Pub/Sub -> Your Endpoint: POST /webhook with message body
Your Endpoint processes the message
Your Endpoint -> Pub/Sub: HTTP 200 (acknowledgement)
```

Here is what the receiving side looks like:

```python
# Push subscriber endpoint using Flask
from flask import Flask, request, jsonify
import base64
import json

app = Flask(__name__)

@app.route('/webhook/messages', methods=['POST'])
def receive_message():
    """Handle incoming Pub/Sub push messages."""
    envelope = request.get_json()

    if not envelope or 'message' not in envelope:
        return jsonify({'error': 'Invalid message format'}), 400

    # Decode the message data from base64
    message_data = base64.b64decode(
        envelope['message']['data']
    ).decode('utf-8')

    attributes = envelope['message'].get('attributes', {})
    message_id = envelope['message']['messageId']

    print(f"Processing message {message_id}: {message_data}")

    # Process the message
    try:
        handle_event(json.loads(message_data))
        return jsonify({'status': 'ok'}), 200  # 200 = acknowledge
    except Exception as e:
        print(f"Processing failed: {e}")
        return jsonify({'error': str(e)}), 500  # Non-2xx = nack

def handle_event(data):
    """Your business logic here."""
    pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## When to Use Pull Subscriptions

Pull subscriptions are the better choice in several scenarios:

**You need fine-grained flow control.** Pull subscribers can control exactly how many messages they process at a time. If your processing is resource-intensive, you can limit the buffer to prevent overload. Push subscriptions have rate limiting too, but it is less granular.

**Your subscriber is a long-running process.** Applications like worker services, data pipelines, or background processors that run continuously are natural fits for pull. They maintain a streaming connection and process messages as fast as they can.

**You are running on GKE or Compute Engine.** If your application is deployed on infrastructure that does not have a public HTTP endpoint, pull is simpler. There is no need to expose ports or configure load balancers.

**You need to process messages in batches.** Pull lets you accumulate messages and process them together, which is efficient for batch-oriented workloads like writing to a database in bulk.

**You want maximum throughput.** Pull subscriptions generally achieve higher throughput because you can run multiple streaming pull connections in parallel and tune the flow control parameters.

## When to Use Push Subscriptions

Push subscriptions shine in different situations:

**You are using Cloud Run or Cloud Functions.** These serverless platforms are designed to handle HTTP requests. Push subscriptions trigger them naturally, and the platform handles scaling automatically. This is probably the most common use case for push.

**You want Pub/Sub to handle retries and backoff.** Push subscriptions have built-in retry with exponential backoff. If your endpoint returns a non-success status code, Pub/Sub retries automatically. You do not need to implement retry logic yourself.

**Your endpoint is behind a load balancer.** Push works well when you have multiple instances behind a load balancer. Pub/Sub sends messages to the load balancer URL, and the load balancer distributes them across instances.

**You want simplicity.** Push requires less code on the subscriber side. You just expose an HTTP endpoint and return 200 on success. No client libraries needed, no connection management, no flow control tuning.

**You need to integrate with external services.** If the consumer is an external system that exposes a webhook URL, push is the only option. You cannot install a pull subscriber client on a third-party service.

## Side-by-Side Comparison

Here is a quick comparison table to help with the decision:

| Factor | Pull | Push |
|--------|------|------|
| Who initiates | Subscriber | Pub/Sub |
| Requires public endpoint | No | Yes |
| Client library needed | Yes | No (just HTTP) |
| Flow control | Fine-grained | Coarse (rate limiting) |
| Scaling | You manage | Pub/Sub manages delivery |
| Best for serverless | No | Yes |
| Batch processing | Easy | Harder |
| Maximum throughput | Higher | Lower |
| Authentication | Service account | OIDC token verification |

## Hybrid Approach

You are not limited to one type per topic. A single topic can have both push and pull subscriptions. This is useful when different consumers have different requirements:

```hcl
# Topic with both push and pull subscriptions
resource "google_pubsub_topic" "events" {
  name = "application-events"
}

# Pull subscription for the data pipeline (runs on GKE)
resource "google_pubsub_subscription" "pipeline" {
  name  = "data-pipeline-sub"
  topic = google_pubsub_topic.events.id
  ack_deadline_seconds = 120
}

# Push subscription for the notification service (runs on Cloud Run)
resource "google_pubsub_subscription" "notifications" {
  name  = "notification-service-sub"
  topic = google_pubsub_topic.events.id

  push_config {
    push_endpoint = "https://notification-svc.run.app/events"
    oidc_token {
      service_account_email = "pubsub-sa@my-project.iam.gserviceaccount.com"
    }
  }
}
```

## Security Considerations

For push subscriptions, always configure OIDC authentication. Without it, anyone who discovers your endpoint URL can send fake messages. Your endpoint should validate the token:

```python
# Validate OIDC token on push subscription endpoint
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

def verify_push_request(request):
    """Verify that the push request is from Pub/Sub."""
    bearer_token = request.headers.get('Authorization', '')
    token = bearer_token.replace('Bearer ', '')

    try:
        claim = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience='https://my-service.run.app'
        )
        # Verify the sender is the expected service account
        if claim['email'] != 'pubsub-sa@my-project.iam.gserviceaccount.com':
            return False
        return True
    except Exception:
        return False
```

For pull subscriptions, security is handled through IAM. The service account running your subscriber needs the `roles/pubsub.subscriber` role on the subscription.

## Making the Decision

If you are unsure, start with these questions:

1. Is your subscriber serverless (Cloud Run, Cloud Functions)? Use push.
2. Does your subscriber run on GKE or VMs without a public endpoint? Use pull.
3. Do you need batch processing or very high throughput? Use pull.
4. Do you want the simplest possible integration? Use push.

In most cases, the choice is straightforward. The platform your subscriber runs on usually determines the answer. Do not overthink it - you can always create a new subscription of the other type if requirements change. The topic does not care.

## Wrapping Up

Both push and pull subscriptions are production-ready and well-supported in Pub/Sub. Push subscriptions work best with serverless platforms and simple integrations where you want Pub/Sub to manage delivery. Pull subscriptions give you more control and higher throughput for long-running processes. Use both types on the same topic when different consumers need different delivery models. The key is matching the subscription type to your subscriber's architecture.
