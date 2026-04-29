# How to Configure Lambda Dead Letter Queues with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Dead Letter Queue, SQS, SNS, Error Handling, Infrastructure as Code

Description: Learn how to configure Dead Letter Queues (DLQ) for AWS Lambda functions using OpenTofu to capture and analyze failed async invocations for debugging and recovery.

## Introduction

When a Lambda function invoked asynchronously fails after all retries or exceeds its maximum event age, the event is discarded by default. Configuring a Dead Letter Queue sends these discarded events to an SQS queue or SNS topic for analysis, reprocessing, or alerting. This is essential for production reliability.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda, SQS, CloudWatch, and IAM permissions

## Step 1: Create the Dead Letter Queue

```hcl
# Standard SQS queue as Dead Letter Queue for Lambda failures

resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "${var.function_name}-dlq"
  message_retention_seconds = 1209600  # 14 days (maximum)

  # Encrypt DLQ messages at rest
  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  tags = {
    Name     = "${var.function_name}-dlq"
    Function = var.function_name
    Purpose  = "DeadLetterQueue"
  }
}
```

## Step 2: Create Lambda Function with DLQ

```hcl
resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Grant Lambda permission to send to SQS DLQ
resource "aws_iam_role_policy" "dlq_send" {
  name = "dlq-send-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sqs:SendMessage"
      Resource = aws_sqs_queue.lambda_dlq.arn
    }]
  })
}

resource "aws_lambda_function" "main" {
  function_name    = var.function_name
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  timeout          = 30

  # Configure DLQ - events that fail after all retries or expire go here
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
}

# Async invocation retry configuration (separate resource)
resource "aws_lambda_function_event_invoke_config" "main" {
  function_name                = aws_lambda_function.main.function_name
  maximum_retry_attempts       = 2       # Retry function errors up to 2 times before DLQ
  maximum_event_age_in_seconds = 3600    # Maximum age before Lambda sends the event to the DLQ or discards it
}
```

## Step 3: Configure CloudWatch Alarm for DLQ

```hcl
# Alert when messages appear in the DLQ
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.function_name}-dlq-messages"
  alarm_description   = "Lambda function failures detected in DLQ"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.lambda_dlq.name
  }

  alarm_actions = [var.sns_alert_topic_arn]
}
```

## Step 4: Connect the DLQ to a Reprocessing Function

```hcl
# Event source mapping that sends DLQ messages to a reprocessing Lambda
resource "aws_lambda_event_source_mapping" "dlq_reprocess" {
  event_source_arn = aws_sqs_queue.lambda_dlq.arn
  function_name    = aws_lambda_function.reprocessor.arn
  batch_size       = 1  # Process one at a time for careful retry
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Dead Letter Queues provide a safety net for failed async Lambda invocations, preventing data loss when processing failures occur. Monitor your DLQ with CloudWatch alarms and build reprocessing pipelines for recoverable failures. For new functions, consider using Lambda Destinations instead of DLQs as they provide richer metadata and more routing flexibility.
