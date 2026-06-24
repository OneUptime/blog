# How to Configure CloudWatch Log Subscriptions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Log Subscriptions, Kinesis, Lambda, Infrastructure as Code

Description: Learn how to configure CloudWatch Log Subscription Filters with OpenTofu to stream log events in real-time to Lambda, Kinesis Data Streams, or Kinesis Firehose for processing and archival.

## Introduction

CloudWatch Log Subscription Filters stream log events matching a filter pattern to a destination in near-real-time. Destinations include Lambda for custom processing, Kinesis Data Streams for buffering and fan-out, and Amazon Data Firehose for direct delivery to S3. Each log group can have up to two subscription filters.

## Prerequisites

- OpenTofu v1.6+
- An existing CloudWatch Log Group
- AWS credentials with CloudWatch Logs permissions

## Step 1: Stream Logs to Lambda for Processing

```hcl
# Lambda execution role
resource "aws_iam_role" "log_processor" {
  name = "${var.project_name}-log-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "log_processor_basic" {
  role       = aws_iam_role.log_processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda function to process log events

resource "aws_lambda_function" "log_processor" {
  filename         = "log_processor.zip"
  function_name    = "${var.project_name}-log-processor"
  role             = aws_iam_role.log_processor.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  source_code_hash = filebase64sha256("log_processor.zip")
}

# Permission for CloudWatch Logs to invoke Lambda
resource "aws_lambda_permission" "cloudwatch_logs" {
  statement_id  = "AllowCloudWatchLogs"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.log_processor.function_name
  principal     = "logs.${var.region}.amazonaws.com"
  source_arn    = "${var.log_group_arn}:*"
}

# Subscription filter: stream ERROR logs to Lambda
resource "aws_cloudwatch_log_subscription_filter" "errors_to_lambda" {
  name            = "${var.project_name}-errors-to-lambda"
  log_group_name  = var.log_group_name
  filter_pattern  = "ERROR"  # Empty string "" matches all events
  destination_arn = aws_lambda_function.log_processor.arn

  depends_on = [aws_lambda_permission.cloudwatch_logs]
}
```

## Step 2: Stream Logs to Kinesis Data Streams

```hcl
data "aws_caller_identity" "current" {}

resource "aws_kinesis_stream" "logs" {
  name        = "${var.project_name}-logs-stream"
  shard_count = 1

  tags = {
    Name = "${var.project_name}-logs-stream"
  }
}

# IAM role for CloudWatch Logs to put records to Kinesis
resource "aws_iam_role" "cloudwatch_to_kinesis" {
  name = "${var.project_name}-cloudwatch-kinesis-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "logs.amazonaws.com" }
      Condition = {
        StringLike = {
          "aws:SourceArn" = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "cloudwatch_kinesis" {
  name = "kinesis-put-records"
  role = aws_iam_role.cloudwatch_to_kinesis.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["kinesis:PutRecord"]
      Resource = aws_kinesis_stream.logs.arn
    }]
  })
}

resource "aws_cloudwatch_log_subscription_filter" "all_to_kinesis" {
  name            = "${var.project_name}-all-to-kinesis"
  log_group_name  = var.log_group_name
  filter_pattern  = ""  # Match all log events
  destination_arn = aws_kinesis_stream.logs.arn
  role_arn        = aws_iam_role.cloudwatch_to_kinesis.arn
  distribution    = "ByLogStream"

  depends_on = [aws_iam_role_policy.cloudwatch_kinesis]
}
```

## Step 3: Stream Logs to Amazon Data Firehose for S3 Archival

```hcl
# IAM role for CloudWatch Logs to put records to Amazon Data Firehose
resource "aws_iam_role" "cloudwatch_to_firehose" {
  name = "${var.project_name}-cloudwatch-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "logs.amazonaws.com" }
      Condition = {
        StringLike = {
          "aws:SourceArn" = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "cloudwatch_firehose" {
  name = "firehose-put-record"
  role = aws_iam_role.cloudwatch_to_firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["firehose:PutRecord"]
      Resource = var.firehose_delivery_stream_arn
    }]
  })
}

# Stream all logs to S3 via Amazon Data Firehose for long-term archival
resource "aws_cloudwatch_log_subscription_filter" "archive_to_firehose" {
  name            = "${var.project_name}-archive"
  log_group_name  = var.log_group_name
  filter_pattern  = ""
  destination_arn = var.firehose_delivery_stream_arn
  role_arn        = aws_iam_role.cloudwatch_to_firehose.arn

  depends_on = [aws_iam_role_policy.cloudwatch_firehose]
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify subscription filter
aws logs describe-subscription-filters \
  --log-group-name /aws/lambda/my-function
```

## Conclusion

Log subscription filters enable real-time log routing without modifying application code. Use Lambda destinations for custom enrichment or routing logic, Kinesis Streams for buffering with multiple consumers, and Amazon Data Firehose for direct S3 delivery of the gzip-compressed CloudWatch Logs payload. Each log group supports up to two subscription filters, so plan your routing strategy-consider filtering at the pattern level to avoid sending noise to expensive destinations.
