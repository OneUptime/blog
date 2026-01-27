# How to Use SQS with Lambda

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, SQS, Lambda, Serverless, Event-Driven, Python, Node.js, SAM, CDK

Description: Learn how to integrate Amazon SQS with AWS Lambda using event source mappings, batch processing, error handling, and dead-letter queues for building reliable serverless applications.

---

> The key to reliable SQS-Lambda integration is understanding that Lambda processes messages in batches, and your code must handle partial failures gracefully to prevent message loss or duplicate processing.

## Event Source Mapping

An event source mapping is the glue that connects SQS to Lambda. When you create an event source mapping, Lambda automatically polls the SQS queue and invokes your function with batches of messages. This is a push-based model from your code's perspective - you write a handler that receives messages, and AWS handles the polling.

### How It Works

Lambda maintains a fleet of pollers that continuously long-poll your SQS queue. When messages are available, Lambda:

1. Receives messages from SQS (up to 10 per receive call)
2. Batches messages according to your configuration
3. Invokes your Lambda function synchronously
4. Deletes successfully processed messages from the queue
5. Returns failed messages to the queue (or sends to DLQ)

### SAM Template Configuration

This SAM template creates a Lambda function triggered by an SQS queue. The Events section defines the event source mapping with essential configuration options.

```yaml
# template.yaml - AWS SAM template for SQS-triggered Lambda
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: SQS to Lambda integration with best practices

Resources:
  # The SQS queue that will trigger our Lambda function
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: order-processing-queue
      # How long a message is hidden after being received (must exceed Lambda timeout)
      VisibilityTimeout: 900  # 15 minutes - 6x the Lambda timeout
      # How long messages stay in queue before being deleted
      MessageRetentionPeriod: 1209600  # 14 days (maximum)
      # Enable long polling to reduce empty receives and cost
      ReceiveMessageWaitTimeSeconds: 20
      # Configure dead-letter queue for failed messages
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt OrderDLQ.Arn
        maxReceiveCount: 3  # Move to DLQ after 3 failed attempts

  # Dead-letter queue for messages that fail processing
  OrderDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: order-processing-dlq
      # Keep failed messages longer for investigation
      MessageRetentionPeriod: 1209600  # 14 days

  # Lambda function that processes orders from the queue
  OrderProcessor:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: order-processor
      Runtime: python3.12
      Handler: handler.process_orders
      Timeout: 150  # 2.5 minutes - leave headroom below visibility timeout
      MemorySize: 512
      # IAM permissions are auto-generated for SQS event source
      Events:
        # Event source mapping configuration
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            # Number of messages per Lambda invocation
            BatchSize: 10
            # Wait up to 5 seconds to fill batch before invoking
            MaximumBatchingWindowInSeconds: 5
            # Enable partial batch response for granular error handling
            FunctionResponseTypes:
              - ReportBatchItemFailures
```

### CDK Configuration

The CDK version provides the same configuration with type safety and IDE support. The `SqsEventSource` construct handles the event source mapping creation.

```typescript
// lib/sqs-lambda-stack.ts - AWS CDK stack for SQS-Lambda integration
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class SqsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create dead-letter queue first (dependency for main queue)
    const dlq = new sqs.Queue(this, 'OrderDLQ', {
      queueName: 'order-processing-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Create main queue with DLQ configuration
    const queue = new sqs.Queue(this, 'OrderQueue', {
      queueName: 'order-processing-queue',
      // Visibility timeout must be >= 6x Lambda timeout (AWS recommendation)
      visibilityTimeout: cdk.Duration.minutes(15),
      retentionPeriod: cdk.Duration.days(14),
      // Long polling reduces API calls and cost
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      // Configure dead-letter queue
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,  // Retry 3 times before sending to DLQ
      },
    });

    // Create Lambda function for processing orders
    const processor = new lambda.Function(this, 'OrderProcessor', {
      functionName: 'order-processor',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.process_orders',
      code: lambda.Code.fromAsset('lambda'),
      timeout: cdk.Duration.minutes(2.5),
      memorySize: 512,
    });

    // Add SQS event source to Lambda with batch configuration
    processor.addEventSource(new lambdaEventSources.SqsEventSource(queue, {
      batchSize: 10,                              // Max messages per invocation
      maxBatchingWindow: cdk.Duration.seconds(5), // Wait to fill batch
      reportBatchItemFailures: true,              // Enable partial batch response
    }));
  }
}
```

## Batch Size

Batch size determines how many messages Lambda receives in a single invocation. The default is 10, with a maximum of 10,000 for standard queues (10 for FIFO queues). Larger batches improve throughput but increase the blast radius of failures.

### Choosing the Right Batch Size

Consider these factors when setting batch size:

- **Processing time**: Each message in the batch must complete within your Lambda timeout
- **Memory usage**: All messages are loaded into memory simultaneously
- **Error handling**: Without partial batch response, one failure fails the entire batch
- **Cost optimization**: Larger batches mean fewer Lambda invocations

```python
# handler.py - Python handler demonstrating batch processing
import json
import logging
from typing import Any

# Configure logging for CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def process_orders(event: dict, context: Any) -> dict:
    """
    Process a batch of order messages from SQS.

    Args:
        event: Contains 'Records' array with SQS messages
        context: Lambda context with remaining time, request ID, etc.

    Returns:
        Dict with batchItemFailures for partial batch response
    """
    # Track failed message IDs for partial batch response
    failed_message_ids = []

    # Log batch metadata for debugging
    batch_size = len(event['Records'])
    logger.info(f"Processing batch of {batch_size} messages")

    for record in event['Records']:
        message_id = record['messageId']

        try:
            # Parse the message body (SQS messages are always strings)
            body = json.loads(record['body'])

            # Extract message attributes if present
            attributes = record.get('messageAttributes', {})

            # Process the order (your business logic here)
            process_single_order(body, attributes)

            logger.info(f"Successfully processed message {message_id}")

        except json.JSONDecodeError as e:
            # Invalid JSON - message is malformed, send to DLQ
            logger.error(f"Invalid JSON in message {message_id}: {e}")
            failed_message_ids.append(message_id)

        except Exception as e:
            # Processing error - will be retried
            logger.error(f"Failed to process message {message_id}: {e}")
            failed_message_ids.append(message_id)

    # Return partial batch response (see Partial Batch Response section)
    return {
        'batchItemFailures': [
            {'itemIdentifier': msg_id} for msg_id in failed_message_ids
        ]
    }

def process_single_order(order: dict, attributes: dict) -> None:
    """
    Process a single order. This is where your business logic lives.

    Args:
        order: Parsed order data from message body
        attributes: SQS message attributes
    """
    order_id = order.get('orderId')
    logger.info(f"Processing order {order_id}")

    # Your processing logic here:
    # - Validate order data
    # - Update database
    # - Call external APIs
    # - Send notifications

    # Simulate processing
    if not order_id:
        raise ValueError("Order ID is required")
```

## Batch Window

The batch window (MaximumBatchingWindowInSeconds) tells Lambda to wait up to N seconds to collect messages before invoking your function. This helps fill batches during low-traffic periods, reducing Lambda invocations and cost.

### How Batching Window Works

Lambda invokes your function when either condition is met:
1. The batch reaches BatchSize messages
2. The batching window expires

Without a batching window, Lambda invokes immediately when any message arrives, potentially with just one message per invocation.

```javascript
// handler.js - Node.js handler with batch timing awareness
const { Logger } = require('@aws-lambda-powertools/logger');

// Initialize logger with service name for filtering in CloudWatch
const logger = new Logger({ serviceName: 'order-processor' });

/**
 * Process SQS messages with batch timing information.
 *
 * @param {Object} event - SQS event containing Records array
 * @param {Object} context - Lambda context
 * @returns {Object} Partial batch response with failures
 */
exports.processOrders = async (event, context) => {
  const batchSize = event.Records.length;

  // Calculate batch timing for observability
  // ApproximateFirstReceiveTimestamp is when SQS first delivered the oldest message
  const oldestTimestamp = Math.min(
    ...event.Records.map(r =>
      parseInt(r.attributes.ApproximateFirstReceiveTimestamp)
    )
  );
  const batchAge = Date.now() - oldestTimestamp;

  logger.info('Processing batch', {
    batchSize,
    batchAgeMs: batchAge,
    // Log remaining time to detect timeout issues
    remainingTimeMs: context.getRemainingTimeInMillis(),
  });

  const failedMessageIds = [];

  // Process messages concurrently for better throughput
  // Use Promise.allSettled to handle individual failures
  const results = await Promise.allSettled(
    event.Records.map(record => processRecord(record))
  );

  // Collect failed message IDs
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const messageId = event.Records[index].messageId;
      logger.error('Message processing failed', {
        messageId,
        error: result.reason.message,
      });
      failedMessageIds.push(messageId);
    }
  });

  logger.info('Batch complete', {
    processed: batchSize - failedMessageIds.length,
    failed: failedMessageIds.length,
  });

  // Return partial batch response
  return {
    batchItemFailures: failedMessageIds.map(id => ({ itemIdentifier: id })),
  };
};

/**
 * Process a single SQS record.
 *
 * @param {Object} record - Single SQS record from the batch
 * @returns {Promise<void>}
 */
async function processRecord(record) {
  const body = JSON.parse(record.body);
  const messageId = record.messageId;

  // Access message attributes (set by the sender)
  const priority = record.messageAttributes?.Priority?.stringValue || 'normal';

  // Access system attributes (set by SQS)
  const approximateReceiveCount = parseInt(
    record.attributes.ApproximateReceiveCount
  );

  logger.info('Processing message', {
    messageId,
    priority,
    receiveCount: approximateReceiveCount,
  });

  // Implement idempotency check (see Error Handling section)
  if (await isAlreadyProcessed(messageId)) {
    logger.info('Message already processed, skipping', { messageId });
    return;
  }

  // Your business logic here
  await processOrder(body);

  // Mark as processed for idempotency
  await markAsProcessed(messageId);
}
```

## Partial Batch Response

Partial batch response allows your function to report which specific messages failed, rather than failing the entire batch. Without this feature, one bad message causes all messages in the batch to return to the queue and be reprocessed.

### Enabling Partial Batch Response

To use partial batch response:
1. Set `FunctionResponseTypes: [ReportBatchItemFailures]` in your event source mapping
2. Return a response with `batchItemFailures` array containing failed message IDs

```python
# handler.py - Detailed partial batch response implementation
import json
import logging
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

@dataclass
class ProcessingResult:
    """Result of processing a single message."""
    message_id: str
    success: bool
    error: str | None = None

def process_orders(event: dict, context: Any) -> dict:
    """
    Process orders with partial batch response for granular failure handling.

    The batchItemFailures response tells Lambda which messages failed.
    - Failed messages return to the queue and are retried
    - Successful messages are deleted from the queue
    - This prevents one bad message from blocking the entire batch
    """
    results: list[ProcessingResult] = []

    for record in event['Records']:
        result = process_single_record(record, context)
        results.append(result)

    # Build partial batch response
    # Only include message IDs that failed - successful ones are auto-deleted
    batch_item_failures = [
        {'itemIdentifier': r.message_id}
        for r in results
        if not r.success
    ]

    # Log summary for monitoring
    successful = sum(1 for r in results if r.success)
    failed = len(batch_item_failures)
    logger.info(f"Batch complete: {successful} succeeded, {failed} failed")

    # If all messages failed, you might want to raise an exception
    # to trigger Lambda's built-in error handling and alarms
    if failed == len(results) and len(results) > 0:
        logger.error("All messages in batch failed")
        # Optionally raise to trigger CloudWatch alarms on Lambda errors
        # raise RuntimeError("Complete batch failure")

    return {'batchItemFailures': batch_item_failures}

def process_single_record(record: dict, context: Any) -> ProcessingResult:
    """
    Process a single SQS record with comprehensive error handling.

    Args:
        record: Single SQS record from event['Records']
        context: Lambda context for remaining time checks

    Returns:
        ProcessingResult indicating success or failure
    """
    message_id = record['messageId']

    try:
        # Check remaining time before processing
        # Leave buffer for cleanup operations
        remaining_ms = context.get_remaining_time_in_millis()
        if remaining_ms < 5000:  # Less than 5 seconds remaining
            logger.warning(f"Insufficient time remaining: {remaining_ms}ms")
            return ProcessingResult(
                message_id=message_id,
                success=False,
                error="Insufficient time remaining"
            )

        # Parse and validate message
        body = json.loads(record['body'])
        validate_message(body)

        # Process the message (your business logic)
        process_order(body)

        return ProcessingResult(message_id=message_id, success=True)

    except json.JSONDecodeError as e:
        # Malformed JSON - will never succeed, but let DLQ handle it
        logger.error(f"Invalid JSON in message {message_id}: {e}")
        return ProcessingResult(
            message_id=message_id,
            success=False,
            error=f"Invalid JSON: {e}"
        )

    except ValidationError as e:
        # Invalid message content
        logger.error(f"Validation failed for {message_id}: {e}")
        return ProcessingResult(
            message_id=message_id,
            success=False,
            error=f"Validation error: {e}"
        )

    except TransientError as e:
        # Temporary failure (network, throttling) - retry makes sense
        logger.warning(f"Transient error for {message_id}: {e}")
        return ProcessingResult(
            message_id=message_id,
            success=False,
            error=f"Transient error: {e}"
        )

    except Exception as e:
        # Unexpected error - log full traceback
        logger.exception(f"Unexpected error processing {message_id}")
        return ProcessingResult(
            message_id=message_id,
            success=False,
            error=f"Unexpected error: {e}"
        )
```

## Error Handling

Error handling in SQS-Lambda integration requires understanding the message lifecycle. When your function throws an exception or returns failures, messages return to the queue after the visibility timeout expires and are retried.

### Message Lifecycle

1. **Message sent**: Producer sends message to SQS
2. **Message received**: Lambda polls and receives message (now invisible)
3. **Processing**: Your function processes the message
4. **Success**: Lambda deletes message from queue
5. **Failure**: Message becomes visible again after visibility timeout
6. **Retry**: Lambda receives message again (ApproximateReceiveCount increments)
7. **DLQ**: After maxReceiveCount failures, message moves to DLQ

### Idempotency

Since messages can be delivered multiple times (at-least-once delivery), your handler must be idempotent. Use the message ID or a business identifier to detect duplicates.

```python
# idempotency.py - Idempotency implementation using DynamoDB
import boto3
import hashlib
import json
import time
from botocore.exceptions import ClientError

# DynamoDB table for tracking processed messages
dynamodb = boto3.resource('dynamodb')
idempotency_table = dynamodb.Table('message-idempotency')

# TTL for idempotency records (7 days in seconds)
IDEMPOTENCY_TTL = 7 * 24 * 60 * 60

def get_idempotency_key(message: dict) -> str:
    """
    Generate idempotency key from message content.

    Use business identifier if available, otherwise hash the content.
    Business identifiers are preferable as they handle duplicate sends
    (same order sent twice by producer).

    Args:
        message: Parsed message body

    Returns:
        String key for idempotency lookup
    """
    # Prefer business identifier
    if 'orderId' in message:
        return f"order:{message['orderId']}"

    # Fall back to content hash
    content = json.dumps(message, sort_keys=True)
    content_hash = hashlib.sha256(content.encode()).hexdigest()[:32]
    return f"hash:{content_hash}"

def check_and_set_processing(idempotency_key: str) -> bool:
    """
    Atomically check if message was processed and mark as in-progress.

    Uses DynamoDB conditional write for atomic check-and-set.
    Returns True if this is a new message that should be processed.
    Returns False if message was already processed or is being processed.

    Args:
        idempotency_key: Unique key for this message

    Returns:
        True if processing should proceed, False if duplicate
    """
    current_time = int(time.time())
    ttl = current_time + IDEMPOTENCY_TTL

    try:
        # Atomic conditional put - fails if key exists
        idempotency_table.put_item(
            Item={
                'idempotencyKey': idempotency_key,
                'status': 'PROCESSING',
                'startedAt': current_time,
                'ttl': ttl,
            },
            # Only succeed if key doesn't exist
            ConditionExpression='attribute_not_exists(idempotencyKey)',
        )
        return True  # New message, proceed with processing

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            # Key exists - check if it's a completed or stuck processing
            existing = idempotency_table.get_item(
                Key={'idempotencyKey': idempotency_key}
            ).get('Item')

            if existing:
                status = existing.get('status')
                started_at = existing.get('startedAt', 0)

                # If completed, skip processing
                if status == 'COMPLETED':
                    return False

                # If processing for more than 15 minutes, assume stuck and retry
                if status == 'PROCESSING' and current_time - started_at > 900:
                    # Update to allow retry
                    idempotency_table.update_item(
                        Key={'idempotencyKey': idempotency_key},
                        UpdateExpression='SET #s = :s, startedAt = :t',
                        ExpressionAttributeNames={'#s': 'status'},
                        ExpressionAttributeValues={
                            ':s': 'PROCESSING',
                            ':t': current_time,
                        },
                    )
                    return True

            return False  # Duplicate or in-progress
        raise

def mark_completed(idempotency_key: str) -> None:
    """
    Mark message as successfully processed.

    Args:
        idempotency_key: Key from check_and_set_processing
    """
    idempotency_table.update_item(
        Key={'idempotencyKey': idempotency_key},
        UpdateExpression='SET #s = :s, completedAt = :t',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={
            ':s': 'COMPLETED',
            ':t': int(time.time()),
        },
    )

def mark_failed(idempotency_key: str) -> None:
    """
    Remove idempotency record to allow retry.

    Call this when processing fails and you want the message to be retried.

    Args:
        idempotency_key: Key from check_and_set_processing
    """
    idempotency_table.delete_item(
        Key={'idempotencyKey': idempotency_key}
    )
```

### Using Idempotency in Handler

```python
# handler.py - Handler with idempotency
from idempotency import (
    get_idempotency_key,
    check_and_set_processing,
    mark_completed,
    mark_failed,
)

def process_orders(event: dict, context) -> dict:
    """Process orders with idempotency protection."""
    failed_message_ids = []

    for record in event['Records']:
        message_id = record['messageId']
        body = json.loads(record['body'])

        # Generate idempotency key from message content
        idempotency_key = get_idempotency_key(body)

        # Check if already processed
        if not check_and_set_processing(idempotency_key):
            logger.info(f"Skipping duplicate message: {message_id}")
            continue  # Don't add to failures - let it be deleted

        try:
            # Process the order
            process_order(body)

            # Mark as completed
            mark_completed(idempotency_key)
            logger.info(f"Successfully processed: {message_id}")

        except Exception as e:
            logger.error(f"Failed to process {message_id}: {e}")
            # Remove idempotency record to allow retry
            mark_failed(idempotency_key)
            failed_message_ids.append(message_id)

    return {
        'batchItemFailures': [
            {'itemIdentifier': msg_id} for msg_id in failed_message_ids
        ]
    }
```

## DLQ Configuration

A dead-letter queue (DLQ) captures messages that fail processing repeatedly. Configure the main queue's redrive policy to move messages to the DLQ after a specified number of receive attempts.

### DLQ Setup

```yaml
# template.yaml - Complete DLQ configuration with alarms
Resources:
  # Main processing queue
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: order-queue
      VisibilityTimeout: 900
      RedrivePolicy:
        # Target DLQ for failed messages
        deadLetterTargetArn: !GetAtt OrderDLQ.Arn
        # Move to DLQ after 3 failed attempts
        # Set based on how transient your failures typically are
        maxReceiveCount: 3

  # Dead-letter queue for failed messages
  OrderDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: order-dlq
      # Keep messages for 14 days to allow investigation
      MessageRetentionPeriod: 1209600
      # Optional: Configure a redrive allow policy to control which queues can use this DLQ
      RedriveAllowPolicy:
        redrivePermission: byQueue
        sourceQueueArns:
          - !GetAtt OrderQueue.Arn

  # CloudWatch alarm for DLQ messages (critical - requires attention)
  DLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: order-dlq-messages
      AlarmDescription: Messages in dead-letter queue require investigation
      MetricName: ApproximateNumberOfMessagesVisible
      Namespace: AWS/SQS
      Dimensions:
        - Name: QueueName
          Value: !GetAtt OrderDLQ.QueueName
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      # Send alert when any message lands in DLQ
      AlarmActions:
        - !Ref AlertTopic

  # SNS topic for alerts
  AlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: order-processing-alerts
```

### DLQ Processing Lambda

Create a separate Lambda to process or investigate DLQ messages. This function can attempt reprocessing, send alerts, or log detailed information for debugging.

```python
# dlq_handler.py - Handler for processing dead-letter queue messages
import json
import logging
import boto3
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sqs = boto3.client('sqs')
sns = boto3.client('sns')

# Environment variables
MAIN_QUEUE_URL = os.environ['MAIN_QUEUE_URL']
ALERT_TOPIC_ARN = os.environ['ALERT_TOPIC_ARN']

def process_dlq(event: dict, context) -> dict:
    """
    Process messages from the dead-letter queue.

    Options for each message:
    1. Fix and reprocess
    2. Send to a different queue
    3. Log and delete (acknowledge the failure)
    4. Send alert for manual intervention
    """
    for record in event['Records']:
        message_id = record['messageId']
        body = record['body']

        # Get receive count from original processing attempts
        receive_count = record['attributes'].get('ApproximateReceiveCount', 'unknown')

        # Get the original sent timestamp
        sent_timestamp = record['attributes'].get('SentTimestamp')
        if sent_timestamp:
            sent_time = datetime.fromtimestamp(int(sent_timestamp) / 1000)
            age = datetime.now() - sent_time
        else:
            age = 'unknown'

        logger.error(
            f"DLQ message received",
            extra={
                'messageId': message_id,
                'receiveCount': receive_count,
                'messageAge': str(age),
                'body': body[:1000],  # Truncate for logging
            }
        )

        try:
            parsed_body = json.loads(body)

            # Analyze failure reason
            failure_reason = analyze_failure(parsed_body)

            if failure_reason == 'transient':
                # Transient failure - retry by sending back to main queue
                requeue_message(parsed_body, message_id)
                logger.info(f"Requeued message {message_id} for retry")

            elif failure_reason == 'data_issue':
                # Data issue - alert for manual fix
                send_alert(message_id, parsed_body, "Data validation failure")

            else:
                # Unknown failure - log and alert
                send_alert(message_id, parsed_body, f"Unknown failure: {failure_reason}")

        except json.JSONDecodeError:
            # Malformed message - cannot be fixed, just alert
            send_alert(message_id, body, "Malformed JSON - cannot parse")

    # DLQ handler should generally succeed to remove messages
    # Failures here will cause messages to return to DLQ indefinitely
    return {'statusCode': 200}

def analyze_failure(message: dict) -> str:
    """
    Analyze why a message might have failed.

    In practice, you would check logs, look for patterns,
    or examine the message content for known issues.
    """
    # Example analysis logic
    if 'orderId' not in message:
        return 'data_issue'

    # Check for known transient failure patterns
    # (In reality, you'd check CloudWatch logs or error records)
    return 'unknown'

def requeue_message(message: dict, original_message_id: str) -> None:
    """Send message back to main queue for retry."""
    sqs.send_message(
        QueueUrl=MAIN_QUEUE_URL,
        MessageBody=json.dumps(message),
        MessageAttributes={
            'OriginalMessageId': {
                'DataType': 'String',
                'StringValue': original_message_id,
            },
            'ReprocessedFromDLQ': {
                'DataType': 'String',
                'StringValue': 'true',
            },
        },
    )

def send_alert(message_id: str, content, reason: str) -> None:
    """Send SNS alert for manual intervention."""
    sns.publish(
        TopicArn=ALERT_TOPIC_ARN,
        Subject=f"DLQ Alert: {reason}",
        Message=json.dumps({
            'messageId': message_id,
            'reason': reason,
            'content': str(content)[:500],
            'timestamp': datetime.now().isoformat(),
        }, indent=2),
    )
```

## Scaling Behavior

Lambda automatically scales to process SQS messages. Understanding scaling behavior helps you configure queues and downstream resources appropriately.

### How Lambda Scales with SQS

1. **Initial polling**: Lambda starts with 5 concurrent pollers
2. **Scale up**: If messages are available, Lambda adds 60 pollers per minute
3. **Maximum**: Up to 1,000 concurrent executions (or your account limit)
4. **Scale down**: Pollers are removed when queue is empty

### Controlling Concurrency

Use reserved concurrency to limit how many Lambda instances process messages simultaneously. This protects downstream resources from being overwhelmed.

```yaml
# template.yaml - Concurrency controls
Resources:
  OrderProcessor:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: order-processor
      Handler: handler.process_orders
      Runtime: python3.12
      # Limit concurrent executions to protect downstream resources
      # If database can handle 100 concurrent connections, set this accordingly
      ReservedConcurrentExecutions: 50
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            BatchSize: 10
            # ScalingConfig allows finer control over scaling (Lambda)
            ScalingConfig:
              # Maximum concurrent Lambda functions for this event source
              MaximumConcurrency: 50
```

### Monitoring Scaling

```python
# metrics.py - Custom metrics for scaling visibility
import boto3
from datetime import datetime

cloudwatch = boto3.client('cloudwatch')

def put_processing_metrics(batch_size: int, processing_time_ms: int, queue_name: str) -> None:
    """
    Publish custom metrics for monitoring SQS-Lambda scaling.

    These metrics complement the built-in SQS and Lambda metrics.
    """
    cloudwatch.put_metric_data(
        Namespace='Custom/SQSLambda',
        MetricData=[
            {
                'MetricName': 'BatchSize',
                'Value': batch_size,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'QueueName', 'Value': queue_name},
                ],
            },
            {
                'MetricName': 'ProcessingTime',
                'Value': processing_time_ms,
                'Unit': 'Milliseconds',
                'Dimensions': [
                    {'Name': 'QueueName', 'Value': queue_name},
                ],
            },
            {
                'MetricName': 'MessagesPerSecond',
                'Value': batch_size / (processing_time_ms / 1000) if processing_time_ms > 0 else 0,
                'Unit': 'Count/Second',
                'Dimensions': [
                    {'Name': 'QueueName', 'Value': queue_name},
                ],
            },
        ],
    )
```

### Key Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| ApproximateNumberOfMessagesVisible | SQS | Queue backlog growing |
| ApproximateAgeOfOldestMessage | SQS | Messages waiting too long |
| NumberOfMessagesReceived | SQS | Throughput baseline |
| ConcurrentExecutions | Lambda | Approaching limit |
| Errors | Lambda | Any errors |
| Duration | Lambda | Approaching timeout |
| ApproximateNumberOfMessagesVisible (DLQ) | SQS | Any messages in DLQ |

## Best Practices Summary

### Configuration

- Set visibility timeout to at least 6x your Lambda timeout
- Enable long polling (ReceiveMessageWaitTimeSeconds: 20) to reduce costs
- Use batching window to optimize for cost during low traffic
- Always configure a dead-letter queue

### Code

- Enable partial batch response to handle individual message failures
- Implement idempotency using message ID or business identifiers
- Check remaining time before processing each message
- Log message IDs and batch metadata for debugging

### Error Handling

- Distinguish between transient and permanent failures
- Let transient failures retry naturally through visibility timeout
- Send permanent failures to DLQ after limited retries
- Set up CloudWatch alarms on DLQ message count

### Scaling

- Use reserved concurrency to protect downstream resources
- Monitor queue depth and oldest message age
- Consider FIFO queues if ordering matters (lower throughput)
- Test with production-like load before launch

### Security

- Use IAM roles with least-privilege permissions
- Enable encryption at rest (SSE-SQS or SSE-KMS)
- Enable encryption in transit (HTTPS endpoints)
- Avoid putting sensitive data in message attributes

## Monitoring with OneUptime

Building reliable SQS-Lambda integrations requires comprehensive monitoring. With [OneUptime](https://oneuptime.com), you can monitor your Lambda functions, track SQS queue metrics, set up alerts for DLQ messages, and get notified immediately when processing issues occur. OneUptime provides unified observability across your entire serverless architecture, helping you identify bottlenecks and resolve incidents faster.
