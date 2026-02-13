# How to Handle SQS Partial Batch Failures in Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SQS, Lambda, Error Handling

Description: Learn how to implement partial batch failure reporting in Lambda for SQS, so only failed messages are retried instead of the entire batch.

---

Here's a scenario you've probably hit before. Your Lambda function processes a batch of 10 SQS messages. Nine succeed, one fails. What happens? Without partial batch failure reporting, Lambda treats the entire batch as failed. All 10 messages become visible again, and all 10 get reprocessed. The nine that already succeeded? They run again. If your processing isn't idempotent, you've got a problem.

AWS introduced partial batch failure reporting to fix this. Instead of failing the whole batch, your Lambda function tells SQS exactly which messages failed. Only those get retried. Let's set it up properly.

## The Problem Without Partial Failures

Consider this naive handler that doesn't handle partial failures.

```python
import json

def handler(event, context):
    """Naive handler - one failure tanks the whole batch."""
    for record in event["Records"]:
        body = json.loads(record["body"])
        process_order(body)  # If this throws on message 7, messages 1-6 get reprocessed

    return {"statusCode": 200}
```

When `process_order` throws an exception on any message, the Lambda invocation fails. SQS sees the failure and makes ALL messages in the batch visible again. Those messages get picked up by the next Lambda invocation, and the successful ones run through your processing logic again.

This leads to several problems:

- **Duplicate processing**: Messages that already succeeded get processed again.
- **Wasted compute**: You're paying for Lambda execution time to redo work.
- **Poison pill effect**: If one message consistently fails, it blocks the entire batch from making progress.
- **DLQ pollution**: After enough retries, the entire batch (including good messages) might end up in the dead letter queue.

## Enabling Partial Batch Failure Reporting

Two things need to happen: configure the event source mapping and update your Lambda handler.

### Step 1: Configure the Event Source Mapping

Add `function_response_types` to your event source mapping in Terraform.

```hcl
resource "aws_lambda_event_source_mapping" "order_processor" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn
  batch_size       = 10

  maximum_batching_window_in_seconds = 5

  # This is the key setting
  function_response_types = ["ReportBatchItemFailures"]
}
```

If you prefer the AWS CLI:

```bash
aws lambda update-event-source-mapping \
  --uuid "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111" \
  --function-response-types "ReportBatchItemFailures"
```

### Step 2: Update Your Lambda Handler

Your handler must return a specific response format that lists the failed message IDs.

This handler processes each message individually and reports only the failures.

```python
import json

def handler(event, context):
    """Handler with partial batch failure reporting."""
    batch_item_failures = []

    for record in event["Records"]:
        try:
            body = json.loads(record["body"])
            process_order(body)
        except Exception as e:
            # Log the failure but don't raise - we'll report it in the response
            print(f"Failed to process message {record['messageId']}: {e}")
            batch_item_failures.append({
                "itemIdentifier": record["messageId"]
            })

    # Return the list of failed message IDs
    # SQS will only retry these messages
    return {
        "batchItemFailures": batch_item_failures
    }

def process_order(order):
    """Process a single order."""
    if not order.get("order_id"):
        raise ValueError("Missing order_id")
    # ... processing logic
```

The response format is critical. It must be an object with a `batchItemFailures` key containing an array of objects, each with an `itemIdentifier` key set to the message's `messageId`. If you return an empty array, all messages are considered successful. If you return `null` or don't include the key, all messages are considered successful too.

## The TypeScript Version

Here's the same pattern in TypeScript for Node.js Lambda functions.

```typescript
import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";

interface OrderMessage {
  order_id: string;
  customer_id: string;
  total: number;
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Process each message
  const promises = event.Records.map(async (record) => {
    try {
      const order: OrderMessage = JSON.parse(record.body);
      await processOrder(order);
    } catch (error) {
      console.error(`Failed message ${record.messageId}:`, error);
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  });

  // Wait for all to complete
  await Promise.allSettled(promises);

  return { batchItemFailures };
};

async function processOrder(order: OrderMessage): Promise<void> {
  // Your processing logic
  console.log(`Processing order ${order.order_id}`);
}
```

## Handling FIFO Queue Ordering

FIFO queues add a wrinkle. Because messages within a message group must be processed in order, you can't just skip a failed message and continue. If message 3 in a group fails, you shouldn't process messages 4 and 5 from the same group because that would violate ordering.

This handler respects FIFO ordering by stopping processing for a message group when a failure occurs.

```python
import json
from collections import defaultdict

def handler(event, context):
    """FIFO-aware partial batch failure handler."""
    batch_item_failures = []
    failed_groups = set()

    for record in event["Records"]:
        message_group_id = record["attributes"].get("MessageGroupId", "")

        # If this message group already had a failure, skip remaining messages in it
        if message_group_id in failed_groups:
            batch_item_failures.append({
                "itemIdentifier": record["messageId"]
            })
            continue

        try:
            body = json.loads(record["body"])
            process_order(body)
        except Exception as e:
            print(f"Failed message {record['messageId']} "
                  f"(group: {message_group_id}): {e}")
            failed_groups.add(message_group_id)
            batch_item_failures.append({
                "itemIdentifier": record["messageId"]
            })

    return {"batchItemFailures": batch_item_failures}
```

This way, if a message fails, all subsequent messages in the same group are also reported as failed and will be retried in order.

## Error Classification

Not all errors are worth retrying. A malformed message will fail every time. A temporary network glitch will resolve itself. Classify your errors and handle them differently.

```python
import json

class PermanentError(Exception):
    """Error that won't resolve on retry."""
    pass

class TransientError(Exception):
    """Error that may resolve on retry."""
    pass

def handler(event, context):
    """Handler with error classification."""
    batch_item_failures = []

    for record in event["Records"]:
        try:
            body = json.loads(record["body"])
            validate_message(body)
            process_order(body)

        except PermanentError as e:
            # Don't retry - send to a separate error queue or log
            print(f"Permanent failure for {record['messageId']}: {e}")
            send_to_error_queue(record, str(e))
            # Don't add to batch_item_failures - message will be deleted

        except TransientError as e:
            # Retry this message
            print(f"Transient failure for {record['messageId']}: {e}")
            batch_item_failures.append({
                "itemIdentifier": record["messageId"]
            })

        except json.JSONDecodeError as e:
            # Malformed message - permanent failure
            print(f"Invalid JSON in {record['messageId']}: {e}")
            send_to_error_queue(record, f"Invalid JSON: {e}")

    return {"batchItemFailures": batch_item_failures}

def validate_message(body):
    """Validate the message structure."""
    required_fields = ["order_id", "customer_id", "total"]
    missing = [f for f in required_fields if f not in body]
    if missing:
        raise PermanentError(f"Missing fields: {missing}")

def process_order(body):
    """Process with transient error handling."""
    try:
        # Call external service
        response = call_payment_api(body)
    except ConnectionError:
        raise TransientError("Payment API unavailable")
    except TimeoutError:
        raise TransientError("Payment API timeout")
```

## Testing Partial Batch Failures

Test your handler locally by simulating SQS events with mixed success and failure messages.

```python
import json

# Simulate a batch with one bad message
test_event = {
    "Records": [
        {
            "messageId": "msg-001",
            "body": json.dumps({"order_id": "ORD-1", "total": 50}),
            "attributes": {"ApproximateReceiveCount": "1"}
        },
        {
            "messageId": "msg-002",
            "body": "not valid json",  # This will fail
            "attributes": {"ApproximateReceiveCount": "1"}
        },
        {
            "messageId": "msg-003",
            "body": json.dumps({"order_id": "ORD-3", "total": 75}),
            "attributes": {"ApproximateReceiveCount": "1"}
        }
    ]
}

result = handler(test_event, None)

# Verify only msg-002 is reported as failed
assert len(result["batchItemFailures"]) == 1
assert result["batchItemFailures"][0]["itemIdentifier"] == "msg-002"
print("Test passed!")
```

## Monitoring

Watch these metrics to ensure your partial batch failure setup is working:

- **Lambda Errors**: Should be near zero (since you're catching exceptions, not raising them).
- **SQS ApproximateNumberOfMessagesVisible**: Should decrease steadily, not bounce up and down.
- **DLQ message count**: Only truly unprocessable messages should end up here.

For more on monitoring your SQS and Lambda pipeline, check our post on [monitoring SNS with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-sns-cloudwatch/view) which covers related CloudWatch patterns.

## Wrapping Up

Partial batch failure reporting is a must-have for any Lambda function that processes SQS batches. Without it, a single bad message can cause cascading reprocessing of the entire batch. The implementation is straightforward: enable `ReportBatchItemFailures` on your event source mapping, catch exceptions per message in your handler, and return the list of failed message IDs. Classify errors as permanent or transient, and handle FIFO queues carefully to preserve message ordering.
