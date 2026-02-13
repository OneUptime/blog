# How to Use Lambda Powertools Batch for SQS Processing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SQS, Serverless, Python

Description: Learn how to use AWS Lambda Powertools Batch module to process SQS messages reliably with partial failure handling and clean error reporting.

---

Processing SQS messages in Lambda sounds simple until you run into partial batch failures. A single failed message causes the entire batch to retry, and suddenly you're reprocessing messages that already succeeded. That's where Lambda Powertools Batch comes in - it handles the ugly parts so you don't have to.

## The Problem with Native SQS Batch Processing

When Lambda pulls messages from SQS, it grabs them in batches. If your function throws an error while processing any single message, the whole batch gets sent back to the queue. Every message in that batch - including the ones you already processed successfully - will be retried.

You could wrap each message handler in a try/catch and track failures manually, but that's boilerplate you'll copy across every SQS-triggered function. Lambda Powertools gives you a cleaner approach.

## Setting Up Lambda Powertools

First, install the library. If you're using Python (which is what Powertools supports best), add it to your requirements.

This installs the core Powertools library along with the batch processing extras:

```bash
# Install Lambda Powertools with all extras
pip install aws-lambda-powertools[all]

# Or just the batch processing module
pip install aws-lambda-powertools
```

## Basic Batch Processing

The simplest way to use batch processing is with the `batch_processor` decorator and the `BatchProcessor` class.

Here's a minimal example that processes SQS records one at a time:

```python
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    batch_processor,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord

# Create a processor instance for SQS events
processor = BatchProcessor(event_type=EventType.SQS)


def record_handler(record: SQSRecord):
    """Process a single SQS record."""
    payload = record.json_body
    order_id = payload.get("order_id")

    # Your business logic here
    print(f"Processing order: {order_id}")

    # If this raises, only THIS record fails - not the whole batch
    process_order(order_id)


@batch_processor(record_handler=record_handler, processor=processor)
def lambda_handler(event, context):
    return processor.response()
```

The key thing happening here: if `record_handler` raises an exception for one record, Powertools catches it internally and marks just that record as failed. The other records in the batch continue processing normally.

## How Partial Failures Work

When you return `processor.response()`, it generates a response that tells SQS which specific message IDs failed. SQS then only retries those failed messages.

For this to work, you need to enable partial batch responses on your event source mapping. Here's the CloudFormation for it:

```yaml
# CloudFormation snippet - enable partial batch responses
MyFunctionEventSourceMapping:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    EventSourceArn: !GetAtt MyQueue.Arn
    FunctionName: !Ref MyFunction
    BatchSize: 10
    FunctionResponseTypes:
      - ReportBatchItemFailures  # This is the critical setting
```

Without `ReportBatchItemFailures`, SQS ignores the partial failure response and retries everything anyway.

## Using the Context Manager Pattern

If you prefer more control over the processing flow, use the context manager approach instead of the decorator.

This pattern lets you add custom logic before and after batch processing:

```python
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord

processor = BatchProcessor(event_type=EventType.SQS)


def record_handler(record: SQSRecord):
    payload = record.json_body
    user_id = payload["user_id"]
    action = payload["action"]

    if action == "signup":
        create_user_account(user_id)
    elif action == "delete":
        remove_user_account(user_id)
    else:
        raise ValueError(f"Unknown action: {action}")


def lambda_handler(event, context):
    batch = event["Records"]

    # Context manager gives you more control
    with processor(records=batch, handler=record_handler):
        processed_messages = processor.process()

    # You can inspect results before returning
    for message in processed_messages:
        status = message[0]  # "success" or "fail"
        record = message[1]  # original record
        result = message[2]  # return value or exception

        if status == "fail":
            print(f"Failed record: {record.message_id}, Error: {result}")

    return processor.response()
```

## Processing with Pydantic Models

For production systems, you probably want to validate your message payloads. Powertools integrates nicely with Pydantic for this.

This example validates each SQS message body against a Pydantic model before processing:

```python
from pydantic import BaseModel, validator
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    batch_processor,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord

processor = BatchProcessor(event_type=EventType.SQS)


class OrderEvent(BaseModel):
    order_id: str
    customer_id: str
    amount: float
    currency: str = "USD"

    @validator("amount")
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Order amount must be positive")
        return v


def record_handler(record: SQSRecord):
    # Pydantic validates the payload structure
    order = OrderEvent(**record.json_body)

    # Now you have a typed, validated object
    charge_customer(
        order_id=order.order_id,
        customer_id=order.customer_id,
        amount=order.amount,
        currency=order.currency,
    )


@batch_processor(record_handler=record_handler, processor=processor)
def lambda_handler(event, context):
    return processor.response()
```

If a message doesn't match your schema, Pydantic raises a `ValidationError`, and Powertools marks just that message as failed.

## Handling FIFO Queues

FIFO queues add an extra wrinkle. If a message in a group fails, you generally want to stop processing all remaining messages in that same group to preserve ordering.

Powertools handles this with the `SqsFifoPartialProcessor`:

```python
from aws_lambda_powertools.utilities.batch import (
    SqsFifoPartialProcessor,
    batch_processor,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord

# Use the FIFO-specific processor
processor = SqsFifoPartialProcessor()


def record_handler(record: SQSRecord):
    payload = record.json_body
    print(f"Processing event for group: {record.attributes.get('MessageGroupId')}")
    process_event(payload)


@batch_processor(record_handler=record_handler, processor=processor)
def lambda_handler(event, context):
    return processor.response()
```

When a record fails in a FIFO group, the processor stops processing subsequent records in that same group while continuing to process records from other groups. This preserves message ordering within each group.

## Error Handling and Dead Letter Queues

Pair batch processing with a dead letter queue (DLQ) to catch messages that keep failing. After a configured number of retries, SQS moves the message to the DLQ.

Here's a Terraform config that sets up the queue with a DLQ and the Lambda trigger:

```hcl
# Terraform configuration for SQS with DLQ
resource "aws_sqs_queue" "orders_dlq" {
  name = "orders-dlq"
}

resource "aws_sqs_queue" "orders" {
  name = "orders"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3  # Move to DLQ after 3 failures
  })
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn                   = aws_sqs_queue.orders.arn
  function_name                      = aws_lambda_function.processor.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5

  function_response_types = ["ReportBatchItemFailures"]
}
```

## Monitoring Your Batch Processing

You should track how many records succeed and fail in each invocation. Powertools makes this easy with its built-in metrics.

Add CloudWatch metrics to your batch processing to track success and failure rates:

```python
from aws_lambda_powertools import Metrics
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    batch_processor,
)

processor = BatchProcessor(event_type=EventType.SQS)
metrics = Metrics(namespace="OrderProcessing")


def record_handler(record):
    payload = record.json_body
    process_order(payload)
    metrics.add_metric(name="OrderProcessed", unit=MetricUnit.Count, value=1)


@metrics.log_metrics
@batch_processor(record_handler=record_handler, processor=processor)
def lambda_handler(event, context):
    response = processor.response()

    # Track failure rate
    failed = len(response.get("batchItemFailures", []))
    total = len(event["Records"])
    metrics.add_metric(name="BatchFailures", unit=MetricUnit.Count, value=failed)
    metrics.add_metric(name="BatchTotal", unit=MetricUnit.Count, value=total)

    return response
```

For deeper observability into your Lambda functions and SQS processing pipelines, consider setting up structured monitoring. You can read more about monitoring approaches in our post on [setting up AWS CloudWatch dashboards](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view).

## Common Pitfalls

A few things to watch out for when using batch processing:

1. **Forgetting `ReportBatchItemFailures`** - Without this setting on your event source mapping, partial failures don't work. SQS retries everything.

2. **Idempotency** - Even with partial failures, messages can still be delivered more than once. Make your handlers idempotent. Powertools has an idempotency module that pairs well with batch processing.

3. **Timeout awareness** - If your Lambda times out mid-batch, all unprocessed records get retried. Set your function timeout high enough to handle the maximum batch size.

4. **Visibility timeout** - Set your queue's visibility timeout to at least 6x your Lambda timeout. This prevents messages from becoming visible again while Lambda is still processing them.

## Wrapping Up

Lambda Powertools Batch takes a real pain point - partial SQS batch failures - and solves it cleanly. You write a handler for a single record, and the library deals with tracking successes, failures, and generating the right response format. The FIFO support is a nice bonus if you need ordered processing.

The pattern works the same whether you're processing orders, user events, or any other workload pulled from SQS. Start with the decorator approach for simple cases, switch to the context manager when you need more control, and always remember to enable `ReportBatchItemFailures` on your event source mapping.
