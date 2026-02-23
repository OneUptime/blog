# How to Create ZIP Files for Lambda Deployment with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS Lambda, Archive, ZIP, Serverless, Infrastructure as Code

Description: Learn how to create ZIP deployment packages for AWS Lambda with Terraform using the archive provider, including dependency bundling and layer management.

---

AWS Lambda requires your function code to be packaged as a ZIP file or container image. The Terraform archive provider makes it easy to create these ZIP packages as part of your infrastructure deployment. By using archive_file alongside the aws_lambda_function resource, you create a seamless deployment pipeline where code changes are automatically detected and deployed.

In this guide, we will cover creating Lambda deployment packages with Terraform for Python, Node.js, and Go functions, including dependency management, Lambda layers, and multi-function deployments.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Simple Python Lambda Package

```hcl
# python-lambda.tf - Package a simple Python Lambda
data "archive_file" "python_lambda" {
  type        = "zip"
  source_file = "${path.module}/functions/handler.py"
  output_path = "${path.module}/dist/python-handler.zip"
}

resource "aws_lambda_function" "python" {
  function_name    = "python-handler-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30

  filename         = data.archive_file.python_lambda.output_path
  source_code_hash = data.archive_file.python_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}

# IAM role for Lambda execution
resource "aws_iam_role" "lambda_exec" {
  name = "lambda-exec-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## Python Lambda with Dependencies

```hcl
# python-deps.tf - Lambda with pip dependencies
# Assumes dependencies are pre-installed via: pip install -r requirements.txt -t ./build/
data "archive_file" "python_with_deps" {
  type        = "zip"
  source_dir  = "${path.module}/functions/api/build"
  output_path = "${path.module}/dist/api-function.zip"
  excludes    = ["**/__pycache__/**", "**/*.pyc", "**/*.dist-info/**"]
}

resource "aws_lambda_function" "api" {
  function_name    = "api-function-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.main"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 512

  filename         = data.archive_file.python_with_deps.output_path
  source_code_hash = data.archive_file.python_with_deps.output_base64sha256
}
```

## Node.js Lambda Package

```hcl
# nodejs-lambda.tf - Package a Node.js Lambda
data "archive_file" "nodejs_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/functions/webhook"
  output_path = "${path.module}/dist/webhook.zip"
  excludes    = ["**/node_modules/.cache/**", "**/*.test.js", "**/jest.config.js"]
}

resource "aws_lambda_function" "webhook" {
  function_name    = "webhook-handler-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 15
  memory_size      = 256

  filename         = data.archive_file.nodejs_lambda.output_path
  source_code_hash = data.archive_file.nodejs_lambda.output_base64sha256
}
```

## Creating Lambda Layers

Package shared dependencies as Lambda layers:

```hcl
# layers.tf - Create Lambda layers for shared dependencies
# Python dependencies layer
data "archive_file" "python_layer" {
  type        = "zip"
  source_dir  = "${path.module}/layers/python-deps"
  output_path = "${path.module}/dist/python-deps-layer.zip"
}

resource "aws_lambda_layer_version" "python_deps" {
  layer_name          = "python-dependencies-${var.environment}"
  filename            = data.archive_file.python_layer.output_path
  source_code_hash    = data.archive_file.python_layer.output_base64sha256
  compatible_runtimes = ["python3.11", "python3.12"]
}

# Common utilities layer
data "archive_file" "utils_layer" {
  type        = "zip"
  output_path = "${path.module}/dist/utils-layer.zip"

  source {
    content = <<-PYTHON
      import json
      import logging
      import os

      logger = logging.getLogger()
      logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

      def response(status_code, body):
          """Standard API response format."""
          return {
              'statusCode': status_code,
              'headers': {
                  'Content-Type': 'application/json',
                  'X-Environment': os.environ.get('ENVIRONMENT', 'unknown')
              },
              'body': json.dumps(body)
          }
    PYTHON
    filename = "python/utils.py"
  }
}

resource "aws_lambda_layer_version" "utils" {
  layer_name          = "common-utils-${var.environment}"
  filename            = data.archive_file.utils_layer.output_path
  source_code_hash    = data.archive_file.utils_layer.output_base64sha256
  compatible_runtimes = ["python3.11", "python3.12"]
}

# Use layers in Lambda functions
resource "aws_lambda_function" "with_layers" {
  function_name    = "layered-function-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.main"
  runtime          = "python3.11"

  filename         = data.archive_file.python_lambda.output_path
  source_code_hash = data.archive_file.python_lambda.output_base64sha256

  layers = [
    aws_lambda_layer_version.python_deps.arn,
    aws_lambda_layer_version.utils.arn,
  ]
}
```

## Inline Lambda Function

Create simple Lambda functions without external source files:

```hcl
# inline-lambda.tf - Lambda defined entirely in Terraform
data "archive_file" "cloudwatch_alarm_handler" {
  type        = "zip"
  output_path = "${path.module}/dist/alarm-handler.zip"

  source {
    content = <<-PYTHON
      import json
      import urllib.request
      import os

      def lambda_handler(event, context):
          """Forward CloudWatch alarms to Slack."""
          webhook_url = os.environ['SLACK_WEBHOOK_URL']

          # Parse the SNS message
          message = json.loads(event['Records'][0]['Sns']['Message'])
          alarm_name = message.get('AlarmName', 'Unknown')
          state = message.get('NewStateValue', 'Unknown')
          reason = message.get('NewStateReason', 'No reason provided')

          # Build Slack message
          color = '#d62728' if state == 'ALARM' else '#2ca02c'
          slack_message = {
              'attachments': [{
                  'color': color,
                  'title': f'CloudWatch Alarm: {alarm_name}',
                  'text': f'State: {state}\nReason: {reason}',
              }]
          }

          # Send to Slack
          data = json.dumps(slack_message).encode('utf-8')
          req = urllib.request.Request(webhook_url, data=data,
              headers={'Content-Type': 'application/json'})
          urllib.request.urlopen(req)

          return {'statusCode': 200}
    PYTHON
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "alarm_handler" {
  function_name    = "alarm-to-slack-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.11"
  timeout          = 10

  filename         = data.archive_file.cloudwatch_alarm_handler.output_path
  source_code_hash = data.archive_file.cloudwatch_alarm_handler.output_base64sha256

  environment {
    variables = {
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }
}

variable "slack_webhook_url" {
  type      = string
  sensitive = true
  default   = "https://hooks.slack.com/services/placeholder"
}
```

## Outputs

```hcl
# outputs.tf
output "lambda_functions" {
  description = "Deployed Lambda function names"
  value = {
    python  = aws_lambda_function.python.function_name
    api     = aws_lambda_function.api.function_name
    webhook = aws_lambda_function.webhook.function_name
    alarm   = aws_lambda_function.alarm_handler.function_name
  }
}

output "layer_arns" {
  description = "Lambda layer ARNs"
  value = {
    python_deps = aws_lambda_layer_version.python_deps.arn
    utils       = aws_lambda_layer_version.utils.arn
  }
}
```

## Conclusion

Creating ZIP files for Lambda deployment with Terraform's archive provider creates a seamless code-to-deployment pipeline. The source_code_hash integration ensures Terraform detects code changes automatically, and Lambda layers let you share dependencies across multiple functions. For the general archive provider overview, see our guide on [using the archive provider](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-archive-provider-to-create-zip-files-in-terraform/view).
