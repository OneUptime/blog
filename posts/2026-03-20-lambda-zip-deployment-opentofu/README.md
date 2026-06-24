# How to Create Lambda Functions with ZIP Deployment in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Serverless, ZIP Deployment, Infrastructure as Code, Python

Description: Learn how to create and deploy AWS Lambda functions using ZIP file deployment with OpenTofu, including IAM roles, environment variables, and VPC configuration.

## Introduction

AWS Lambda executes code in response to events without managing servers. ZIP deployment is the simplest deployment method, packaging your function code and dependencies into a ZIP archive. This guide covers creating a Lambda function from a local ZIP file with common configurations.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda and IAM permissions
- Function source code

## Step 1: Package the Lambda Function

```hcl
# Package the Python function code into a ZIP archive

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/dist/function.zip"
}
```

## Step 2: Create the Lambda Execution Role

```hcl
# IAM role that the Lambda function assumes during execution
resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Basic execution policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Required when Active X-Ray tracing is enabled
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# Custom policy for application-specific permissions
resource "aws_iam_role_policy" "lambda_app" {
  name = "lambda-app-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "dynamodb:PutItem",
        "dynamodb:GetItem"
      ]
      Resource = [
        "arn:aws:s3:::${var.data_bucket}/*",
        var.table_arn
      ]
    }]
  })
}
```

## Step 3: Create the Lambda Function

```hcl
resource "aws_lambda_function" "main" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"  # filename.functionname
  runtime       = "python3.12"

  # Reference the packaged ZIP file
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  # Memory and timeout configuration
  memory_size = 512   # MB, default is 128
  timeout     = 30    # seconds, default is 3

  # Enable X-Ray tracing
  tracing_config {
    mode = "Active"
  }

  # Environment variables for runtime configuration
  environment {
    variables = {
      ENVIRONMENT    = var.environment
      DATA_BUCKET    = var.data_bucket
      TABLE_NAME     = var.table_name
      LOG_LEVEL      = "INFO"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]

  tags = {
    Name        = var.function_name
    Environment = var.environment
    Runtime     = "python3.12"
  }
}
```

## Step 4: Configure CloudWatch Log Group

```hcl
# Pre-create the log group with a retention policy
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14

  tags = { Function = var.function_name }
}
```

## Step 5: Sample Lambda Handler

```python
# src/index.py - Example Lambda function handler
import json
import boto3
import os

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    """Process incoming events and store results."""
    bucket = os.environ['DATA_BUCKET']
    table_name = os.environ['TABLE_NAME']

    # Process the event
    print(f"Processing event: {json.dumps(event)}")

    # Store result in DynamoDB
    table = dynamodb.Table(table_name)
    table.put_item(Item={
        'id': context.aws_request_id,
        'event': json.dumps(event)
    })

    return {
        'statusCode': 200,
        'body': json.dumps({'requestId': context.aws_request_id})
    }
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the function
aws lambda invoke \
  --function-name my-function \
  --cli-binary-format raw-in-base64-out \
  --payload '{"key": "value"}' \
  response.json
```

## Conclusion

ZIP deployment is the fastest way to get Lambda functions running with OpenTofu. The `source_code_hash` ensures OpenTofu detects code changes and redeploys automatically. For larger dependencies, consider Lambda Layers to keep deployment packages small and reduce cold start times.
