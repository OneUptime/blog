# How to Configure S3 Event Notifications with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Event Notification, Lambda, SQS, EventBridge, Infrastructure as Code

Description: Learn how to configure S3 event notifications using OpenTofu to trigger Lambda functions, send messages to SQS, or publish to SNS when objects are created, deleted, or modified.

## Introduction

S3 event notifications let you react in real time to changes in S3 buckets. When an object is created, deleted, or restored from Glacier, S3 can automatically trigger a Lambda function, send a message to SQS, publish to SNS, or route events through EventBridge.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3, Lambda, SQS, SNS, EventBridge, and IAM permissions

## Step 1: Create Processing Resources

```hcl
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-uploads"
  tags   = { Name = "uploads" }
}

# Lambda function to process uploaded files

resource "aws_lambda_function" "processor" {
  function_name    = "s3-upload-processor"
  role             = var.lambda_role_arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  timeout          = 60
}

# SQS queue for image processing jobs
resource "aws_sqs_queue" "image_processing" {
  name                      = "image-processing-queue"
  visibility_timeout_seconds = 300

  tags = { Name = "image-processing" }
}

# SNS topic for notifications
resource "aws_sns_topic" "upload_notifications" {
  name = "s3-upload-notifications"
}
```

## Step 2: Grant S3 Permission to Invoke Lambda and Write to SQS/SNS

```hcl
# Lambda permission for S3
resource "aws_lambda_permission" "s3_invoke" {
  statement_id   = "AllowS3Invoke"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.processor.function_name
  principal      = "s3.amazonaws.com"
  source_arn     = aws_s3_bucket.uploads.arn
  source_account = data.aws_caller_identity.current.account_id
}

# SQS queue policy allowing S3 to send messages
resource "aws_sqs_queue_policy" "image_processing" {
  queue_url = aws_sqs_queue.image_processing.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.image_processing.arn
      Condition = {
        ArnLike = { "aws:SourceArn" = aws_s3_bucket.uploads.arn }
      }
    }]
  })
}

# SNS topic policy
resource "aws_sns_topic_policy" "uploads" {
  arn = aws_sns_topic.upload_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.upload_notifications.arn
      Condition = {
        ArnLike = { "aws:SourceArn" = aws_s3_bucket.uploads.arn }
      }
    }]
  })
}
```

## Step 3: Configure S3 Event Notifications

```hcl
resource "aws_s3_bucket_notification" "uploads" {
  bucket      = aws_s3_bucket.uploads.id
  eventbridge = true  # Routes all supported S3 events to EventBridge

  # Trigger Lambda for all CSV uploads for data processing
  lambda_function {
    lambda_function_arn = aws_lambda_function.processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "data/"
    filter_suffix       = ".csv"
  }

  # Send image uploads to SQS for thumbnail generation
  queue {
    queue_arn     = aws_sqs_queue.image_processing.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "images/"
    filter_suffix = ".jpg"
  }

  # Publish object removal events to SNS for audit trail
  topic {
    topic_arn = aws_sns_topic.upload_notifications.arn
    events    = ["s3:ObjectRemoved:*"]
  }

  depends_on = [
    aws_lambda_permission.s3_invoke,
    aws_sqs_queue_policy.image_processing,
    aws_sns_topic_policy.uploads
  ]
}
```

## Step 4: Use EventBridge for Advanced Routing

```hcl
# With EventBridge enabled above, route large file uploads to a specific target
resource "aws_cloudwatch_event_rule" "large_uploads" {
  name        = "s3-large-file-upload"
  description = "Trigger on large file uploads"

  event_pattern = jsonencode({
    source      = ["aws.s3"]
    detail-type = ["Object Created"]
    detail = {
      bucket = { name = [aws_s3_bucket.uploads.bucket] }
      object = { size = [{ numeric = [">=", 104857600] }] }  # >= 100 MB
    }
  })
}

resource "aws_cloudwatch_event_target" "large_uploads" {
  rule      = aws_cloudwatch_event_rule.large_uploads.name
  target_id = "LargeUploadProcessor"
  arn       = aws_lambda_function.processor.arn
}

resource "aws_lambda_permission" "eventbridge_invoke" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.large_uploads.arn
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 event notifications enable real-time event-driven workflows triggered by object changes. Use Lambda for direct asynchronous processing, SQS for decoupled queue-based workflows, SNS for fan-out to multiple consumers, and EventBridge for complex routing rules. For new architectures, EventBridge provides the most flexibility with content-based filtering and multiple target types without needing to configure multiple S3 notification targets.
