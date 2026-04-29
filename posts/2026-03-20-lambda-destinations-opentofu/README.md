# How to Set Up Lambda Destinations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Destinations, EventBridge, SQS, Serverless, Infrastructure as Code

Description: Learn how to configure Lambda Destinations using OpenTofu to automatically route successful and failed asynchronous invocations to SQS, SNS, EventBridge, or another Lambda function.

## Introduction

Lambda Destinations allow you to route the result of an asynchronous function invocation to a target service based on success or failure. This replaces polling or manual Dead Letter Queue handling with a fully managed, event-driven pattern for post-processing results.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda, SQS, SNS, and EventBridge permissions

## Step 1: Create Destination Queues and Topics

```hcl
# SQS queue for successful invocations

resource "aws_sqs_queue" "success" {
  name                      = "lambda-success-destination"
  message_retention_seconds = 86400  # 1 day

  tags = { Name = "lambda-success-queue" }
}

# SQS queue for failed invocations
resource "aws_sqs_queue" "failure" {
  name                       = "lambda-failure-destination"
  message_retention_seconds  = 86400

  tags = { Name = "lambda-failure-queue" }
}

# SNS topic for failure alerts
resource "aws_sns_topic" "failure_alerts" {
  name = "lambda-failure-alerts"
}

# Email subscription for failure alerts
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.failure_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

variable "alert_email" {
  description = "Email address to receive failure notifications"
  type        = string
}
```

## Step 2: Create the Lambda Function

```hcl
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda" {
  name               = "async-processor-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "archive_file" "zip" {
  type        = "zip"
  source_file = "${path.module}/index.py"
  output_path = "${path.module}/processor.zip"
}

resource "aws_lambda_function" "processor" {
  function_name    = "async-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256

  tags = { Name = "async-processor" }
}

# Configure retry behavior and destinations for async invocations
resource "aws_lambda_function_event_invoke_config" "processor" {
  function_name                = aws_lambda_function.processor.function_name
  maximum_event_age_in_seconds = 3600    # Keep the async event for up to 1 hour
  maximum_retry_attempts       = 2       # Retry twice before failure destination

  destination_config {
    on_success {
      destination = aws_sqs_queue.success.arn
    }

    on_failure {
      destination = aws_sqs_queue.failure.arn
    }
  }
}
```

## Step 3: Configure EventBridge Destination

```hcl
# EventBridge bus for downstream processing
resource "aws_cloudwatch_event_bus" "results" {
  name = "lambda-results"
}

# To route successful results to EventBridge instead of SQS, update the
# on_success destination in aws_lambda_function_event_invoke_config.processor:
#
# on_success {
#   destination = aws_cloudwatch_event_bus.results.arn
# }
#
# You can also swap the failure destination to SNS:
#
# on_failure {
#   destination = aws_sns_topic.failure_alerts.arn
# }
```

## Step 4: Grant Lambda Permission to Write to Destinations

```hcl
# Lambda execution role needs permission to send to destination services
resource "aws_iam_role_policy" "destinations" {
  name = "lambda-destination-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sqs:SendMessage"
        Resource = [
          aws_sqs_queue.success.arn,
          aws_sqs_queue.failure.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = "sns:Publish"
        Resource = aws_sns_topic.failure_alerts.arn
      },
      {
        Effect   = "Allow"
        Action   = "events:PutEvents"
        Resource = aws_cloudwatch_event_bus.results.arn
      }
    ]
  })
}
```

## Step 5: Process Destination Messages

```python
# Process messages from the success destination queue
# The Lambda destination message includes function name, result, and metadata
import json

def process_result(event, context):
    for record in event['Records']:
        message = json.loads(record['body'])

        # Extract the original function's response payload
        response_payload = message['responsePayload']

        # Process the successful result
        print(f"Function: {message['requestContext']['functionArn']}")
        print(f"Result: {json.dumps(response_payload)}")
        print(f"Request ID: {message['requestContext']['requestId']}")
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Lambda Destinations provide a clean pattern for handling async invocation results without polling or complex retry logic. The destination message includes the original request payload, response payload, function metadata, and request context-giving downstream consumers full visibility into the invocation outcome. Use SQS destinations when order doesn't matter, SNS for fan-out to multiple consumers, and EventBridge for complex routing rules.
