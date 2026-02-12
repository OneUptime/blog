# How to Publish Messages to SNS Topics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SNS, Messaging, Serverless, Python

Description: Learn how to publish messages to Amazon SNS topics using the CLI, Python, Node.js, and Go, including message attributes, filtering, and batch publishing.

---

Publishing messages to SNS is straightforward, but there's more to it than just shoving a string into a topic. Message attributes, message filtering, structured payloads, and batch publishing can make your messaging architecture much more efficient. Let's cover everything from the basics to advanced patterns.

## Publishing via CLI

The quickest way to publish a message.

```bash
# Publish a simple text message
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:order-notifications \
  --message "New order received: ORD-12345"
```

For structured messages, use JSON.

```bash
# Publish a JSON message with attributes
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:order-notifications \
  --message '{"orderId": "ORD-12345", "amount": 99.99, "customerId": "C-001"}' \
  --message-attributes '{
    "event_type": {"DataType": "String", "StringValue": "order_created"},
    "priority": {"DataType": "String", "StringValue": "high"}
  }'
```

Message attributes are key to SNS message filtering. Subscribers can set filter policies to only receive messages with specific attributes, which reduces unnecessary processing.

## Publishing with Python (Boto3)

Here's a production-ready publisher class in Python.

```python
import json
import boto3
from typing import Dict, Any, Optional

sns = boto3.client('sns', region_name='us-east-1')

def publish_message(
    topic_arn: str,
    message: Dict[str, Any],
    event_type: str,
    attributes: Optional[Dict[str, str]] = None
) -> str:
    """Publish a structured message to an SNS topic.

    Returns the MessageId on success.
    """
    # Build message attributes for filtering
    msg_attributes = {
        'event_type': {
            'DataType': 'String',
            'StringValue': event_type,
        }
    }

    # Add any additional custom attributes
    if attributes:
        for key, value in attributes.items():
            msg_attributes[key] = {
                'DataType': 'String',
                'StringValue': str(value),
            }

    response = sns.publish(
        TopicArn=topic_arn,
        Message=json.dumps(message),
        MessageAttributes=msg_attributes,
    )

    return response['MessageId']

# Usage examples
topic = 'arn:aws:sns:us-east-1:123456789012:order-notifications'

# Publish an order created event
message_id = publish_message(
    topic_arn=topic,
    message={
        'order_id': 'ORD-12345',
        'customer_id': 'C-001',
        'total_amount': 99.99,
        'items': [
            {'sku': 'WIDGET-A', 'quantity': 2, 'price': 29.99},
            {'sku': 'GADGET-B', 'quantity': 1, 'price': 40.01},
        ],
        'timestamp': '2026-02-12T10:30:00Z',
    },
    event_type='order_created',
    attributes={
        'priority': 'high',
        'region': 'us-east',
    }
)
print(f'Published message: {message_id}')
```

## Publishing with Node.js (AWS SDK v3)

The Node.js version using the AWS SDK v3.

```javascript
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const sns = new SNSClient({ region: 'us-east-1' });

async function publishMessage(topicArn, message, eventType, attributes = {}) {
  // Build message attributes for subscriber filtering
  const messageAttributes = {
    event_type: {
      DataType: 'String',
      StringValue: eventType,
    },
  };

  // Add custom attributes
  for (const [key, value] of Object.entries(attributes)) {
    messageAttributes[key] = {
      DataType: 'String',
      StringValue: String(value),
    };
  }

  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    MessageAttributes: messageAttributes,
  });

  const response = await sns.send(command);
  return response.MessageId;
}

// Publish an event
const topicArn = 'arn:aws:sns:us-east-1:123456789012:order-notifications';

publishMessage(
  topicArn,
  {
    orderId: 'ORD-12345',
    customerId: 'C-001',
    totalAmount: 99.99,
    timestamp: new Date().toISOString(),
  },
  'order_created',
  { priority: 'high' }
).then(id => console.log(`Published: ${id}`));
```

## Publishing to FIFO Topics

FIFO topics require a message group ID (and optionally a deduplication ID).

```python
import json
import boto3

sns = boto3.client('sns')

def publish_fifo_message(topic_arn, message, group_id, dedup_id=None):
    """Publish to a FIFO topic with ordering guarantees.

    Messages with the same group_id are delivered in order.
    Different group_ids can be processed in parallel.
    """
    params = {
        'TopicArn': topic_arn,
        'Message': json.dumps(message),
        'MessageGroupId': group_id,
    }

    # If content-based deduplication is disabled on the topic,
    # you must provide a deduplication ID
    if dedup_id:
        params['MessageDeduplicationId'] = dedup_id

    response = sns.publish(**params)
    return response['MessageId']

# Example: publish payment events in order per customer
fifo_topic = 'arn:aws:sns:us-east-1:123456789012:payment-processing.fifo'

# These messages for customer C-001 will arrive in order
publish_fifo_message(
    fifo_topic,
    {'event': 'payment_initiated', 'amount': 99.99},
    group_id='C-001'
)

publish_fifo_message(
    fifo_topic,
    {'event': 'payment_completed', 'amount': 99.99},
    group_id='C-001'
)
```

## Batch Publishing

When you need to publish many messages at once, use `PublishBatch` to reduce API calls. Each batch can contain up to 10 messages.

```python
import json
import boto3
import uuid

sns = boto3.client('sns')

def publish_batch(topic_arn, messages):
    """Publish multiple messages in a single API call.

    Each batch supports up to 10 messages.
    """
    results = []

    # Process in batches of 10
    for i in range(0, len(messages), 10):
        batch = messages[i:i + 10]
        entries = []

        for msg in batch:
            entry = {
                'Id': str(uuid.uuid4())[:8],  # Unique ID within the batch
                'Message': json.dumps(msg['body']),
            }

            if msg.get('attributes'):
                entry['MessageAttributes'] = {
                    key: {'DataType': 'String', 'StringValue': str(val)}
                    for key, val in msg['attributes'].items()
                }

            entries.append(entry)

        response = sns.publish_batch(
            TopicArn=topic_arn,
            PublishBatchRequestEntries=entries
        )

        # Check for failures
        if response.get('Failed'):
            for failure in response['Failed']:
                print(f'Failed to publish: {failure["Id"]} - {failure["Message"]}')

        results.extend(response.get('Successful', []))

    return results

# Publish a batch of order events
topic = 'arn:aws:sns:us-east-1:123456789012:order-notifications'

messages = [
    {
        'body': {'order_id': f'ORD-{i}', 'amount': 10.0 * i},
        'attributes': {'event_type': 'order_created'},
    }
    for i in range(25)
]

results = publish_batch(topic, messages)
print(f'Published {len(results)} messages')
```

## Protocol-Specific Messages

SNS can deliver messages in different formats depending on the subscriber's protocol. Use the `MessageStructure` parameter to send different content to different protocols.

```python
import json
import boto3

sns = boto3.client('sns')

# Send different messages to different subscriber types
sns.publish(
    TopicArn='arn:aws:sns:us-east-1:123456789012:alerts',
    MessageStructure='json',
    Message=json.dumps({
        # Default message for protocols without a specific override
        'default': 'Alert: CPU usage above 90%',
        # Rich JSON for Lambda/SQS subscribers
        'sqs': json.dumps({
            'alert_type': 'cpu_high',
            'metric_value': 92.5,
            'instance_id': 'i-1234567890abcdef0',
        }),
        'lambda': json.dumps({
            'alert_type': 'cpu_high',
            'metric_value': 92.5,
            'instance_id': 'i-1234567890abcdef0',
        }),
        # Short message for SMS subscribers
        'sms': 'ALERT: CPU 92.5% on i-1234567890abcdef0',
        # HTML-friendly message for email
        'email': 'CPU Alert\n\nInstance i-1234567890abcdef0 has CPU usage at 92.5%.\nPlease investigate.',
    })
)
```

## Error Handling and Retries

Always handle publishing failures properly.

```python
import json
import time
import boto3
from botocore.exceptions import ClientError

sns = boto3.client('sns')

def publish_with_retry(topic_arn, message, max_retries=3):
    """Publish a message with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            response = sns.publish(
                TopicArn=topic_arn,
                Message=json.dumps(message),
            )
            return response['MessageId']
        except ClientError as e:
            error_code = e.response['Error']['Code']

            # Throttling - wait and retry
            if error_code == 'Throttling':
                wait_time = (2 ** attempt) + 0.5
                print(f'Throttled, retrying in {wait_time}s...')
                time.sleep(wait_time)
                continue

            # Topic doesn't exist - don't retry
            if error_code == 'NotFound':
                raise ValueError(f'Topic not found: {topic_arn}')

            # Other errors - raise immediately
            raise

    raise Exception(f'Failed to publish after {max_retries} attempts')
```

For integrating SNS with CloudWatch alarms for automated alerting, see [using SNS with CloudWatch alarms](https://oneuptime.com/blog/post/use-sns-with-cloudwatch-alarms/view). And if you need ordered message delivery, check out [FIFO topics for ordered messaging](https://oneuptime.com/blog/post/use-sns-fifo-topics-for-ordered-messaging/view).
