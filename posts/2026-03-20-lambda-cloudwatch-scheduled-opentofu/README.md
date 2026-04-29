# How to Create Lambda with CloudWatch Scheduled Events in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, CloudWatch Events, EventBridge, Scheduled Task, Infrastructure as Code

Description: Learn how to create Lambda functions triggered by CloudWatch/EventBridge scheduled rules using OpenTofu for cron jobs, periodic data processing, and maintenance tasks.

## Introduction

EventBridge (formerly CloudWatch Events) scheduled rules trigger Lambda functions on a fixed rate or cron schedule. This is the AWS serverless equivalent of a cron job, ideal for periodic reports, data cleanup, health checks, and batch processing.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM, Lambda, and EventBridge permissions

## Step 1: Create the Lambda Function

```hcl
data "archive_file" "zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/dist/function.zip"
}

resource "aws_iam_role" "scheduled_lambda" {
  name = "scheduled-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.scheduled_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "daily_report" {
  function_name    = "daily-report-generator"
  role             = aws_iam_role.scheduled_lambda.arn
  handler          = "report.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  timeout          = 300
  memory_size      = 1024

  environment {
    variables = {
      REPORT_BUCKET = var.report_bucket
      RECIPIENTS    = var.report_recipients
    }
  }
}
```

## Step 2: Create Scheduled EventBridge Rules

```hcl
# Daily report at 6 AM UTC using cron expression

resource "aws_cloudwatch_event_rule" "daily_report" {
  name                = "daily-report-trigger"
  description         = "Trigger daily report generation every day at 6 AM UTC"
  schedule_expression = "cron(0 6 * * ? *)"  # 6 AM UTC daily

  tags = { Name = "daily-report-rule" }
}

# Hourly cleanup job using rate expression
resource "aws_cloudwatch_event_rule" "hourly_cleanup" {
  name                = "hourly-cleanup-trigger"
  description         = "Trigger cleanup job every hour"
  schedule_expression = "rate(1 hour)"

  tags = { Name = "hourly-cleanup-rule" }
}

# Weekly report every Monday at 8 AM UTC
resource "aws_cloudwatch_event_rule" "weekly_report" {
  name                = "weekly-report-trigger"
  description         = "Weekly summary report every Monday"
  schedule_expression = "cron(0 8 ? * MON *)"

  tags = { Name = "weekly-report-rule" }
}
```

## Step 3: Add Lambda as Event Target

```hcl
# Target for daily report rule
resource "aws_cloudwatch_event_target" "daily_report" {
  rule      = aws_cloudwatch_event_rule.daily_report.name
  target_id = "DailyReportLambda"
  arn       = aws_lambda_function.daily_report.arn

  # Pass a custom input to the Lambda function
  input = jsonencode({
    reportType = "daily"
    format     = "pdf"
    includeSummary = true
  })
}

resource "aws_cloudwatch_event_target" "hourly_cleanup" {
  rule      = aws_cloudwatch_event_rule.hourly_cleanup.name
  target_id = "HourlyCleanupLambda"
  arn       = aws_lambda_function.daily_report.arn

  input = jsonencode({
    reportType = "cleanup"
    maxAgeDays = 30
  })
}

resource "aws_cloudwatch_event_target" "weekly_report" {
  rule      = aws_cloudwatch_event_rule.weekly_report.name
  target_id = "WeeklyReportLambda"
  arn       = aws_lambda_function.daily_report.arn

  input = jsonencode({
    reportType     = "weekly"
    format         = "pdf"
    includeSummary = true
  })
}
```

## Step 4: Grant EventBridge Permission to Invoke Lambda

```hcl
# Permission for daily report rule
resource "aws_lambda_permission" "allow_daily" {
  statement_id  = "AllowDailyReportEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_report.arn
}

resource "aws_lambda_permission" "allow_hourly" {
  statement_id  = "AllowHourlyCleanupEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.hourly_cleanup.arn
}

resource "aws_lambda_permission" "allow_weekly" {
  statement_id  = "AllowWeeklyReportEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report.arn
}
```

## Step 5: Lambda Handler

```python
# report.py - Scheduled Lambda handler
import os
from datetime import datetime, timezone

def generate_daily_report(event):
    print(
        f"Generating daily report for {os.environ.get('RECIPIENTS', '')} "
        f"and storing output in {os.environ.get('REPORT_BUCKET', '')}"
    )

def generate_weekly_report(event):
    print(
        f"Generating weekly report for {os.environ.get('RECIPIENTS', '')} "
        f"and storing output in {os.environ.get('REPORT_BUCKET', '')}"
    )

def run_cleanup(event):
    max_age_days = event.get('maxAgeDays', 30)
    print(f"Cleaning up data older than {max_age_days} days")

def handler(event, context):
    """Handle scheduled EventBridge invocations."""
    report_type = event.get('reportType', 'daily')
    print(f"Running {report_type} job at {datetime.now(timezone.utc).isoformat()}")

    if report_type == 'daily':
        generate_daily_report(event)
    elif report_type == 'weekly':
        generate_weekly_report(event)
    elif report_type == 'cleanup':
        run_cleanup(event)

    return {'status': 'success', 'reportType': report_type}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EventBridge scheduled rules provide reliable, serverless cron job capabilities without any infrastructure to manage. Cron expressions use the format `cron(minutes hours day-of-month month day-of-week year)` with `?` for unused fields. When reusing the same Lambda across multiple schedule triggers, pass structured input via the target's `input` parameter to make the handler reusable with different configurations.
