# How to Create Lambda with Dead Letter Queue in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Dead Letter Queue, SQS, SNS, Error Handling, Serverless, Infrastructure as Code

Description: Learn how to configure Lambda dead letter queues with Terraform using SQS and SNS to capture and process failed invocations without losing data.

---

When a Lambda function fails, the event that triggered it can be lost forever. For asynchronous invocations, this means lost data, missed notifications, or incomplete processing. A dead letter queue (DLQ) captures these failed events so you can investigate, fix the issue, and reprocess them. This guide shows you how to configure dead letter queues for Lambda functions using Terraform with both SQS and SNS targets.

## How Lambda Dead Letter Queues Work

Lambda DLQs apply to asynchronous invocations only. When Lambda invokes a function asynchronously (from services like S3, SNS, EventBridge, or direct async invocations), it automatically retries twice on failure. If the function still fails after retries, the event is sent to the configured DLQ instead of being discarded. The DLQ preserves the original event payload so you can analyze what went wrong and reprocess it.

Lambda supports two DLQ targets: SQS queues and SNS topics. SQS queues are better for reprocessing because messages persist until explicitly deleted. SNS topics are better when you need to fan out failures to multiple subscribers.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- Understanding of Lambda async invocations and SQS/SNS

## Lambda DLQ with SQS

SQS is the most common DLQ target because it provides durable message storage with visibility timeout for reprocessing.

```hcl
provider "aws" {
  region = "us-east-1"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda" {
  name = "lambda-dlq-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Permission to send messages to the DLQ
resource "aws_iam_role_policy" "lambda_dlq" {
  name = "lambda-dlq-send"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.lambda_dlq.arn
      }
    ]
  })
}

# Dead letter queue (SQS)
resource "aws_sqs_queue" "lambda_dlq" {
  name = "lambda-failures-dlq"

  # Keep messages for 14 days (maximum)
  message_retention_seconds = 1209600

  # Visibility timeout should be longer than your processing time
  visibility_timeout_seconds = 300

  # Enable server-side encryption
  sqs_managed_sse_enabled = true

  tags = {
    Name    = "lambda-failures-dlq"
    Purpose = "dead-letter-queue"
  }
}

# Lambda function with SQS DLQ
resource "aws_lambda_function" "processor" {
  function_name = "event-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 60
  memory_size = 256

  # Configure the dead letter queue
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }

  tags = {
    Name = "event-processor"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda.zip"
}
```

## Lambda DLQ with SNS

When you need to notify multiple systems about failures, use an SNS topic as the DLQ target.

```hcl
# Permission to publish to SNS
resource "aws_iam_role_policy" "lambda_dlq_sns" {
  name = "lambda-dlq-sns-publish"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.lambda_dlq.arn
      }
    ]
  })
}

# Dead letter topic (SNS)
resource "aws_sns_topic" "lambda_dlq" {
  name = "lambda-failures-topic"

  tags = {
    Name    = "lambda-failures-topic"
    Purpose = "dead-letter-queue"
  }
}

# Subscribe an SQS queue to the SNS topic for message persistence
resource "aws_sqs_queue" "dlq_persistence" {
  name                      = "lambda-dlq-persistence"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sns_topic_subscription" "dlq_to_sqs" {
  topic_arn = aws_sns_topic.lambda_dlq.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.dlq_persistence.arn
}

# Allow SNS to send to the SQS queue
resource "aws_sqs_queue_policy" "dlq_persistence" {
  queue_url = aws_sqs_queue.dlq_persistence.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.dlq_persistence.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.lambda_dlq.arn
          }
        }
      }
    ]
  })
}

# Subscribe an email for notifications (optional)
resource "aws_sns_topic_subscription" "dlq_email" {
  topic_arn = aws_sns_topic.lambda_dlq.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

variable "alert_email" {
  description = "Email address for DLQ notifications"
  type        = string
}

# Lambda function with SNS DLQ
resource "aws_lambda_function" "processor_sns_dlq" {
  function_name = "event-processor-sns-dlq"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 60
  memory_size = 256

  dead_letter_config {
    target_arn = aws_sns_topic.lambda_dlq.arn
  }

  tags = {
    Name = "event-processor-sns-dlq"
  }
}
```

## DLQ Reprocessing Lambda

Create a Lambda function that reads from the DLQ and retries the original function.

```hcl
# IAM policy for the reprocessor
resource "aws_iam_role_policy" "reprocessor" {
  name = "dlq-reprocessor-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.lambda_dlq.arn
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.processor.arn
      }
    ]
  })
}

# Reprocessor Lambda function
resource "aws_lambda_function" "dlq_reprocessor" {
  function_name = "dlq-reprocessor"
  role          = aws_iam_role.lambda.arn
  handler       = "reprocessor.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/reprocessor.zip"

  timeout     = 300
  memory_size = 256

  environment {
    variables = {
      TARGET_FUNCTION = aws_lambda_function.processor.function_name
      MAX_RETRIES     = "3"
    }
  }

  tags = {
    Name    = "dlq-reprocessor"
    Purpose = "reprocess-failed-events"
  }
}

# Event source mapping to process DLQ messages
resource "aws_lambda_event_source_mapping" "dlq_reprocessor" {
  event_source_arn = aws_sqs_queue.lambda_dlq.arn
  function_name    = aws_lambda_function.dlq_reprocessor.arn

  batch_size                         = 1   # Process one failure at a time
  maximum_batching_window_in_seconds = 0

  # Enabled by default, set to false to pause reprocessing
  enabled = true
}
```

## Monitoring DLQ Depth

Set up alarms to detect when failures are accumulating.

```hcl
# SNS topic for operational alerts
resource "aws_sns_topic" "ops_alerts" {
  name = "ops-alerts"
}

# Alarm when DLQ has messages (any failure is worth knowing about)
resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  alarm_name          = "lambda-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Lambda DLQ has failed messages that need attention"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.lambda_dlq.name
  }
}

# Alarm when DLQ depth is growing rapidly
resource "aws_cloudwatch_metric_alarm" "dlq_growing" {
  alarm_name          = "lambda-dlq-growing-fast"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "Lambda DLQ is accumulating failures rapidly - possible systemic issue"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.lambda_dlq.name
  }
}

# Alarm for the Lambda function's own error rate
resource "aws_cloudwatch_metric_alarm" "function_errors" {
  alarm_name          = "lambda-processor-high-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Lambda function error rate is high"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.processor.function_name
  }
}
```

## Outputs

```hcl
output "dlq_url" {
  description = "URL of the dead letter queue"
  value       = aws_sqs_queue.lambda_dlq.url
}

output "dlq_arn" {
  description = "ARN of the dead letter queue"
  value       = aws_sqs_queue.lambda_dlq.arn
}

output "function_name" {
  description = "Name of the Lambda function with DLQ"
  value       = aws_lambda_function.processor.function_name
}

output "reprocessor_function" {
  description = "Name of the DLQ reprocessor function"
  value       = aws_lambda_function.dlq_reprocessor.function_name
}
```

## Best Practices

When configuring dead letter queues, set the SQS message retention to the maximum (14 days) to give yourself time to investigate and reprocess failures. Monitor the DLQ depth and alert immediately when messages appear. Create a reprocessing mechanism so you can retry failed events after fixing the underlying issue. Use separate DLQs for each Lambda function to isolate failure domains. Include enough context in error handling so DLQ messages are actionable. Consider using Lambda Destinations instead of DLQs for newer implementations, as destinations provide more detailed failure information.

## Monitoring with OneUptime

Lambda failures and DLQ accumulation indicate problems that need attention. Use [OneUptime](https://oneuptime.com) to monitor your Lambda error rates, DLQ depth, and overall system health to catch issues before they impact your users.

## Conclusion

Dead letter queues are essential for any asynchronous Lambda workflow where losing events is unacceptable. Terraform makes it easy to configure DLQs alongside your Lambda functions, ensuring every function has proper failure handling from the start. By combining DLQs with monitoring alarms and reprocessing mechanisms, you create a resilient system that captures, alerts on, and recovers from failures automatically.

For more Lambda error handling topics, see our guides on [Lambda with destinations](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-destinations-in-terraform/view) and [Lambda with event source mapping](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-event-source-mapping-in-terraform/view).
