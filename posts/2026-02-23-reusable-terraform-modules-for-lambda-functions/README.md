# How to Create Reusable Terraform Modules for Lambda Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, Lambda, Serverless

Description: Build a comprehensive Terraform module for AWS Lambda functions covering IAM roles, CloudWatch logs, VPC configuration, event source mappings, and environment variables.

---

Lambda functions have a lot of supporting infrastructure that goes beyond the function itself. You need an IAM execution role, CloudWatch log groups, environment variable configuration, VPC settings, event source mappings, and sometimes layers and aliases. Creating all of this from scratch every time is tedious and error-prone.

A well-designed Lambda module encapsulates all these moving parts into a single module call with sensible defaults.

## What the Module Manages

The module should create and configure:

- The Lambda function itself
- IAM execution role with basic logging permissions
- CloudWatch log group with configurable retention
- Optional VPC configuration
- Optional environment variables
- Optional Lambda layers
- Event source mappings for SQS, DynamoDB Streams, and Kinesis

## Module Structure

```
modules/lambda-function/
  main.tf          # Function and related resources
  iam.tf           # IAM role and policies
  variables.tf     # Input variables
  outputs.tf       # Exported values
  versions.tf      # Provider version constraints
```

## Variables

```hcl
# modules/lambda-function/variables.tf

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "description" {
  description = "Description of the Lambda function"
  type        = string
  default     = ""
}

variable "runtime" {
  description = "Lambda runtime (e.g., python3.12, nodejs20.x)"
  type        = string
}

variable "handler" {
  description = "Function handler (e.g., index.handler)"
  type        = string
}

variable "source_path" {
  description = "Path to the deployment package (zip file)"
  type        = string
}

variable "memory_size" {
  description = "Amount of memory in MB allocated to the function"
  type        = number
  default     = 128
}

variable "timeout" {
  description = "Function timeout in seconds"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "Environment variables for the function"
  type        = map(string)
  default     = {}
}

variable "layers" {
  description = "List of Lambda layer ARNs to attach"
  type        = list(string)
  default     = []
}

# VPC configuration
variable "vpc_config" {
  description = "VPC configuration for the Lambda function"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

# Additional IAM policies
variable "additional_policy_arns" {
  description = "Additional managed policy ARNs to attach to the execution role"
  type        = list(string)
  default     = []
}

variable "inline_policy" {
  description = "JSON inline policy document for custom permissions"
  type        = string
  default     = null
}

# Event sources
variable "sqs_event_sources" {
  description = "SQS queues to use as event sources"
  type = list(object({
    queue_arn  = string
    batch_size = optional(number, 10)
    enabled    = optional(bool, true)
  }))
  default = []
}

variable "reserved_concurrent_executions" {
  description = "Amount of reserved concurrent executions. -1 for unreserved."
  type        = number
  default     = -1
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

## IAM Role

```hcl
# modules/lambda-function/iam.tf

# Trust policy allowing Lambda service to assume this role
data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Execution role for the Lambda function
resource "aws_iam_role" "lambda" {
  name               = "${var.function_name}-execution"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = var.tags
}

# Basic logging permissions
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access permissions (only when VPC is configured)
resource "aws_iam_role_policy_attachment" "vpc_access" {
  count = var.vpc_config != null ? 1 : 0

  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Additional managed policies
resource "aws_iam_role_policy_attachment" "additional" {
  for_each = toset(var.additional_policy_arns)

  role       = aws_iam_role.lambda.name
  policy_arn = each.value
}

# Inline policy for custom permissions
resource "aws_iam_role_policy" "inline" {
  count = var.inline_policy != null ? 1 : 0

  name   = "${var.function_name}-custom"
  role   = aws_iam_role.lambda.id
  policy = var.inline_policy
}
```

## Main Function Resource

```hcl
# modules/lambda-function/main.tf

# CloudWatch log group - created before the function to control retention
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# The Lambda function
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  description   = var.description
  role          = aws_iam_role.lambda.arn

  # Deployment package
  filename         = var.source_path
  source_code_hash = filebase64sha256(var.source_path)

  runtime = var.runtime
  handler = var.handler

  memory_size = var.memory_size
  timeout     = var.timeout

  reserved_concurrent_executions = var.reserved_concurrent_executions

  layers = var.layers

  # Environment variables (only if any are specified)
  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [1] : []

    content {
      variables = var.environment_variables
    }
  }

  # VPC configuration (optional)
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []

    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  tags = merge(
    var.tags,
    {
      Name = var.function_name
    }
  )

  # Ensure the log group exists before the function
  depends_on = [aws_cloudwatch_log_group.lambda]
}

# SQS event source mappings
resource "aws_lambda_event_source_mapping" "sqs" {
  count = length(var.sqs_event_sources)

  event_source_arn = var.sqs_event_sources[count.index].queue_arn
  function_name    = aws_lambda_function.this.arn
  batch_size       = var.sqs_event_sources[count.index].batch_size
  enabled          = var.sqs_event_sources[count.index].enabled
}
```

## Outputs

```hcl
# modules/lambda-function/outputs.tf

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.this.arn
}

output "invoke_arn" {
  description = "Invoke ARN (for API Gateway integration)"
  value       = aws_lambda_function.this.invoke_arn
}

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.lambda.name
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}
```

## Usage Examples

A simple API handler:

```hcl
module "api_handler" {
  source = "./modules/lambda-function"

  function_name = "user-api-handler"
  description   = "Handles user API requests"
  runtime       = "python3.12"
  handler       = "app.handler"
  source_path   = "${path.module}/dist/api-handler.zip"

  memory_size = 256
  timeout     = 30

  environment_variables = {
    DB_HOST     = module.rds.endpoint
    TABLE_NAME  = "users"
    ENVIRONMENT = "production"
  }

  # Custom permissions to access DynamoDB
  inline_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
        Resource = module.dynamodb_table.arn
      }
    ]
  })

  tags = {
    Environment = "production"
    Service     = "user-api"
  }
}
```

An SQS consumer running inside a VPC:

```hcl
module "order_processor" {
  source = "./modules/lambda-function"

  function_name = "order-processor"
  description   = "Processes orders from the queue"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  source_path   = "${path.module}/dist/order-processor.zip"

  memory_size = 512
  timeout     = 300

  # VPC access for reaching RDS
  vpc_config = {
    subnet_ids         = module.vpc.private_subnet_ids
    security_group_ids = [module.lambda_sg.id]
  }

  # Process messages from the orders queue
  sqs_event_sources = [
    {
      queue_arn  = module.orders_queue.arn
      batch_size = 5
    }
  ]

  environment_variables = {
    DB_CONNECTION_STRING = "postgresql://${module.rds.endpoint}:5432/orders"
  }

  # Limit concurrency to avoid overwhelming the database
  reserved_concurrent_executions = 10

  log_retention_days = 30

  tags = {
    Environment = "production"
    Service     = "order-processing"
  }
}
```

## Key Design Decisions

Creating the CloudWatch log group before the function is intentional. If you let Lambda create the log group automatically, Terraform does not manage it and you cannot control retention. By creating it first with a `depends_on`, you maintain full control over log retention and can apply tags.

The `source_code_hash` ensures Terraform detects when your code changes and triggers a redeployment. Without it, Terraform would only redeploy when other configuration attributes change.

Separating IAM into its own file keeps the module organized. As the module grows, you can add more IAM-related resources without cluttering the main function configuration.

For related topics, see our post on [creating reusable Terraform modules for IAM roles](https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-iam-roles/view).
