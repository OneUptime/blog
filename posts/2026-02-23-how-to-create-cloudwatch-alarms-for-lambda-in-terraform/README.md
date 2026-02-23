# How to Create CloudWatch Alarms for Lambda in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, Lambda, Monitoring, Serverless, Infrastructure as Code

Description: Learn how to create CloudWatch alarms for AWS Lambda functions using Terraform to monitor errors, duration, throttling, and concurrency.

---

AWS Lambda functions require specialized monitoring because their serverless nature means you cannot watch traditional server metrics. Instead, you need to track invocation errors, duration, throttling, concurrency, and iterator age. This guide shows you how to create a comprehensive monitoring setup for Lambda functions using Terraform and CloudWatch alarms.

## Setting Up the Foundation

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# SNS topic for Lambda alarm notifications
resource "aws_sns_topic" "lambda_alarms" {
  name = "lambda-alarm-notifications"
}

variable "function_name" {
  type        = string
  description = "Lambda function name to monitor"
}
```

## Error Rate Alarm

```hcl
# Alarm when Lambda errors exceed threshold
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "lambda-errors-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function ${var.function_name} has more than 5 errors in 5 minutes"
  alarm_actions       = [aws_sns_topic.lambda_alarms.arn]
  ok_actions          = [aws_sns_topic.lambda_alarms.arn]

  dimensions = {
    FunctionName = var.function_name
  }
}

# Error rate percentage using math expressions
resource "aws_cloudwatch_metric_alarm" "lambda_error_rate" {
  alarm_name          = "lambda-error-rate-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5  # 5% error rate

  alarm_description = "Lambda error rate exceeds 5%"
  alarm_actions     = [aws_sns_topic.lambda_alarms.arn]
  ok_actions        = [aws_sns_topic.lambda_alarms.arn]

  # Use metric math to calculate error rate percentage
  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate (%)"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.function_name
      }
    }
  }
}
```

## Duration Alarms

```hcl
# Alarm when average duration is too high
resource "aws_cloudwatch_metric_alarm" "lambda_duration_avg" {
  alarm_name          = "lambda-duration-avg-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  # Alert at 80% of the timeout
  threshold           = var.timeout_ms * 0.8
  alarm_description   = "Lambda average duration is approaching timeout"
  alarm_actions       = [aws_sns_topic.lambda_alarms.arn]

  dimensions = {
    FunctionName = var.function_name
  }
}

# Maximum duration alarm to catch outliers
resource "aws_cloudwatch_metric_alarm" "lambda_duration_max" {
  alarm_name          = "lambda-duration-max-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  # Alert at 95% of the timeout
  threshold           = var.timeout_ms * 0.95
  alarm_description   = "Lambda maximum duration is near timeout - potential timeout issues"
  alarm_actions       = [aws_sns_topic.lambda_alarms.arn]

  dimensions = {
    FunctionName = var.function_name
  }
}

variable "timeout_ms" {
  type        = number
  description = "Lambda function timeout in milliseconds"
  default     = 30000
}
```

## Throttling Alarm

```hcl
# Alarm when Lambda invocations are being throttled
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "lambda-throttles-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Lambda function is being throttled - check concurrency limits"
  alarm_actions       = [aws_sns_topic.lambda_alarms.arn]
  ok_actions          = [aws_sns_topic.lambda_alarms.arn]

  dimensions = {
    FunctionName = var.function_name
  }
}
```

## Concurrent Execution Alarm

```hcl
# Monitor concurrent executions approaching the limit
resource "aws_cloudwatch_metric_alarm" "lambda_concurrency" {
  alarm_name          = "lambda-concurrency-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Maximum"
  threshold           = var.concurrency_limit * 0.8
  alarm_description   = "Lambda concurrent executions approaching the limit"
  alarm_actions       = [aws_sns_topic.lambda_alarms.arn]

  dimensions = {
    FunctionName = var.function_name
  }
}

variable "concurrency_limit" {
  type        = number
  description = "Reserved concurrency limit for the function"
  default     = 100
}
```

## Iterator Age for Stream-Based Functions

```hcl
# Monitor iterator age for functions processing Kinesis or DynamoDB streams
resource "aws_cloudwatch_metric_alarm" "lambda_iterator_age" {
  alarm_name          = "lambda-iterator-age-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "IteratorAge"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  # Alert when processing is more than 5 minutes behind
  threshold           = 300000
  alarm_description   = "Lambda stream processing is falling behind - iterator age exceeds 5 minutes"
  alarm_actions       = [aws_sns_topic.lambda_alarms.arn]
  ok_actions          = [aws_sns_topic.lambda_alarms.arn]

  dimensions = {
    FunctionName = var.function_name
  }
}
```

## Dead Letter Queue Monitoring

```hcl
# Monitor the dead letter queue for failed invocations
resource "aws_sqs_queue" "lambda_dlq" {
  name = "${var.function_name}-dlq"
}

resource "aws_cloudwatch_metric_alarm" "lambda_dlq" {
  alarm_name          = "lambda-dlq-messages-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages detected in Lambda DLQ - check for failed invocations"
  alarm_actions       = [aws_sns_topic.lambda_alarms.arn]

  dimensions = {
    QueueName = aws_sqs_queue.lambda_dlq.name
  }
}
```

## Reusable Lambda Monitoring Module

```hcl
# modules/lambda-alarms/main.tf
variable "function_name" { type = string }
variable "sns_topic_arn" { type = string }
variable "error_threshold" { type = number; default = 5 }
variable "timeout_ms" { type = number; default = 30000 }
variable "error_rate_threshold" { type = number; default = 5 }

resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "lambda-errors-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = var.error_threshold
  alarm_actions       = [var.sns_topic_arn]
  ok_actions          = [var.sns_topic_arn]
  dimensions          = { FunctionName = var.function_name }
}

resource "aws_cloudwatch_metric_alarm" "duration" {
  alarm_name          = "lambda-duration-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = var.timeout_ms * 0.8
  alarm_actions       = [var.sns_topic_arn]
  dimensions          = { FunctionName = var.function_name }
}

resource "aws_cloudwatch_metric_alarm" "throttles" {
  alarm_name          = "lambda-throttles-${var.function_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [var.sns_topic_arn]
  ok_actions          = [var.sns_topic_arn]
  dimensions          = { FunctionName = var.function_name }
}
```

## Best Practices

Always monitor error rates as a percentage rather than absolute counts since a few errors during high traffic is different from the same number during low traffic. Set duration alarms relative to your function's timeout to catch functions that are about to time out. Monitor throttling even if you have reserved concurrency since throttles indicate your function needs more capacity. For stream-based functions, iterator age is the most important metric as it shows how far behind your processing has fallen.

For monitoring other AWS services, see our guides on [CloudWatch alarms for ECS](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-ecs-in-terraform/view) and [CloudWatch alarms for ALB](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-alb-in-terraform/view).

## Conclusion

CloudWatch alarms for Lambda functions created through Terraform ensure consistent monitoring across all your serverless workloads. By tracking errors, duration, throttling, concurrency, and stream processing lag, you build a complete picture of your function's health. The reusable module pattern makes it easy to apply the same monitoring standards to every function in your organization.
