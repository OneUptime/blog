# How to Configure DynamoDB Streams with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Stream, Change Data Capture, Lambda, Infrastructure as Code

Description: Learn how to enable DynamoDB Streams with OpenTofu to capture item-level changes and trigger Lambda functions for real-time change data capture and event-driven processing.

## Introduction

DynamoDB Streams captures a time-ordered sequence of every modification to items in a DynamoDB table, retaining records for 24 hours. Lambda can process these change events in near-real-time, enabling patterns like CDC (Change Data Capture), event sourcing, search index updates, and cross-table denormalization.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM, DynamoDB, Lambda, and SQS permissions

## Step 1: Enable DynamoDB Streams on a Table

```hcl
resource "aws_dynamodb_table" "events" {
  name         = "${var.project_name}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "eventId"
  range_key    = "timestamp"

  attribute {
    name = "eventId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  # Enable streams - capture both old and new item images
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  # Options:
  # KEYS_ONLY        - Only key attributes
  # NEW_IMAGE        - Only new item state
  # OLD_IMAGE        - Only old item state
  # NEW_AND_OLD_IMAGES - Both states

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-events"
  }
}
```

## Step 2: Create Lambda Function for Stream Processing

```hcl
resource "aws_iam_role" "stream_processor" {
  name = "${var.project_name}-stream-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "stream_processor_basic" {
  role       = aws_iam_role.stream_processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "stream_processor_dynamodb" {
  name = "dynamodb-stream-access"
  role = aws_iam_role.stream_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:DescribeStream"
        ]
        Resource = aws_dynamodb_table.events.stream_arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:ListStreams"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = var.dlq_arn
      }
    ]
  })
}

resource "aws_lambda_function" "stream_processor" {
  filename         = "stream_processor.zip"
  function_name    = "${var.project_name}-stream-processor"
  role             = aws_iam_role.stream_processor.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  source_code_hash = filebase64sha256("stream_processor.zip")

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.events.name
    }
  }
}
```

## Step 3: Connect Stream to Lambda

```hcl
resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  event_source_arn  = aws_dynamodb_table.events.stream_arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"  # or "TRIM_HORIZON" for the oldest available records in the stream

  batch_size                         = 100
  maximum_batching_window_in_seconds = 5  # Wait up to 5s to accumulate records

  # Retry and error handling
  maximum_retry_attempts             = 3
  bisect_batch_on_function_error     = true  # Split batch on failure
  maximum_record_age_in_seconds      = 3600  # Discard records older than 1 hour

  # Report failures per item to allow partial batch success
  function_response_types = ["ReportBatchItemFailures"]

  # Filter to only process INSERT and MODIFY events
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT", "MODIFY"]
      })
    }
  }

  destination_config {
    on_failure {
      destination_arn = var.dlq_arn  # Standard SQS queue for discarded batch details
    }
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check stream status

aws dynamodb describe-table \
  --table-name my-project-events \
  --query 'Table.{StreamEnabled: StreamSpecification.StreamEnabled, StreamArn: LatestStreamArn}'
```

## Conclusion

DynamoDB Streams with Lambda enables real-time event-driven architectures that react to every data change. Use filter criteria to process only relevant event types (INSERT/MODIFY/REMOVE) and reduce Lambda invocations. Enable `ReportBatchItemFailures` and return partial batch responses from your handler so Lambda can checkpoint to the first failed record instead of treating the whole batch as failed, reducing unnecessary retries. Use an on-failure destination such as a standard SQS queue to capture discarded batch details for investigation and reprocessing.
