# How to Handle SQS Message Visibility Timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, SQS, Visibility Timeout, Message Queue, Cloud, Distributed Systems

Description: Learn how to configure and handle SQS message visibility timeout for reliable message processing, including extension strategies, error handling, and dead letter queues.

---

> The visibility timeout is the key to preventing duplicate message processing in SQS. Get it wrong, and you either lose messages or process them twice.

Amazon SQS visibility timeout determines how long a message stays invisible to other consumers after being received. Understanding and properly configuring this setting is essential for building reliable queue-based systems.

---

## What is Visibility Timeout?

When a consumer receives a message from SQS, the message is not deleted. Instead, it becomes invisible to other consumers for a period called the visibility timeout. During this window, the consumer is expected to process and delete the message. If the consumer fails to delete the message before the timeout expires, the message becomes visible again and can be received by another consumer.

This mechanism provides at-least-once delivery semantics. Your processing logic must be idempotent to handle potential duplicate deliveries.

---

## Default and Maximum Values

| Setting | Value |
|---------|-------|
| Default visibility timeout | 30 seconds |
| Minimum | 0 seconds |
| Maximum | 12 hours (43,200 seconds) |

You can set the visibility timeout at queue creation or modify it later. You can also override it per-message when receiving.

---

## Choosing the Right Timeout Value

The visibility timeout should be longer than your maximum expected processing time, with some buffer.

**Rule of thumb**: Set visibility timeout to 6x your average processing time, with a minimum of 30 seconds.

Consider these factors:

- **Average processing time**: Measure your actual processing duration
- **Worst-case scenarios**: Network latency, downstream service slowdowns
- **Retry overhead**: Time for internal retries within your processor
- **Safety margin**: Add 20-50% buffer for unexpected delays

```python
# Example calculation
average_processing_time = 10  # seconds
safety_multiplier = 6
visibility_timeout = average_processing_time * safety_multiplier  # 60 seconds
```

---

## Setting Visibility Timeout in Python (boto3)

### Queue-Level Configuration

```python
import boto3

sqs = boto3.client('sqs')

# Create queue with custom visibility timeout
response = sqs.create_queue(
    QueueName='my-processing-queue',
    Attributes={
        'VisibilityTimeout': '120'  # 2 minutes, must be string
    }
)

# Update existing queue
sqs.set_queue_attributes(
    QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789/my-queue',
    Attributes={
        'VisibilityTimeout': '180'  # 3 minutes
    }
)
```

### Per-Message Override When Receiving

```python
# Override visibility timeout for this receive call only
response = sqs.receive_message(
    QueueUrl=queue_url,
    MaxNumberOfMessages=10,
    VisibilityTimeout=300,  # 5 minutes for this batch
    WaitTimeSeconds=20      # Long polling
)
```

---

## Extending Visibility Timeout Programmatically

For long-running tasks, extend the visibility timeout before it expires. This is called "heartbeating" the message.

### Basic Extension Pattern

```python
import boto3
import time
from concurrent.futures import ThreadPoolExecutor

sqs = boto3.client('sqs')

def extend_visibility(queue_url: str, receipt_handle: str, timeout: int) -> bool:
    """Extend visibility timeout for a message."""
    try:
        sqs.change_message_visibility(
            QueueUrl=queue_url,
            ReceiptHandle=receipt_handle,
            VisibilityTimeout=timeout
        )
        return True
    except Exception as e:
        print(f"Failed to extend visibility: {e}")
        return False

def process_with_heartbeat(queue_url: str, message: dict, process_fn):
    """
    Process a message while extending visibility timeout periodically.

    Args:
        queue_url: The SQS queue URL
        message: The SQS message dict
        process_fn: Function to process the message body
    """
    receipt_handle = message['ReceiptHandle']
    visibility_timeout = 60  # seconds
    heartbeat_interval = 45  # extend before timeout expires

    stop_heartbeat = False

    def heartbeat_worker():
        """Background thread to extend visibility."""
        while not stop_heartbeat:
            time.sleep(heartbeat_interval)
            if not stop_heartbeat:
                success = extend_visibility(queue_url, receipt_handle, visibility_timeout)
                if not success:
                    break

    # Start heartbeat thread
    executor = ThreadPoolExecutor(max_workers=1)
    heartbeat_future = executor.submit(heartbeat_worker)

    try:
        # Process the message
        result = process_fn(message['Body'])

        # Delete on success
        sqs.delete_message(
            QueueUrl=queue_url,
            ReceiptHandle=receipt_handle
        )
        return result
    finally:
        # Stop heartbeat thread
        stop_heartbeat = True
        executor.shutdown(wait=False)
```

### Batch Visibility Extension

```python
def extend_visibility_batch(queue_url: str, messages: list, timeout: int):
    """
    Extend visibility timeout for multiple messages at once.

    Note: Maximum 10 messages per batch call.
    """
    entries = [
        {
            'Id': str(i),
            'ReceiptHandle': msg['ReceiptHandle'],
            'VisibilityTimeout': timeout
        }
        for i, msg in enumerate(messages)
    ]

    response = sqs.change_message_visibility_batch(
        QueueUrl=queue_url,
        Entries=entries
    )

    # Check for failures
    if response.get('Failed'):
        for failure in response['Failed']:
            print(f"Failed to extend message {failure['Id']}: {failure['Message']}")

    return response
```

---

## Handling Timeout Expiration

When visibility timeout expires before processing completes, the message becomes visible again. Handle this gracefully.

### Idempotent Processing Pattern

```python
import hashlib
import json
from datetime import datetime, timedelta

# Use Redis or DynamoDB for deduplication
import redis

redis_client = redis.Redis(host='localhost', port=6379)

def generate_message_id(message_body: str) -> str:
    """Generate a deterministic ID for deduplication."""
    return hashlib.sha256(message_body.encode()).hexdigest()

def process_message_idempotently(message: dict):
    """
    Process message with deduplication to handle redeliveries.
    """
    body = message['Body']
    message_id = message.get('MessageId')
    dedup_key = f"sqs:processed:{message_id}"

    # Check if already processed
    if redis_client.exists(dedup_key):
        print(f"Message {message_id} already processed, skipping")
        return True

    # Try to acquire processing lock
    lock_key = f"sqs:lock:{message_id}"
    lock_acquired = redis_client.set(lock_key, '1', nx=True, ex=300)

    if not lock_acquired:
        print(f"Message {message_id} is being processed by another consumer")
        return False

    try:
        # Actual processing logic
        result = do_business_logic(body)

        # Mark as processed with TTL (e.g., 24 hours)
        redis_client.set(dedup_key, json.dumps({
            'processed_at': datetime.utcnow().isoformat(),
            'result': result
        }), ex=86400)

        return True
    finally:
        # Release lock
        redis_client.delete(lock_key)

def do_business_logic(body: str):
    """Your actual processing logic here."""
    data = json.loads(body)
    # Process data...
    return {'status': 'success'}
```

---

## Dead Letter Queues for Failed Messages

Configure a Dead Letter Queue (DLQ) to capture messages that fail repeatedly.

### Setting Up DLQ

```python
import boto3
import json

sqs = boto3.client('sqs')

# Create the dead letter queue first
dlq_response = sqs.create_queue(
    QueueName='my-queue-dlq',
    Attributes={
        'MessageRetentionPeriod': '1209600'  # 14 days
    }
)
dlq_url = dlq_response['QueueUrl']

# Get DLQ ARN
dlq_attrs = sqs.get_queue_attributes(
    QueueUrl=dlq_url,
    AttributeNames=['QueueArn']
)
dlq_arn = dlq_attrs['Attributes']['QueueArn']

# Create main queue with DLQ redrive policy
redrive_policy = {
    'deadLetterTargetArn': dlq_arn,
    'maxReceiveCount': '3'  # Move to DLQ after 3 failed attempts
}

main_queue = sqs.create_queue(
    QueueName='my-processing-queue',
    Attributes={
        'VisibilityTimeout': '120',
        'RedrivePolicy': json.dumps(redrive_policy)
    }
)
```

### Processing DLQ Messages

```python
def process_dlq_messages(dlq_url: str):
    """
    Process messages from DLQ for investigation or manual retry.
    """
    while True:
        response = sqs.receive_message(
            QueueUrl=dlq_url,
            MaxNumberOfMessages=10,
            AttributeNames=['All'],
            MessageAttributeNames=['All'],
            WaitTimeSeconds=5
        )

        messages = response.get('Messages', [])
        if not messages:
            break

        for message in messages:
            # Log for investigation
            print(f"DLQ Message ID: {message['MessageId']}")
            print(f"Receive count: {message['Attributes'].get('ApproximateReceiveCount')}")
            print(f"Body: {message['Body']}")

            # Decide: fix and reprocess, or discard
            if can_be_fixed(message):
                fixed_body = fix_message(message['Body'])
                # Send to main queue for reprocessing
                sqs.send_message(
                    QueueUrl=main_queue_url,
                    MessageBody=fixed_body
                )

            # Delete from DLQ
            sqs.delete_message(
                QueueUrl=dlq_url,
                ReceiptHandle=message['ReceiptHandle']
            )
```

---

## Batch Processing Considerations

When processing messages in batches, visibility timeout affects all messages in the batch.

### Batch Processing Pattern

```python
def process_batch_with_individual_timeouts(queue_url: str):
    """
    Process batch of messages, extending timeout individually as needed.
    """
    response = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=10,
        VisibilityTimeout=30,  # Start with short timeout
        WaitTimeSeconds=20
    )

    messages = response.get('Messages', [])
    if not messages:
        return

    successful = []

    for message in messages:
        try:
            # Extend timeout for this specific message before processing
            sqs.change_message_visibility(
                QueueUrl=queue_url,
                ReceiptHandle=message['ReceiptHandle'],
                VisibilityTimeout=120  # 2 minutes for processing
            )

            # Process
            process_single_message(message['Body'])
            successful.append({
                'Id': message['MessageId'],
                'ReceiptHandle': message['ReceiptHandle']
            })

        except Exception as e:
            print(f"Failed to process message {message['MessageId']}: {e}")
            # Message will become visible again after timeout
            # and be retried or sent to DLQ

    # Batch delete successful messages
    if successful:
        sqs.delete_message_batch(
            QueueUrl=queue_url,
            Entries=[
                {'Id': msg['Id'], 'ReceiptHandle': msg['ReceiptHandle']}
                for msg in successful
            ]
        )
```

---

## Monitoring Visibility Timeout Issues

### Key CloudWatch Metrics

| Metric | What It Indicates |
|--------|-------------------|
| `ApproximateNumberOfMessagesVisible` | Messages waiting to be processed |
| `ApproximateNumberOfMessagesNotVisible` | Messages currently being processed |
| `ApproximateAgeOfOldestMessage` | Potential processing delays |
| `NumberOfMessagesReceived` | Compare with deleted to spot redeliveries |
| `NumberOfMessagesDeleted` | Successfully processed messages |

### CloudWatch Alarm for Redeliveries

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

# Alarm when receive count significantly exceeds delete count
# This indicates messages are being redelivered (visibility timeout issues)
cloudwatch.put_metric_alarm(
    AlarmName='SQS-HighRedeliveryRate',
    MetricName='NumberOfMessagesReceived',
    Namespace='AWS/SQS',
    Dimensions=[
        {'Name': 'QueueName', 'Value': 'my-processing-queue'}
    ],
    Statistic='Sum',
    Period=300,  # 5 minutes
    EvaluationPeriods=2,
    Threshold=1000,  # Adjust based on your baseline
    ComparisonOperator='GreaterThanThreshold',
    AlarmDescription='High message receive rate may indicate visibility timeout issues'
)
```

### Custom Metric for Processing Duration

```python
import time
import boto3

cloudwatch = boto3.client('cloudwatch')

def process_with_metrics(queue_url: str, message: dict):
    """Track processing duration to tune visibility timeout."""
    start_time = time.time()

    try:
        result = process_message(message['Body'])
        status = 'Success'
    except Exception as e:
        status = 'Failed'
        raise
    finally:
        duration = (time.time() - start_time) * 1000  # milliseconds

        cloudwatch.put_metric_data(
            Namespace='MyApp/SQS',
            MetricData=[
                {
                    'MetricName': 'MessageProcessingDuration',
                    'Value': duration,
                    'Unit': 'Milliseconds',
                    'Dimensions': [
                        {'Name': 'QueueName', 'Value': 'my-processing-queue'},
                        {'Name': 'Status', 'Value': status}
                    ]
                }
            ]
        )
```

---

## Common Patterns and Pitfalls

### Patterns to Follow

1. **Always delete after successful processing**: Do not rely on visibility timeout for cleanup
2. **Use heartbeating for long tasks**: Extend timeout proactively, not reactively
3. **Make processing idempotent**: Assume messages will be delivered more than once
4. **Configure DLQ with appropriate maxReceiveCount**: Usually 3-5 attempts
5. **Monitor and alert on DLQ depth**: Non-empty DLQ needs investigation

### Pitfalls to Avoid

1. **Setting timeout too short**: Causes duplicate processing and wasted compute
2. **Setting timeout too long**: Delays retry of genuinely failed messages
3. **Forgetting to handle visibility extension failures**: Log and handle gracefully
4. **Processing without deduplication**: Leads to duplicate side effects
5. **Ignoring DLQ**: Failed messages pile up without visibility

---

## Best Practices Summary

| Practice | Recommendation |
|----------|----------------|
| Default timeout | 6x average processing time, minimum 30 seconds |
| Heartbeat interval | 75% of visibility timeout |
| DLQ max receive count | 3-5 attempts before moving to DLQ |
| Idempotency | Always implement, use message ID for deduplication |
| Monitoring | Track processing duration, receive/delete ratio, DLQ depth |
| Batch processing | Extend timeout individually before processing each message |

---

## Conclusion

Visibility timeout is fundamental to SQS reliability. The right configuration prevents both message loss and duplicate processing. Key takeaways:

- Measure your actual processing times and set timeout accordingly
- Implement heartbeating for variable-duration tasks
- Always make your processors idempotent
- Use DLQs to capture and investigate failures
- Monitor metrics to detect timeout-related issues early

With proper visibility timeout handling, your SQS-based systems will be more reliable and easier to operate.

---

**Want to monitor your SQS queues and get alerted when things go wrong?** [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your AWS infrastructure, including custom metrics, alerting, and incident management. Start monitoring your message queues today.
