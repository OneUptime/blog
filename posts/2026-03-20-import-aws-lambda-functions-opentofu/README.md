# How to Import AWS Lambda Functions into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, Lambda, Import, Serverless

Description: Learn how to import existing AWS Lambda functions into OpenTofu state, handling function configurations, event source mappings, and associated resources.

## Introduction

Lambda functions often get created through deployment pipelines, the console, or CDK before OpenTofu takes ownership. Importing them lets you use OpenTofu for configuration management while preserving existing function code and settings.

## Step 1: Inventory the Lambda Function

```bash
FUNCTION="my-app-processor"

aws lambda get-function-configuration \
  --function-name $FUNCTION \
  --query '{
    description: Description,
    runtime: Runtime,
    handler: Handler,
    timeout: Timeout,
    memory_size: MemorySize,
    role: Role,
    environment_variables: Environment.Variables,
    vpc_config: VpcConfig
  }' --output json
```

## Step 2: Write Matching HCL

```hcl
data "aws_iam_role" "lambda" {
  name = "my-app-processor-role"
}

variable "vpc_config" {
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

resource "aws_lambda_function" "processor" {
  function_name = "my-app-processor"
  description   = "Processes application events"
  role          = data.aws_iam_role.lambda.arn
  runtime       = "python3.12"
  handler       = "handler.main"
  timeout       = 300
  memory_size   = 512

  # When importing, use a placeholder package. OpenTofu won't manage code
  # updates until you replace this with your real deployment artifact.
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      ENV        = "prod"
      LOG_LEVEL  = "INFO"
      DB_HOST    = "db.example.com"
    }
  }

  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  lifecycle {
    # Let the deployment pipeline manage the function code
    ignore_changes = [
      filename,
      source_code_hash,
      # Also ignore environment if managed by Parameter Store
      # environment,
    ]
  }

  tags = { Environment = "prod", ManagedBy = "OpenTofu" }
}

# Placeholder archive to satisfy the Lambda resource's deployment package requirement

data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"
  source {
    content  = "# placeholder"
    filename = "placeholder.py"
  }
}
```

## Import Blocks

```hcl
# import.tf
import {
  to = aws_lambda_function.processor
  id = "my-app-processor"
}
```

## Importing Event Source Mappings

```hcl
resource "aws_lambda_event_source_mapping" "sqs" {
  event_source_arn = "arn:aws:sqs:us-east-1:123456789012:my-queue"
  function_name    = aws_lambda_function.processor.arn
  batch_size       = 10
  enabled          = true
}

# Event source mapping uses the UUID as the import ID
import {
  to = aws_lambda_event_source_mapping.sqs
  id = "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE"
}
```

## Importing CloudWatch Log Groups

```hcl
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/my-app-processor"
  retention_in_days = 30
}

import {
  to = aws_cloudwatch_log_group.lambda
  id = "/aws/lambda/my-app-processor"
}
```

## Conclusion

Lambda import works best when you set `ignore_changes = [filename, source_code_hash]` so OpenTofu manages configuration (environment variables, timeouts, VPC settings) while your deployment pipeline manages function code. This separation of concerns is the recommended pattern for Lambda functions in CI/CD workflows.
