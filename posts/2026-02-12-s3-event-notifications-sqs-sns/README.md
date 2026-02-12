# How to Set Up S3 Event Notifications to SQS and SNS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, SQS, SNS, Serverless

Description: Configure S3 to send event notifications to SQS queues and SNS topics when objects are created or deleted, enabling decoupled event-driven architectures.

---

While [triggering Lambda directly from S3](https://oneuptime.com/blog/post/s3-event-notifications-trigger-lambda/view) works great for simple processing, sometimes you need more flexibility. Maybe you want to decouple the event producer from the consumer. Maybe you need to fan out events to multiple subscribers. Maybe you need a buffer to handle bursts. That's where SQS and SNS come in.

S3 can send event notifications directly to SQS queues (for buffered processing) and SNS topics (for fan-out to multiple subscribers). Let's set up both.

## S3 to SQS: Buffered Processing

Sending events to SQS gives you a reliable buffer between S3 and your processing logic. Events are queued and processed at whatever rate your consumer can handle. If your consumer goes down, events wait in the queue instead of being lost.

### Step 1: Create the SQS Queue

Create an SQS queue for S3 events:

```bash
# Create a standard SQS queue
QUEUE_URL=$(aws sqs create-queue \
    --queue-name s3-event-queue \
    --attributes '{
        "VisibilityTimeout": "300",
        "MessageRetentionPeriod": "1209600",
        "ReceiveMessageWaitTimeSeconds": "20"
    }' \
    --query "QueueUrl" --output text)

echo "Queue URL: $QUEUE_URL"

# Get the queue ARN
QUEUE_ARN=$(aws sqs get-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attribute-names QueueArn \
    --query "Attributes.QueueArn" --output text)

echo "Queue ARN: $QUEUE_ARN"
```

### Step 2: Set the SQS Access Policy

S3 needs permission to send messages to your queue.

Allow S3 to send messages to the SQS queue:

```bash
# Set the queue policy to allow S3 to send messages
aws sqs set-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attributes '{
        "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"AllowS3\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"s3.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"'"$QUEUE_ARN"'\",\"Condition\":{\"ArnLike\":{\"aws:SourceArn\":\"arn:aws:s3:::my-bucket\"}}}]}"
    }'
```

### Step 3: Configure S3 Notification to SQS

Configure S3 to send events to the SQS queue:

```bash
aws s3api put-bucket-notification-configuration \
    --bucket my-bucket \
    --notification-configuration '{
        "QueueConfigurations": [
            {
                "Id": "new-object-queue",
                "QueueArn": "'"$QUEUE_ARN"'",
                "Events": ["s3:ObjectCreated:*"],
                "Filter": {
                    "Key": {
                        "FilterRules": [
                            {"Name": "prefix", "Value": "uploads/"},
                            {"Name": "suffix", "Value": ".csv"}
                        ]
                    }
                }
            }
        ]
    }'
```

### Step 4: Process Messages from SQS

Now you can process events by polling the queue.

Process S3 events from SQS with Python:

```python
import boto3
import json
import time

sqs = boto3.client('sqs')
s3 = boto3.client('s3')

QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/s3-event-queue'

def process_messages():
    """Continuously poll SQS for S3 events and process them."""
    while True:
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=20,  # Long polling
            MessageAttributeNames=['All']
        )

        messages = response.get('Messages', [])
        if not messages:
            continue

        for message in messages:
            try:
                # Parse the S3 event from the SQS message
                body = json.loads(message['Body'])

                for record in body.get('Records', []):
                    bucket = record['s3']['bucket']['name']
                    key = record['s3']['object']['key']
                    event_type = record['eventName']

                    print(f"Processing: {event_type} - {bucket}/{key}")

                    # Your processing logic here
                    handle_s3_event(bucket, key, event_type)

                # Delete the message after successful processing
                sqs.delete_message(
                    QueueUrl=QUEUE_URL,
                    ReceiptHandle=message['ReceiptHandle']
                )
                print(f"Message processed and deleted")

            except Exception as e:
                print(f"Error processing message: {e}")
                # Message will become visible again after VisibilityTimeout

def handle_s3_event(bucket, key, event_type):
    """Handle a single S3 event."""
    if 'ObjectCreated' in event_type:
        obj = s3.get_object(Bucket=bucket, Key=key)
        content = obj['Body'].read()
        print(f"Downloaded {key}: {len(content)} bytes")

if __name__ == '__main__':
    print("Starting SQS consumer...")
    process_messages()
```

You can also trigger Lambda from SQS, which gives you the buffer of SQS plus the serverless scaling of Lambda:

```bash
# Create a Lambda event source mapping from SQS
aws lambda create-event-source-mapping \
    --function-name process-s3-events \
    --event-source-arn "$QUEUE_ARN" \
    --batch-size 10 \
    --maximum-batching-window-in-seconds 30
```

## S3 to SNS: Fan-Out to Multiple Subscribers

SNS topics let you fan out S3 events to multiple subscribers - Lambda functions, SQS queues, email addresses, HTTP endpoints, and more.

### Step 1: Create the SNS Topic

Create an SNS topic for S3 events:

```bash
# Create the SNS topic
TOPIC_ARN=$(aws sns create-topic \
    --name s3-events-topic \
    --query "TopicArn" --output text)

echo "Topic ARN: $TOPIC_ARN"
```

### Step 2: Set the SNS Access Policy

Allow S3 to publish to the SNS topic:

```bash
aws sns set-topic-attributes \
    --topic-arn "$TOPIC_ARN" \
    --attribute-name Policy \
    --attribute-value '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowS3Publish",
                "Effect": "Allow",
                "Principal": {"Service": "s3.amazonaws.com"},
                "Action": "sns:Publish",
                "Resource": "'"$TOPIC_ARN"'",
                "Condition": {
                    "ArnLike": {
                        "aws:SourceArn": "arn:aws:s3:::my-bucket"
                    }
                }
            }
        ]
    }'
```

### Step 3: Add Subscribers

Subscribe multiple consumers to the topic:

```bash
# Subscribe a Lambda function
aws sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol lambda \
    --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:image-processor

# Subscribe an SQS queue
aws sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol sqs \
    --notification-endpoint "$QUEUE_ARN"

# Subscribe an email address (for notifications)
aws sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol email \
    --notification-endpoint alerts@example.com

# Subscribe an HTTPS endpoint
aws sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol https \
    --notification-endpoint https://api.example.com/webhooks/s3-events

# List subscriptions
aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN"
```

### Step 4: Configure S3 Notification to SNS

Configure S3 event notifications to the SNS topic:

```bash
aws s3api put-bucket-notification-configuration \
    --bucket my-bucket \
    --notification-configuration '{
        "TopicConfigurations": [
            {
                "Id": "notify-all-creates",
                "TopicArn": "'"$TOPIC_ARN"'",
                "Events": ["s3:ObjectCreated:*"]
            }
        ]
    }'
```

## Combining SQS, SNS, and Lambda

You can combine all three notification types on a single bucket.

Configure multiple notification targets:

```bash
aws s3api put-bucket-notification-configuration \
    --bucket my-bucket \
    --notification-configuration '{
        "LambdaFunctionConfigurations": [
            {
                "Id": "process-images",
                "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:image-processor",
                "Events": ["s3:ObjectCreated:*"],
                "Filter": {
                    "Key": {
                        "FilterRules": [
                            {"Name": "prefix", "Value": "images/"}
                        ]
                    }
                }
            }
        ],
        "QueueConfigurations": [
            {
                "Id": "queue-data-files",
                "QueueArn": "arn:aws:sqs:us-east-1:123456789012:data-processing-queue",
                "Events": ["s3:ObjectCreated:*"],
                "Filter": {
                    "Key": {
                        "FilterRules": [
                            {"Name": "prefix", "Value": "data/"}
                        ]
                    }
                }
            }
        ],
        "TopicConfigurations": [
            {
                "Id": "notify-on-delete",
                "TopicArn": "arn:aws:sns:us-east-1:123456789012:deletion-alerts",
                "Events": ["s3:ObjectRemoved:*"]
            }
        ]
    }'
```

This configuration routes different events to different targets:
- Images go directly to Lambda for immediate processing
- Data files go to SQS for buffered batch processing
- Deletions fan out through SNS to alert multiple subscribers

## Using a Dead-Letter Queue

For critical event processing, add a dead-letter queue to catch messages that fail processing.

Set up a dead-letter queue:

```bash
# Create the DLQ
DLQ_URL=$(aws sqs create-queue \
    --queue-name s3-events-dlq \
    --query "QueueUrl" --output text)

DLQ_ARN=$(aws sqs get-queue-attributes \
    --queue-url "$DLQ_URL" \
    --attribute-names QueueArn \
    --query "Attributes.QueueArn" --output text)

# Set the redrive policy on the main queue
aws sqs set-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attributes '{
        "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"3\"}"
    }'
```

After 3 failed processing attempts, messages move to the DLQ for investigation.

## Testing Your Setup

Verify notifications are flowing correctly:

```bash
# Upload a test file
echo "test data" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://my-bucket/uploads/test.csv

# Check SQS for the message (if using SQS)
aws sqs receive-message \
    --queue-url "$QUEUE_URL" \
    --wait-time-seconds 10 \
    --max-number-of-messages 1

# Check Lambda logs (if using Lambda)
aws logs tail /aws/lambda/image-processor --since 5m
```

## EventBridge as an Alternative

Amazon EventBridge (formerly CloudWatch Events) is a newer alternative for S3 event notifications that supports more advanced filtering, multiple targets per rule, and content-based filtering.

```bash
# Enable EventBridge notifications on your bucket
aws s3api put-bucket-notification-configuration \
    --bucket my-bucket \
    --notification-configuration '{
        "EventBridgeConfiguration": {}
    }'

# Then create EventBridge rules to route events
aws events put-rule \
    --name "s3-upload-rule" \
    --event-pattern '{
        "source": ["aws.s3"],
        "detail-type": ["Object Created"],
        "detail": {
            "bucket": {"name": ["my-bucket"]},
            "object": {"key": [{"prefix": "uploads/"}]}
        }
    }'
```

EventBridge is the more modern approach, but direct S3 notifications to SQS and SNS are simpler to set up and perfectly fine for most use cases.

S3 event notifications are the building blocks of event-driven architectures on AWS. Whether you choose Lambda for immediate processing, SQS for buffered processing, or SNS for fan-out, the pattern is the same: something happens in S3, your code reacts. Pick the right combination for your use case and let AWS handle the plumbing.
