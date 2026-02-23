# How to Create Lambda with SQS Trigger in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, SQS, Event-Driven, Serverless, Message Queue

Description: A practical guide to configuring AWS Lambda with SQS triggers in Terraform, covering event source mappings, batch processing, dead letter queues, and error handling.

---

SQS and Lambda are a natural pairing. SQS provides durable message queuing with guaranteed delivery, and Lambda provides automatic scaling to process those messages. When messages arrive in the queue, Lambda polls for them, pulls batches, and invokes your function. If processing fails, the message goes back to the queue for retry. If it keeps failing, it moves to a dead letter queue.

This pattern is the foundation of decoupled, event-driven architectures. The producer does not need to know or care about the consumer. In this guide, we will set up the complete pipeline in Terraform: the SQS queue, the Lambda function, the event source mapping that connects them, and the error handling that keeps things reliable.

## The Complete Setup

```hcl
# SQS queue that will trigger Lambda
resource "aws_sqs_queue" "orders" {
  name = "order-processing-queue"

  # How long a message is hidden after being received
  # Must be >= Lambda timeout
  visibility_timeout_seconds = 900  # 15 minutes

  # How long messages stay in the queue before being deleted
  message_retention_seconds = 1209600  # 14 days

  # Long polling - reduces empty receives and cost
  receive_wait_time_seconds = 20

  # Server-side encryption
  sqs_managed_sse_enabled = true

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3  # Move to DLQ after 3 failed attempts
  })

  tags = {
    Name = "order-processing-queue"
  }
}

# Dead letter queue for failed messages
resource "aws_sqs_queue" "orders_dlq" {
  name = "order-processing-dlq"

  message_retention_seconds = 1209600  # Keep failed messages for 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "order-processing-dlq"
  }
}

# Lambda function that processes messages
resource "aws_lambda_function" "order_processor" {
  function_name = "order-processor"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 300  # 5 minutes - must be <= visibility_timeout
  memory_size   = 256

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
    }
  }

  tags = {
    Name = "order-processor"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

# Event source mapping - connects SQS to Lambda
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn

  # Batch settings
  batch_size                         = 10   # Process up to 10 messages per invocation
  maximum_batching_window_in_seconds = 5    # Wait up to 5 seconds to fill the batch

  # Enable on creation
  enabled = true

  # Function response types - allows partial batch failure reporting
  function_response_types = ["ReportBatchItemFailures"]

  # Scaling configuration
  scaling_config {
    maximum_concurrency = 10  # Limit concurrent Lambda invocations
  }
}
```

## IAM Permissions

Lambda needs permission to read from the queue and delete processed messages:

```hcl
# IAM role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "order-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# SQS permissions - Lambda needs to receive and delete messages
resource "aws_iam_role_policy" "sqs_access" {
  name = "sqs-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:ChangeMessageVisibility"
      ]
      Resource = [
        aws_sqs_queue.orders.arn,
        aws_sqs_queue.orders_dlq.arn
      ]
    }]
  })
}
```

## Partial Batch Failure Handling

When `function_response_types = ["ReportBatchItemFailures"]` is set, your Lambda function can report which specific messages failed. Lambda only deletes the successful ones and retries the failures:

```python
# index.py - Lambda handler with partial batch failure reporting
import json

def handler(event, context):
    """Process SQS messages with partial failure reporting."""
    batch_item_failures = []

    for record in event['Records']:
        try:
            # Parse the message body
            body = json.loads(record['body'])
            message_id = record['messageId']

            print(f"Processing message {message_id}: {body}")

            # Your processing logic here
            process_order(body)

            print(f"Successfully processed message {message_id}")

        except Exception as e:
            print(f"Failed to process message {record['messageId']}: {str(e)}")
            # Report this message as failed
            batch_item_failures.append({
                "itemIdentifier": record['messageId']
            })

    # Return failed items - Lambda will retry only these
    return {
        "batchItemFailures": batch_item_failures
    }

def process_order(order):
    """Process a single order."""
    # Your business logic here
    order_id = order.get('order_id')
    if not order_id:
        raise ValueError("Missing order_id")
    # ... process the order
```

## FIFO Queue with Lambda

If message ordering matters, use a FIFO queue:

```hcl
# FIFO SQS queue
resource "aws_sqs_queue" "orders_fifo" {
  name                        = "order-processing.fifo"
  fifo_queue                  = true
  content_based_deduplication = true

  visibility_timeout_seconds = 900
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_fifo_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "order-processing-fifo"
  }
}

resource "aws_sqs_queue" "orders_fifo_dlq" {
  name       = "order-processing-dlq.fifo"
  fifo_queue = true

  tags = {
    Name = "order-processing-fifo-dlq"
  }
}

# Event source mapping for FIFO queue
resource "aws_lambda_event_source_mapping" "fifo_trigger" {
  event_source_arn = aws_sqs_queue.orders_fifo.arn
  function_name    = aws_lambda_function.order_processor.arn

  batch_size = 10
  enabled    = true

  # FIFO queues process messages in order within each message group
  # Lambda processes one batch per message group at a time
  function_response_types = ["ReportBatchItemFailures"]
}
```

## Monitoring SQS + Lambda

Track queue depth and processing failures:

```hcl
# Alarm when messages are piling up
resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  alarm_name          = "sqs-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "SQS queue depth is above 1000 messages"

  dimensions = {
    QueueName = aws_sqs_queue.orders.name
  }

  alarm_actions = [var.sns_topic_arn]
}

# Alarm when DLQ has messages (processing failures)
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "sqs-dlq-has-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Dead letter queue has messages - processing failures detected"

  dimensions = {
    QueueName = aws_sqs_queue.orders_dlq.name
  }

  alarm_actions = [var.sns_topic_arn]
}

# Alarm when Lambda errors occur
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "order-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda order processor has more than 5 errors in 5 minutes"

  dimensions = {
    FunctionName = aws_lambda_function.order_processor.function_name
  }

  alarm_actions = [var.sns_topic_arn]
}
```

## Outputs

```hcl
output "queue_url" {
  description = "URL of the SQS queue"
  value       = aws_sqs_queue.orders.url
}

output "queue_arn" {
  description = "ARN of the SQS queue"
  value       = aws_sqs_queue.orders.arn
}

output "dlq_url" {
  description = "URL of the dead letter queue"
  value       = aws_sqs_queue.orders_dlq.url
}

output "lambda_function_name" {
  value = aws_lambda_function.order_processor.function_name
}
```

## Key Considerations

The `visibility_timeout_seconds` on the queue must be greater than or equal to the Lambda function's timeout. If Lambda takes 5 minutes to process a message but the visibility timeout is only 30 seconds, the message becomes visible again and gets processed a second time.

Set `maximum_concurrency` in the `scaling_config` to limit how many Lambda instances run concurrently. Without this, Lambda can scale to thousands of concurrent executions, which might overwhelm downstream services like databases.

The `maximum_batching_window_in_seconds` setting lets Lambda wait for more messages before invoking your function. This reduces the number of invocations (and cost) when message volume is low, at the expense of slightly higher latency.

## Summary

Lambda with SQS in Terraform uses `aws_lambda_event_source_mapping` to connect the queue to the function. The key settings are batch size, batching window, visibility timeout, and concurrency limits. Enable `ReportBatchItemFailures` for partial failure handling so one bad message does not block the entire batch. Always configure a dead letter queue and monitor its depth - messages in the DLQ mean your processing has failures that need attention.
