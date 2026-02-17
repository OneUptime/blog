# How to Migrate Amazon SNS Notification Topics to Google Cloud Pub/Sub Push Subscriptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Pub/Sub, AWS SNS, Messaging, Notifications, Cloud Migration

Description: A practical guide to migrating Amazon SNS notification topics and subscriptions to Google Cloud Pub/Sub push subscriptions for event-driven messaging workflows.

---

Amazon SNS and Google Cloud Pub/Sub are both managed messaging services, but they have different designs. SNS is a push-based notification service where you publish messages to topics and SNS fans them out to subscriptions (HTTP endpoints, email, SMS, Lambda, SQS). Pub/Sub is a more general-purpose messaging system that supports both push and pull delivery.

For an SNS migration, you will primarily use Pub/Sub push subscriptions to replicate the fan-out and notification patterns you had in AWS.

## How the Concepts Map

| SNS Concept | Pub/Sub Equivalent |
|------------|-------------------|
| Topic | Topic |
| Subscription (HTTP/S) | Push subscription with HTTP endpoint |
| Subscription (Lambda) | Push subscription to Cloud Function |
| Subscription (SQS) | Pull subscription (or push to Cloud Run) |
| Subscription (Email) | No direct equivalent - use SendGrid/Mailgun via Cloud Function |
| Subscription (SMS) | No direct equivalent - use Twilio via Cloud Function |
| Message filtering | Subscription filter on message attributes |
| Message attributes | Message attributes |
| Dead letter queue | Dead letter topic |

One notable difference: SNS has built-in email and SMS delivery. Pub/Sub does not. If you use SNS for email or SMS notifications, you will need to add a Cloud Function that calls an email or SMS API.

## Step 1: Inventory Your SNS Topics and Subscriptions

Document everything you are migrating.

```bash
# List all SNS topics
aws sns list-topics --query 'Topics[*].TopicArn' --output table

# List subscriptions for a specific topic
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:123456:order-events \
  --query 'Subscriptions[*].{
    ARN:SubscriptionArn,
    Protocol:Protocol,
    Endpoint:Endpoint,
    Filter:FilterPolicy
  }' \
  --output table

# Get topic attributes (including delivery policy and encryption)
aws sns get-topic-attributes \
  --topic-arn arn:aws:sns:us-east-1:123456:order-events
```

## Step 2: Create Pub/Sub Topics

Create a Pub/Sub topic for each SNS topic.

```bash
# Create topics matching your SNS topics
gcloud pubsub topics create order-events
gcloud pubsub topics create user-notifications
gcloud pubsub topics create system-alerts

# Add a schema if your SNS messages follow a specific format
gcloud pubsub schemas create order-event-schema \
  --type=AVRO \
  --definition-file=order-event-schema.avsc

gcloud pubsub topics create order-events-validated \
  --schema=order-event-schema \
  --message-encoding=JSON
```

## Step 3: Create Push Subscriptions for HTTP Endpoints

SNS HTTP/HTTPS subscriptions translate directly to Pub/Sub push subscriptions.

```bash
# SNS HTTP subscription equivalent
# SNS endpoint: https://api.example.com/webhooks/order-events
gcloud pubsub subscriptions create order-events-webhook \
  --topic=order-events \
  --push-endpoint=https://api.example.com/webhooks/order-events \
  --ack-deadline=60 \
  --push-auth-service-account=pubsub-push@my-project.iam.gserviceaccount.com

# Set up dead letter topic for failed deliveries
gcloud pubsub topics create order-events-dead-letter

gcloud pubsub subscriptions create order-events-webhook \
  --topic=order-events \
  --push-endpoint=https://api.example.com/webhooks/order-events \
  --ack-deadline=60 \
  --dead-letter-topic=order-events-dead-letter \
  --max-delivery-attempts=5 \
  --push-auth-service-account=pubsub-push@my-project.iam.gserviceaccount.com
```

Note that Pub/Sub push subscriptions include an authorization header (OIDC token) that your endpoint should validate. Update your webhook handlers to verify the Pub/Sub push token.

## Step 4: Handle Lambda Subscriptions with Cloud Functions

SNS-to-Lambda subscriptions become Pub/Sub-triggered Cloud Functions.

```python
# Old Lambda function triggered by SNS
def lambda_handler(event, context):
    for record in event['Records']:
        sns_message = record['Sns']
        message = sns_message['Message']
        subject = sns_message.get('Subject', '')
        # Process the notification
        process_order_event(message)

# New Cloud Function triggered by Pub/Sub
import functions_framework
import base64
import json

@functions_framework.cloud_event
def process_order_event(cloud_event):
    """Process order events from Pub/Sub topic."""
    # Decode the Pub/Sub message data
    message_data = base64.b64decode(cloud_event.data['message']['data']).decode('utf-8')
    event = json.loads(message_data)

    # Access message attributes (equivalent to SNS message attributes)
    attributes = cloud_event.data['message'].get('attributes', {})

    # Process the event
    print(f"Processing order event: {event.get('order_id')}")
    handle_order(event)
```

Deploy the function with a Pub/Sub trigger:

```bash
# Deploy Cloud Function with Pub/Sub trigger
gcloud functions deploy process-order-event \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_order_event \
  --trigger-topic=order-events \
  --service-account=order-processor@my-project.iam.gserviceaccount.com
```

## Step 5: Handle Email Notifications

SNS can send emails directly. With Pub/Sub, you need a Cloud Function that sends emails through an email service.

```python
import functions_framework
import base64
import json
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os

@functions_framework.cloud_event
def send_email_notification(cloud_event):
    """Send email notification - replaces SNS email subscription."""
    message_data = base64.b64decode(cloud_event.data['message']['data']).decode('utf-8')
    notification = json.loads(message_data)

    # Build and send the email using SendGrid
    message = Mail(
        from_email='notifications@example.com',
        to_emails=notification['recipient'],
        subject=notification.get('subject', 'Notification'),
        html_content=notification['body']
    )

    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    response = sg.send(message)
    print(f"Email sent: {response.status_code}")
```

## Step 6: Migrate Message Filtering

SNS supports subscription filter policies. Pub/Sub supports message attribute filters on subscriptions.

```bash
# SNS filter policy example:
# {"event_type": ["order_created", "order_shipped"]}

# Pub/Sub equivalent using subscription filters
gcloud pubsub subscriptions create order-created-handler \
  --topic=order-events \
  --push-endpoint=https://api.example.com/webhooks/order-created \
  --message-filter='attributes.event_type = "order_created" OR attributes.event_type = "order_shipped"' \
  --push-auth-service-account=pubsub-push@my-project.iam.gserviceaccount.com
```

When publishing messages, include attributes that the filters can match:

```python
from google.cloud import pubsub_v1

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path('my-project', 'order-events')

def publish_order_event(order, event_type):
    """Publish order event with attributes for filtering."""
    data = json.dumps(order).encode('utf-8')

    # Message attributes enable subscription filtering
    future = publisher.publish(
        topic_path,
        data,
        event_type=event_type,      # used for filtering
        priority=order.get('priority', 'normal'),
        region=order.get('region', 'us')
    )
    return future.result()
```

## Step 7: Update Publisher Code

Convert your SNS publishing code to Pub/Sub.

```python
# Old SNS publishing code
import boto3

sns = boto3.client('sns')

def publish_sns(topic_arn, message, subject=None, attributes=None):
    params = {
        'TopicArn': topic_arn,
        'Message': json.dumps(message),
    }
    if subject:
        params['Subject'] = subject
    if attributes:
        params['MessageAttributes'] = {
            k: {'DataType': 'String', 'StringValue': v}
            for k, v in attributes.items()
        }
    sns.publish(**params)

# New Pub/Sub publishing code
from google.cloud import pubsub_v1

publisher = pubsub_v1.PublisherClient()

def publish_pubsub(topic_id, message, attributes=None):
    """Publish a message to a Pub/Sub topic with optional attributes."""
    topic_path = publisher.topic_path('my-project', topic_id)
    data = json.dumps(message).encode('utf-8')

    # Pass attributes as keyword arguments
    future = publisher.publish(topic_path, data, **(attributes or {}))
    return future.result()
```

## Step 8: Validate the Migration

Run both systems in parallel and compare:

```python
def publish_event(event, event_type):
    """Dual-publish during migration period."""
    # Publish to SNS (existing)
    publish_sns(
        'arn:aws:sns:us-east-1:123456:order-events',
        event,
        attributes={'event_type': event_type}
    )
    # Publish to Pub/Sub (new)
    publish_pubsub(
        'order-events',
        event,
        attributes={'event_type': event_type}
    )
```

Monitor delivery success rates on both sides. Check that all subscribers receive the expected messages:

```bash
# Check Pub/Sub subscription metrics
gcloud monitoring metrics list \
  --filter='metric.type="pubsub.googleapis.com/subscription/push_request_count"'

# Check for undelivered messages
gcloud pubsub subscriptions pull order-events-dead-letter --auto-ack --limit=10
```

## Summary

Migrating from SNS to Pub/Sub is straightforward for HTTP and Lambda subscriptions. The main work is around email and SMS notifications, which require adding Cloud Functions as intermediaries since Pub/Sub does not have built-in email or SMS delivery. Message filtering works similarly through attributes, and the fan-out pattern maps naturally to multiple Pub/Sub subscriptions on the same topic. Run both systems in parallel during migration and validate that all downstream consumers receive their messages before cutting over.
