# How to Create Lambda Event Source Mappings for SQS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, SQS, Event Source Mapping, Serverless, Infrastructure as Code

Description: Learn how to create Lambda event source mappings for SQS queues using OpenTofu to trigger functions automatically when messages arrive, with batch processing and error handling.

## Introduction

Lambda event source mappings for SQS enable Lambda to automatically poll and process messages from SQS queues. Lambda manages polling, scaling, and message deletion, while you control batch sizes, concurrency, and error handling behavior.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda, SQS, and IAM permissions

## Step 1: Create SQS Queue

```hcl
# Dead letter queue for failed processing

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.queue_name}-dlq"
  message_retention_seconds = 1209600
}

# Main processing queue
resource "aws_sqs_queue" "main" {
  name                      = var.queue_name
  visibility_timeout_seconds = 185  # 6x the 30-second Lambda timeout plus the 5-second batch window

  # Send failed messages to DLQ after 3 receive attempts
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Name = var.queue_name }
}
```

## Step 2: Create Lambda with SQS Permissions

```hcl
resource "aws_iam_role_policy" "sqs_policy" {
  name = "sqs-processing-policy"
  role = aws_iam_role.lambda.id

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
      Resource = aws_sqs_queue.main.arn
    }]
  })
}

resource "aws_lambda_function" "sqs_processor" {
  function_name    = "sqs-message-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  timeout          = 30  # Queue visibility timeout should be at least 6x this value, plus any batch window
}
```

## Step 3: Create the Event Source Mapping

```hcl
resource "aws_lambda_event_source_mapping" "sqs" {
  event_source_arn = aws_sqs_queue.main.arn
  function_name    = aws_lambda_function.sqs_processor.arn

  # Process up to 100 messages per batch
  batch_size = 100

  # Maximum time to wait for a full batch (0-300 seconds)
  maximum_batching_window_in_seconds = 5

  # Enable partial batch failure reporting
  # Failed messages are returned to the queue, not the whole batch
  function_response_types = ["ReportBatchItemFailures"]

  # Scale to allow up to 5 concurrent Lambda invocations from this queue
  scaling_config {
    maximum_concurrency = 5
  }

  # Only process messages with specific JSON body values
  filter_criteria {
    filter {
      pattern = jsonencode({
        body = {
          eventType = ["ORDER_CREATED", "ORDER_UPDATED"]
        }
      })
    }
  }
}
```

## Step 4: Lambda Handler with Partial Batch Failure

```python
# index.py - SQS Lambda handler with partial batch item failure support
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Process SQS messages with partial batch failure reporting.
    Return failed message IDs so only those are retried.
    """
    failed_message_ids = []

    for record in event['Records']:
        message_id = record['messageId']
        try:
            body = json.loads(record['body'])
            # Process the message
            process_message(body)
            logger.info(f"Successfully processed message: {message_id}")

        except Exception as e:
            logger.error(f"Failed to process message {message_id}: {str(e)}")
            failed_message_ids.append({"itemIdentifier": message_id})

    # Return failed message IDs for targeted retry
    return {
        "batchItemFailures": failed_message_ids
    }

def process_message(body):
    """Process a single message body."""
    print(f"Processing: {json.dumps(body)}")
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Lambda SQS event source mappings with `ReportBatchItemFailures` enable efficient message processing where only genuinely failed messages are retried rather than the entire batch. Set the SQS visibility timeout to at least 6 times the Lambda timeout, plus any batching window, to prevent messages from becoming visible again while processing. Use message filtering to ensure a Lambda only processes relevant JSON message bodies.
