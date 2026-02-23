# How to Create Lambda with S3 Trigger in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, S3, Event-Driven, Serverless

Description: Learn how to set up an AWS Lambda function triggered by S3 bucket events using Terraform, including event filtering, IAM permissions, and common processing patterns.

---

One of the most common serverless patterns on AWS is triggering a Lambda function whenever a file lands in an S3 bucket. Upload an image and Lambda generates thumbnails. Drop a CSV and Lambda processes it into a database. A log file arrives and Lambda parses it for anomalies. The S3 event notification system makes all of this possible, and Terraform makes it reproducible.

This guide shows you how to wire up S3 bucket notifications to Lambda functions in Terraform, handle the IAM permissions correctly, filter events by prefix and suffix, and avoid the common pitfalls.

## The Complete Setup

There are three pieces to this: the Lambda function, the S3 bucket notification, and the Lambda permission that allows S3 to invoke the function:

```hcl
# Lambda function that processes S3 events
resource "aws_lambda_function" "processor" {
  function_name = "s3-file-processor"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 300  # 5 minutes for file processing
  memory_size   = 512

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      PROCESSED_BUCKET = aws_s3_bucket.processed.id
      TABLE_NAME       = var.dynamodb_table_name
    }
  }

  tags = {
    Name = "s3-file-processor"
  }
}

# Package the Lambda code
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

# S3 bucket that will trigger the Lambda
resource "aws_s3_bucket" "uploads" {
  bucket = "myapp-uploads-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "uploads-bucket"
  }
}

# Bucket for processed files
resource "aws_s3_bucket" "processed" {
  bucket = "myapp-processed-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "processed-bucket"
  }
}

data "aws_caller_identity" "current" {}

# S3 bucket notification - triggers Lambda on object creation
resource "aws_s3_bucket_notification" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processor.arn
    events              = ["s3:ObjectCreated:*"]

    # Only trigger for files in the "uploads/" prefix
    filter_prefix = "uploads/"

    # Only trigger for CSV files
    filter_suffix = ".csv"
  }

  # This depends on the Lambda permission being created first
  depends_on = [aws_lambda_permission.s3_invoke]
}

# Permission for S3 to invoke the Lambda function
resource "aws_lambda_permission" "s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
  source_account = data.aws_caller_identity.current.account_id
}
```

## IAM Role and Permissions

The Lambda function needs permission to read from the source bucket and write to the destination:

```hcl
# IAM role for the Lambda function
resource "aws_iam_role" "lambda_exec" {
  name = "s3-processor-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Basic Lambda execution (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# S3 access policy
resource "aws_iam_role_policy" "s3_access" {
  name = "s3-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.processed.arn}/*"
      }
    ]
  })
}
```

## Multiple Event Types and Filters

You can configure different Lambda functions for different event types on the same bucket:

```hcl
resource "aws_s3_bucket_notification" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  # Trigger image processor for image uploads
  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "images/"
    filter_suffix       = ".jpg"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "images/"
    filter_suffix       = ".png"
  }

  # Trigger CSV processor for data uploads
  lambda_function {
    lambda_function_arn = aws_lambda_function.csv_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "data/"
    filter_suffix       = ".csv"
  }

  # Trigger cleanup function on object deletion
  lambda_function {
    lambda_function_arn = aws_lambda_function.cleanup.arn
    events              = ["s3:ObjectRemoved:*"]
  }

  depends_on = [
    aws_lambda_permission.s3_invoke_image,
    aws_lambda_permission.s3_invoke_csv,
    aws_lambda_permission.s3_invoke_cleanup,
  ]
}
```

## The Lambda Handler

Here is what the Lambda function looks like on the code side. The event payload contains the bucket name and object key:

```python
# index.py - Lambda handler for S3 events
import json
import boto3
import os
import urllib.parse

s3_client = boto3.client('s3')
PROCESSED_BUCKET = os.environ['PROCESSED_BUCKET']

def handler(event, context):
    """Process files uploaded to S3."""
    for record in event['Records']:
        # Extract bucket and key from the event
        bucket = record['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(
            record['s3']['object']['key'],
            encoding='utf-8'
        )
        size = record['s3']['object']['size']

        print(f"Processing {key} from {bucket} ({size} bytes)")

        try:
            # Download the file
            response = s3_client.get_object(Bucket=bucket, Key=key)
            content = response['Body'].read()

            # Process the file (your logic here)
            processed = process_file(content)

            # Upload to processed bucket
            output_key = f"processed/{key.split('/')[-1]}"
            s3_client.put_object(
                Bucket=PROCESSED_BUCKET,
                Key=output_key,
                Body=processed
            )

            print(f"Successfully processed {key} -> {output_key}")

        except Exception as e:
            print(f"Error processing {key}: {str(e)}")
            raise

    return {
        'statusCode': 200,
        'body': json.dumps(f"Processed {len(event['Records'])} files")
    }

def process_file(content):
    """Your file processing logic goes here."""
    # Example: just return the content as-is
    return content
```

## Avoiding Infinite Loops

A critical gotcha: if your Lambda writes back to the same bucket that triggers it, you create an infinite loop. Lambda triggers, writes a file, which triggers Lambda again, and so on until you hit concurrency limits and your AWS bill explodes.

The fix is to use separate buckets for input and output, or use prefix filtering to separate source and destination:

```hcl
# SAFE: Different prefixes prevent infinite loops
resource "aws_s3_bucket_notification" "safe" {
  bucket = aws_s3_bucket.data.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"     # Only trigger on raw/ prefix
    # Lambda writes to processed/ prefix - no loop
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}
```

## Dead Letter Queue for Failed Invocations

If Lambda fails to process an S3 event, you want to know about it:

```hcl
# SQS queue for failed Lambda invocations
resource "aws_sqs_queue" "dlq" {
  name = "s3-processor-dlq"

  tags = {
    Name = "s3-processor-dlq"
  }
}

# Configure the Lambda with a dead letter queue
resource "aws_lambda_function" "processor" {
  # ... other config ...

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }
}

# Allow Lambda to send messages to the DLQ
resource "aws_iam_role_policy" "dlq_access" {
  name = "dlq-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sqs:SendMessage"
      Resource = aws_sqs_queue.dlq.arn
    }]
  })
}
```

## Outputs

```hcl
output "upload_bucket" {
  description = "Bucket name for uploading files"
  value       = aws_s3_bucket.uploads.id
}

output "lambda_function_name" {
  description = "Name of the processing Lambda"
  value       = aws_lambda_function.processor.function_name
}

output "dlq_url" {
  description = "URL of the dead letter queue"
  value       = aws_sqs_queue.dlq.url
}
```

## Summary

An S3-triggered Lambda in Terraform requires three things: the Lambda function itself, an `aws_s3_bucket_notification` that specifies which events trigger the function, and an `aws_lambda_permission` that allows S3 to invoke it. Use `filter_prefix` and `filter_suffix` to narrow which objects trigger the function. Always use separate buckets or prefixes for input and output to avoid infinite loops. Set up a dead letter queue so failed processing does not go unnoticed. This pattern forms the basis for many event-driven architectures on AWS.
