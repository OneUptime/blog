# How to Process SQS Messages in Batch with Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SQS, Lambda, Batch Processing

Description: Learn how to efficiently process SQS messages in batches with AWS Lambda, including configuration, error handling, and performance optimization tips.

---

Processing SQS messages one at a time with Lambda works, but it's not efficient. When you're handling thousands of messages per second, the overhead of invoking a Lambda function for each individual message adds up fast - both in execution time and cost. Batch processing lets Lambda receive up to 10 messages (or up to 10,000 for FIFO queues with batching windows) per invocation, dramatically improving throughput and reducing costs.

Let's walk through setting up batch processing properly, handling errors, and optimizing for performance.

## Basic Batch Setup

The Lambda event source mapping controls how SQS delivers messages to your function. Here's the Terraform configuration.

This event source mapping delivers up to 10 messages per Lambda invocation.

```hcl
resource "aws_lambda_event_source_mapping" "order_processor" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn

  # Number of messages to include in each batch (1-10 for Standard, 1-10000 for FIFO)
  batch_size = 10

  # Wait up to 5 seconds to fill the batch before invoking Lambda
  maximum_batching_window_in_seconds = 5

  enabled = true
}
```

**batch_size** determines the maximum number of messages Lambda receives per invocation. Setting it to 10 means Lambda will be invoked with anywhere from 1 to 10 messages.

**maximum_batching_window_in_seconds** tells Lambda to wait up to this many seconds to accumulate messages before invoking your function. Without this, Lambda invokes immediately when any message is available. With it, Lambda tries to fill the batch first, which reduces the number of invocations at the cost of slightly higher latency.

## Processing the Batch

When Lambda receives a batch, the event contains a `Records` array. Each record is one SQS message.

This Lambda handler processes a batch of order messages.

```python
import json

def handler(event, context):
    """Process a batch of SQS messages."""
    print(f"Received {len(event['Records'])} messages")

    for record in event["Records"]:
        message_id = record["messageId"]
        body = json.loads(record["body"])

        try:
            process_order(body)
            print(f"Successfully processed message {message_id}")
        except Exception as e:
            print(f"Failed to process message {message_id}: {e}")
            raise  # Re-raise to fail the entire batch

    return {"statusCode": 200}

def process_order(order):
    """Your business logic here."""
    order_id = order["order_id"]
    # Process the order...
    print(f"Processing order {order_id}")
```

There's a critical problem with this approach: if one message fails, the entire batch fails. All messages become visible again and will be reprocessed, including the ones that already succeeded. This means your processing must be idempotent, or you'll get duplicate processing.

## Understanding the Event Structure

Here's what a batch event looks like from SQS.

```json
{
  "Records": [
    {
      "messageId": "059f36b4-87a3-44ab-83d2-661975830a7d",
      "receiptHandle": "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
      "body": "{\"order_id\": \"ORD-001\", \"total\": 59.99}",
      "attributes": {
        "ApproximateReceiveCount": "1",
        "SentTimestamp": "1707739800000",
        "SenderId": "AROAIWPX5BD2BHG722MW4",
        "ApproximateFirstReceiveTimestamp": "1707739800123"
      },
      "messageAttributes": {},
      "md5OfBody": "e4e68fb7bd0e697a0ae8f1bb342846b3",
      "eventSource": "aws:sqs",
      "eventSourceARN": "arn:aws:sqs:us-east-1:123456789:orders-queue",
      "awsRegion": "us-east-1"
    },
    {
      "messageId": "2e1424d4-f796-459a-8184-9c92662be6da",
      "receiptHandle": "AQEBzj6ee6L/X5P7q+...",
      "body": "{\"order_id\": \"ORD-002\", \"total\": 129.50}",
      "attributes": {
        "ApproximateReceiveCount": "1",
        "SentTimestamp": "1707739801000"
      },
      "messageAttributes": {},
      "eventSource": "aws:sqs",
      "eventSourceARN": "arn:aws:sqs:us-east-1:123456789:orders-queue",
      "awsRegion": "us-east-1"
    }
  ]
}
```

The `ApproximateReceiveCount` attribute is particularly useful. If a message has been received many times, it's been failing repeatedly. You might want to handle it differently.

## Parallel Processing Within a Batch

Processing messages sequentially within a batch wastes time if each message involves I/O (like API calls or database writes). Use concurrent processing to speed things up.

This handler processes all messages in a batch concurrently using Python's ThreadPoolExecutor.

```python
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

def handler(event, context):
    """Process SQS batch with parallel execution."""
    records = event["Records"]
    results = []

    # Process up to 10 messages in parallel
    with ThreadPoolExecutor(max_workers=min(len(records), 10)) as executor:
        future_to_record = {
            executor.submit(process_message, record): record
            for record in records
        }

        for future in as_completed(future_to_record):
            record = future_to_record[future]
            try:
                future.result()
                results.append({
                    "messageId": record["messageId"],
                    "status": "success"
                })
            except Exception as e:
                results.append({
                    "messageId": record["messageId"],
                    "status": "failed",
                    "error": str(e)
                })

    # Check if any failed
    failures = [r for r in results if r["status"] == "failed"]
    if failures:
        print(f"{len(failures)} messages failed: {failures}")
        raise Exception(f"Batch had {len(failures)} failures")

    return {"statusCode": 200}

def process_message(record):
    """Process a single SQS message."""
    body = json.loads(record["body"])
    # Your processing logic here
    print(f"Processing: {body}")
```

## Handling Partial Batch Failures

The all-or-nothing approach is wasteful. If 9 out of 10 messages succeed, you don't want to reprocess all 10. AWS added partial batch failure reporting to solve this. We cover this in depth in our post on [handling SQS partial batch failures in Lambda](https://oneuptime.com/blog/post/handle-sqs-partial-batch-failures-lambda/view), but here's the quick version.

Enable it in your event source mapping.

```hcl
resource "aws_lambda_event_source_mapping" "order_processor" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn
  batch_size       = 10

  # Enable partial batch failure reporting
  function_response_types = ["ReportBatchItemFailures"]
}
```

Then return the failed message IDs from your handler.

```python
import json

def handler(event, context):
    """Process batch with partial failure reporting."""
    batch_item_failures = []

    for record in event["Records"]:
        try:
            body = json.loads(record["body"])
            process_order(body)
        except Exception as e:
            print(f"Failed message {record['messageId']}: {e}")
            batch_item_failures.append({
                "itemIdentifier": record["messageId"]
            })

    return {
        "batchItemFailures": batch_item_failures
    }
```

Lambda will only retry the failed messages. The successful ones are deleted from the queue.

## Performance Tuning

### Batch Size vs. Batching Window

Finding the right balance between batch size and batching window depends on your workload.

| Scenario | Batch Size | Batching Window | Why |
|---|---|---|---|
| Low latency required | 1-5 | 0 | Process messages immediately |
| High throughput | 10 | 5-10 seconds | Maximize messages per invocation |
| Cost optimization | 10 | 10-20 seconds | Fewer invocations = lower cost |
| Variable traffic | 10 | 5 seconds | Good balance for most workloads |

### Visibility Timeout

Set your queue's visibility timeout to at least 6x your function's timeout. If your Lambda has a 5-minute timeout, set visibility timeout to 30 minutes.

```hcl
resource "aws_sqs_queue" "orders" {
  name                       = "orders-queue"
  visibility_timeout_seconds = 1800  # 30 minutes (6x Lambda timeout)
}

resource "aws_lambda_function" "order_processor" {
  function_name = "order-processor"
  timeout       = 300  # 5 minutes
  # ... other config
}
```

If the visibility timeout is too short, a message might become visible again while Lambda is still processing it, leading to duplicate processing.

### Concurrency Control

Limit Lambda concurrency to prevent overwhelming downstream systems.

```hcl
resource "aws_lambda_event_source_mapping" "order_processor" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn
  batch_size       = 10

  scaling_config {
    maximum_concurrency = 20  # Max 20 concurrent Lambda invocations
  }
}
```

With a batch size of 10 and max concurrency of 20, you can process up to 200 messages simultaneously. Adjust based on what your database or downstream APIs can handle.

## Monitoring Batch Processing

Keep an eye on these CloudWatch metrics for your queue:

- **ApproximateNumberOfMessagesVisible**: Messages waiting to be processed. If this grows, you need more concurrency.
- **ApproximateAgeOfOldestMessage**: How long the oldest message has been waiting. If this grows, you're falling behind.
- **NumberOfMessagesSent** to DLQ: Failed messages. Should be as close to zero as possible.

And these Lambda metrics:
- **Duration**: Average processing time per batch.
- **Errors**: Failed invocations.
- **ConcurrentExecutions**: How many instances are running.

## Wrapping Up

Batch processing SQS messages with Lambda is the way to go for any production workload. Set your batch size and batching window based on your latency and throughput requirements, enable partial batch failure reporting to avoid reprocessing successful messages, and tune your visibility timeout and concurrency limits to match your system's capacity. The combination of SQS batching with Lambda's auto-scaling gives you a processing pipeline that handles traffic spikes gracefully.
