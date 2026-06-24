# How to Design a Serverless Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Lambda, Serverless, AWS, Module, API Gateway

Description: Learn how to design a reusable Lambda serverless module for OpenTofu that handles function deployment, IAM roles, environment variables, and optional API Gateway integration.

## Introduction

A serverless module should handle Lambda function creation, IAM execution roles, CloudWatch log groups, optional VPC placement, and outputs needed for optional API Gateway integration - letting application teams focus on their function code rather than infrastructure configuration.

## variables.tf

```hcl
variable "function_name" {
  type = string
}

variable "description" {
  type    = string
  default = ""
}

variable "runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "timeout" {
  type    = number
  default = 30
}

variable "memory_size" {
  type    = number
  default = 128
}

variable "environment" {
  type = string
}

variable "deployment_package" {
  description = "Path to the ZIP file or S3 object"
  type = object({
    filename   = optional(string)
    s3_bucket  = optional(string)
    s3_key     = optional(string)
  })
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "additional_policy_arns" {
  type    = list(string)
  default = []
}

variable "additional_policy_json" {
  type    = string
  default = ""
}

variable "vpc_config" {
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

variable "enable_xray" {
  type    = bool
  default = false
}

variable "reserved_concurrency" {
  type    = number
  default = -1
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
locals {
  tags = merge({
    Function    = var.function_name
    Environment = var.environment
    ManagedBy   = "OpenTofu"
  }, var.tags)
}

resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = var.vpc_config != null ? (
    "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  ) : (
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  )
}

resource "aws_iam_role_policy_attachment" "additional" {
  for_each   = toset(var.additional_policy_arns)
  role       = aws_iam_role.lambda.name
  policy_arn = each.key
}

resource "aws_iam_role_policy_attachment" "xray" {
  count      = var.enable_xray ? 1 : 0
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "custom" {
  count  = var.additional_policy_json != "" ? 1 : 0
  name   = "${var.function_name}-custom"
  role   = aws_iam_role.lambda.id
  policy = var.additional_policy_json
}

resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_lambda_function" "main" {
  function_name = var.function_name
  description   = var.description
  role          = aws_iam_role.lambda.arn
  runtime       = var.runtime
  handler       = var.handler
  timeout       = var.timeout
  memory_size   = var.memory_size

  filename         = var.deployment_package.filename
  s3_bucket        = var.deployment_package.s3_bucket
  s3_key           = var.deployment_package.s3_key
  source_code_hash = var.deployment_package.filename != null ? filebase64sha256(var.deployment_package.filename) : null

  reserved_concurrent_executions = var.reserved_concurrency

  environment {
    variables = var.environment_variables
  }

  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  dynamic "tracing_config" {
    for_each = var.enable_xray ? [1] : []
    content { mode = "Active" }
  }

  tags       = local.tags
  depends_on = [aws_cloudwatch_log_group.function]
}
```

## outputs.tf

```hcl
output "function_arn"    { value = aws_lambda_function.main.arn }
output "function_name"   { value = aws_lambda_function.main.function_name }
output "invoke_arn"      { value = aws_lambda_function.main.invoke_arn }
output "role_arn"        { value = aws_iam_role.lambda.arn }
output "log_group_name"  { value = aws_cloudwatch_log_group.function.name }
```

## Conclusion

This Lambda module handles the full function lifecycle: IAM role creation, CloudWatch log group setup (before the function so retention and tags are managed from the start), optional VPC placement, and conditional X-Ray tracing with the required execution-role permissions. The `additional_policy_arns` and `additional_policy_json` variables let callers grant function-specific permissions without modifying the module, and the `invoke_arn` output can be used by higher-level configurations to add API Gateway integrations.
