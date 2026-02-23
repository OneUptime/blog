# How to Create Serverless Cron Jobs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Serverless, Cron, EventBridge, Lambda

Description: Learn how to create serverless cron jobs with Terraform using EventBridge rules and Lambda functions for scheduled tasks without managing any servers.

---

Scheduled tasks are a common requirement in any application. Whether you need to generate daily reports, clean up stale data, send reminder emails, or sync data between systems, cron jobs are the traditional solution. In a serverless architecture, you replace cron with Amazon EventBridge scheduled rules that trigger Lambda functions. This gives you the same scheduling capability without managing servers, and you only pay when the job actually runs.

This guide covers how to create serverless cron jobs with Terraform, including scheduling expressions, error handling, monitoring, and common patterns.

## Basic Cron Job Setup

### Simple Scheduled Lambda Function

```hcl
# Lambda function for the cron job
resource "aws_lambda_function" "daily_cleanup" {
  filename         = data.archive_file.cleanup.output_path
  function_name    = "daily-data-cleanup"
  role             = aws_iam_role.cron_lambda.arn
  handler          = "cleanup.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.cleanup.output_base64sha256
  timeout          = 900  # 15 minutes max
  memory_size      = 512

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.main.name
      RETENTION_DAYS = "30"
      LOG_LEVEL      = "INFO"
    }
  }
}

# EventBridge rule for scheduling
resource "aws_cloudwatch_event_rule" "daily_cleanup" {
  name                = "daily-data-cleanup"
  description         = "Run data cleanup every day at 2 AM UTC"
  schedule_expression = "cron(0 2 * * ? *)"  # 2 AM UTC every day

  tags = {
    Job = "data-cleanup"
  }
}

# Connect the rule to the Lambda function
resource "aws_cloudwatch_event_target" "daily_cleanup" {
  rule      = aws_cloudwatch_event_rule.daily_cleanup.name
  target_id = "DailyCleanupLambda"
  arn       = aws_lambda_function.daily_cleanup.arn
}

# Allow EventBridge to invoke the Lambda function
resource "aws_lambda_permission" "daily_cleanup" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cleanup.arn
}
```

## Schedule Expression Types

EventBridge supports two types of schedule expressions:

### Cron Expressions

```hcl
# Every 5 minutes
resource "aws_cloudwatch_event_rule" "every_5_minutes" {
  name                = "every-5-minutes"
  schedule_expression = "cron(0/5 * * * ? *)"
}

# Every hour at minute 30
resource "aws_cloudwatch_event_rule" "hourly" {
  name                = "hourly-at-30"
  schedule_expression = "cron(30 * * * ? *)"
}

# Every weekday at 9 AM UTC
resource "aws_cloudwatch_event_rule" "weekday_morning" {
  name                = "weekday-morning"
  schedule_expression = "cron(0 9 ? * MON-FRI *)"
}

# First day of every month at midnight
resource "aws_cloudwatch_event_rule" "monthly" {
  name                = "first-of-month"
  schedule_expression = "cron(0 0 1 * ? *)"
}

# Every Sunday at 3 AM UTC
resource "aws_cloudwatch_event_rule" "weekly" {
  name                = "weekly-sunday"
  schedule_expression = "cron(0 3 ? * SUN *)"
}
```

### Rate Expressions

```hcl
# Every 1 minute
resource "aws_cloudwatch_event_rule" "every_minute" {
  name                = "every-minute"
  schedule_expression = "rate(1 minute)"
}

# Every 6 hours
resource "aws_cloudwatch_event_rule" "every_6_hours" {
  name                = "every-6-hours"
  schedule_expression = "rate(6 hours)"
}

# Every 7 days
resource "aws_cloudwatch_event_rule" "every_week" {
  name                = "every-week"
  schedule_expression = "rate(7 days)"
}
```

## Multiple Cron Jobs with Dynamic Configuration

Use a map to define multiple cron jobs efficiently:

```hcl
# Define all cron jobs in a local map
locals {
  cron_jobs = {
    data_cleanup = {
      description = "Clean up expired data"
      schedule    = "cron(0 2 * * ? *)"
      handler     = "cleanup.handler"
      timeout     = 900
      memory      = 512
      env_vars = {
        TABLE_NAME     = aws_dynamodb_table.main.name
        RETENTION_DAYS = "30"
      }
    }
    daily_report = {
      description = "Generate daily summary report"
      schedule    = "cron(0 6 * * ? *)"
      handler     = "reports.daily"
      timeout     = 300
      memory      = 1024
      env_vars = {
        REPORT_BUCKET = aws_s3_bucket.reports.id
        EMAIL_TOPIC   = aws_sns_topic.reports.arn
      }
    }
    sync_external = {
      description = "Sync data with external API"
      schedule    = "rate(1 hour)"
      handler     = "sync.handler"
      timeout     = 120
      memory      = 256
      env_vars = {
        EXTERNAL_API_URL = "https://api.example.com"
      }
    }
    health_check = {
      description = "Check health of dependent services"
      schedule    = "rate(5 minutes)"
      handler     = "health.check"
      timeout     = 30
      memory      = 128
      env_vars = {
        ALERT_TOPIC = aws_sns_topic.alerts.arn
      }
    }
    weekly_digest = {
      description = "Send weekly digest emails"
      schedule    = "cron(0 9 ? * MON *)"
      handler     = "digest.weekly"
      timeout     = 600
      memory      = 512
      env_vars = {
        EMAIL_TOPIC = aws_sns_topic.digest.arn
      }
    }
  }
}

# Create Lambda functions for each cron job
resource "aws_lambda_function" "cron_jobs" {
  for_each = local.cron_jobs

  filename         = data.archive_file.cron_functions.output_path
  function_name    = "cron-${each.key}"
  role             = aws_iam_role.cron_lambda.arn
  handler          = each.value.handler
  runtime          = "python3.12"
  source_code_hash = data.archive_file.cron_functions.output_base64sha256
  timeout          = each.value.timeout
  memory_size      = each.value.memory

  environment {
    variables = each.value.env_vars
  }
}

# Create EventBridge rules for each cron job
resource "aws_cloudwatch_event_rule" "cron_jobs" {
  for_each = local.cron_jobs

  name                = "cron-${each.key}"
  description         = each.value.description
  schedule_expression = each.value.schedule
}

# Connect rules to Lambda functions
resource "aws_cloudwatch_event_target" "cron_jobs" {
  for_each = local.cron_jobs

  rule      = aws_cloudwatch_event_rule.cron_jobs[each.key].name
  target_id = "CronLambda"
  arn       = aws_lambda_function.cron_jobs[each.key].arn

  # Retry policy for failed invocations
  retry_policy {
    maximum_event_age_in_seconds = 3600
    maximum_retry_attempts       = 2
  }

  # Send failed events to DLQ
  dead_letter_config {
    arn = aws_sqs_queue.cron_dlq.arn
  }
}

# Lambda permissions for each cron job
resource "aws_lambda_permission" "cron_jobs" {
  for_each = local.cron_jobs

  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron_jobs[each.key].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cron_jobs[each.key].arn
}
```

## Error Handling and Monitoring

```hcl
# Dead letter queue for failed cron invocations
resource "aws_sqs_queue" "cron_dlq" {
  name                       = "cron-job-dlq"
  message_retention_seconds  = 1209600  # 14 days
  visibility_timeout_seconds = 300
}

# SNS topic for cron job alerts
resource "aws_sns_topic" "cron_alerts" {
  name = "cron-job-alerts"
}

# CloudWatch alarm for cron job errors
resource "aws_cloudwatch_metric_alarm" "cron_errors" {
  for_each = local.cron_jobs

  alarm_name          = "cron-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Cron job ${each.key} has errors"

  dimensions = {
    FunctionName = aws_lambda_function.cron_jobs[each.key].function_name
  }

  alarm_actions = [aws_sns_topic.cron_alerts.arn]
}

# CloudWatch alarm for cron job duration
resource "aws_cloudwatch_metric_alarm" "cron_duration" {
  for_each = local.cron_jobs

  alarm_name          = "cron-${each.key}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  # Alert at 80% of timeout
  threshold           = each.value.timeout * 800
  alarm_description   = "Cron job ${each.key} is approaching timeout"

  dimensions = {
    FunctionName = aws_lambda_function.cron_jobs[each.key].function_name
  }

  alarm_actions = [aws_sns_topic.cron_alerts.arn]
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "cron_jobs" {
  for_each = local.cron_jobs

  name              = "/aws/lambda/cron-${each.key}"
  retention_in_days = 14
}
```

## Passing Custom Input to Cron Jobs

```hcl
# EventBridge target with custom input
resource "aws_cloudwatch_event_target" "with_input" {
  rule      = aws_cloudwatch_event_rule.daily_cleanup.name
  target_id = "CleanupWithInput"
  arn       = aws_lambda_function.daily_cleanup.arn

  # Pass custom JSON input to the Lambda function
  input = jsonencode({
    action     = "cleanup"
    table_name = aws_dynamodb_table.main.name
    config = {
      retention_days = 30
      dry_run        = false
      batch_size     = 100
    }
  })
}
```

## IAM Role for Cron Lambda Functions

```hcl
resource "aws_iam_role" "cron_lambda" {
  name = "cron-lambda-role"

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

resource "aws_iam_role_policy_attachment" "cron_basic" {
  role       = aws_iam_role.cron_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "cron_permissions" {
  name = "cron-permissions"
  role = aws_iam_role.cron_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Scan",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.reports.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.reports.arn,
          aws_sns_topic.alerts.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.cron_dlq.arn
      }
    ]
  })
}
```

## Outputs

```hcl
output "cron_job_functions" {
  description = "Map of cron job function names"
  value       = { for k, v in aws_lambda_function.cron_jobs : k => v.function_name }
}

output "cron_schedules" {
  description = "Map of cron job schedules"
  value       = { for k, v in local.cron_jobs : k => v.schedule }
}
```

## Monitoring with OneUptime

Cron jobs are often forgotten until they fail. OneUptime provides scheduled task monitoring that verifies your cron jobs run on time and complete successfully. If a scheduled job misses its window or fails silently, OneUptime alerts you immediately. Visit [OneUptime](https://oneuptime.com) to monitor your serverless cron jobs.

## Conclusion

Serverless cron jobs with Terraform replace traditional server-based schedulers with a fully managed, scalable solution. EventBridge rules provide flexible scheduling with cron and rate expressions, while Lambda functions handle the actual work. The dynamic map pattern makes it easy to manage many cron jobs consistently, with shared error handling and monitoring. By defining cron jobs in Terraform, you get version-controlled scheduling, consistent monitoring across all jobs, and easy environment replication. The key is to always include error handling with dead letter queues and monitoring with CloudWatch alarms for every scheduled task.

For related serverless patterns, see [How to Create Serverless API Backend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-api-backend-with-terraform/view) and [How to Create Step Functions Workflows with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-step-functions-workflows-with-terraform/view).
