# How to Create Lambda Event Source Mappings for DynamoDB with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, DynamoDB Streams, CDC, Event Source Mapping, Infrastructure as Code

Description: Learn how to configure Lambda event source mappings for DynamoDB Streams using OpenTofu to process change data capture events and build event-driven applications.

## Introduction

DynamoDB Streams captures item-level changes in a DynamoDB table. Lambda event source mappings consume these change events to trigger real-time processing-useful for audit logs, search index updates, cache invalidation, and cross-region replication.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda, DynamoDB, and IAM permissions

## Step 1: Create DynamoDB Table with Streams Enabled

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  # Enable streams to capture item changes
  stream_enabled   = true
  # KEYS_ONLY: Only key attributes
  # NEW_IMAGE: New item state only
  # OLD_IMAGE: Old item state only
  # NEW_AND_OLD_IMAGES: Both old and new states (recommended)
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = { Name = "orders-table" }
}
```

## Step 2: Create Lambda with DynamoDB Stream Permissions

```hcl
data "archive_file" "zip" {
  type        = "zip"
  source_file = "${path.module}/index.py"
  output_path = "${path.module}/index.zip"
}

resource "aws_iam_role" "lambda" {
  name = "order-stream-handler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dynamodb_streams" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole"
}

resource "aws_iam_role_policy" "dynamodb_dlq" {
  name = "dynamodb-dlq-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "sqs:SendMessage"
      ]
      Resource = aws_sqs_queue.dynamodb_dlq.arn
    }]
  })
}

resource "aws_lambda_function" "stream_handler" {
  function_name    = "order-stream-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  timeout          = 60
  memory_size      = 256
}
```

## Step 3: Create the Event Source Mapping

```hcl
# Standard SQS queue for discarded invocation records after retries are exhausted

resource "aws_sqs_queue" "dynamodb_dlq" {
  name = "dynamodb-stream-failures"
}

resource "aws_lambda_event_source_mapping" "dynamodb" {
  depends_on = [
    aws_iam_role_policy_attachment.dynamodb_streams,
    aws_iam_role_policy.dynamodb_dlq
  ]

  event_source_arn  = aws_dynamodb_table.orders.stream_arn
  function_name     = aws_lambda_function.stream_handler.arn

  # Start from the latest changes (TRIM_HORIZON for all history)
  starting_position = "LATEST"

  # Process up to 100 records per batch
  batch_size = 100

  # Wait for a full batch or this timeout
  maximum_batching_window_in_seconds = 5

  # Retry failed batches up to 3 times
  maximum_retry_attempts = 3

  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.dynamodb_dlq.arn
    }
  }
}
```

## Step 4: Lambda Handler for DynamoDB Stream Events

```python
# index.py - DynamoDB Streams event handler
import json
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """Process DynamoDB stream records."""
    for record in event['Records']:
        event_name = record['eventName']  # INSERT, MODIFY, REMOVE

        if event_name == 'INSERT':
            new_image = deserialize(record['dynamodb']['NewImage'])
            on_insert(new_image)

        elif event_name == 'MODIFY':
            old_image = deserialize(record['dynamodb']['OldImage'])
            new_image = deserialize(record['dynamodb']['NewImage'])
            on_update(old_image, new_image)

        elif event_name == 'REMOVE':
            old_image = deserialize(record['dynamodb']['OldImage'])
            on_delete(old_image)

def deserialize(dynamo_item):
    """Convert DynamoDB JSON format to Python dict."""
    from boto3.dynamodb.types import TypeDeserializer
    d = TypeDeserializer()
    return {k: d.deserialize(v) for k, v in dynamo_item.items()}

def on_insert(item):
    logger.info(f"New order: {item['orderId']}")

def on_update(old, new):
    logger.info(f"Order updated: {new['orderId']}, status: {old.get('status')} -> {new.get('status')}")

def on_delete(item):
    logger.info(f"Order deleted: {item['orderId']}")
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

DynamoDB Streams with Lambda provide a powerful change data capture (CDC) pattern for building event-driven architectures. Use `NEW_AND_OLD_IMAGES` to compare states for change detection, and configure retry limits with an on-failure destination so discarded batches can be investigated. DynamoDB Streams retains records for up to 24 hours, which gives you a recovery window if the Lambda function is temporarily unavailable.
