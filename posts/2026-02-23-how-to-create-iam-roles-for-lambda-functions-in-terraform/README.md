# How to Create IAM Roles for Lambda Functions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Lambda, Serverless, Infrastructure as Code

Description: Learn how to create properly scoped IAM roles for AWS Lambda functions in Terraform, including execution roles, resource permissions, and VPC access.

---

Every AWS Lambda function needs an IAM role, known as the execution role, that grants it permission to access AWS services and resources. Without a properly configured execution role, your Lambda function cannot write logs, read from S3, query DynamoDB, or interact with any other AWS service. Terraform provides a clean way to define these roles alongside your Lambda functions, keeping permissions tightly coupled to the code that uses them.

This guide covers creating Lambda execution roles in Terraform, from basic setups to complex scenarios involving VPC access, multiple services, and cross-account invocations.

## How Lambda Execution Roles Work

When Lambda runs your function, it assumes the execution role you specified. The role needs two things:

1. **A trust policy** that allows the Lambda service to assume it.
2. **Permission policies** that define what AWS actions the function can perform.

Lambda automatically handles the `sts:AssumeRole` call and passes the temporary credentials to your function code. Your code then uses these credentials (via the AWS SDK) to make API calls.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with permissions to create IAM roles and Lambda functions
- AWS CLI configured with valid credentials

## Basic Lambda Execution Role

The simplest Lambda role allows the function to write logs to CloudWatch.

```hcl
# Trust policy allowing Lambda to assume the role
data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# Create the execution role
resource "aws_iam_role" "lambda_basic" {
  name               = "lambda-basic-execution"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json

  tags = {
    Service   = "lambda"
    ManagedBy = "terraform"
  }
}

# Attach the basic execution policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_basic.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Reference the role in your Lambda function
resource "aws_lambda_function" "example" {
  filename      = "function.zip"
  function_name = "my-function"
  role          = aws_iam_role.lambda_basic.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
}
```

The `AWSLambdaBasicExecutionRole` managed policy grants permissions to create log groups, log streams, and put log events in CloudWatch Logs.

## Lambda Role with S3 Access

A common pattern is a Lambda function that reads from or writes to S3.

```hcl
# Create the Lambda role
resource "aws_iam_role" "lambda_s3" {
  name               = "lambda-s3-processor"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# Basic execution policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "s3_lambda_logs" {
  role       = aws_iam_role.lambda_s3.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for S3 access
resource "aws_iam_policy" "lambda_s3_access" {
  name        = "lambda-s3-access"
  description = "Allow Lambda to read from source and write to destination S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSourceBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::source-data-bucket",
          "arn:aws:s3:::source-data-bucket/*",
        ]
      },
      {
        Sid    = "WriteDestBucket"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
        ]
        Resource = [
          "arn:aws:s3:::dest-data-bucket/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_s3" {
  role       = aws_iam_role.lambda_s3.name
  policy_arn = aws_iam_policy.lambda_s3_access.arn
}
```

## Lambda Role with DynamoDB Access

For Lambda functions that interact with DynamoDB tables:

```hcl
variable "dynamodb_table_name" {
  default = "users-table"
}

resource "aws_iam_role" "lambda_dynamodb" {
  name               = "lambda-dynamodb-handler"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "dynamodb_lambda_logs" {
  role       = aws_iam_role.lambda_dynamodb.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy with least privilege
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_iam_policy" "lambda_dynamodb_access" {
  name = "lambda-dynamodb-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
        ]
        Resource = [
          # Table and its indexes
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.dynamodb_table_name}",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.dynamodb_table_name}/index/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_dynamodb.name
  policy_arn = aws_iam_policy.lambda_dynamodb_access.arn
}
```

## Lambda Role with VPC Access

When a Lambda function runs inside a VPC, it needs additional permissions to manage elastic network interfaces.

```hcl
resource "aws_iam_role" "lambda_vpc" {
  name               = "lambda-vpc-function"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# Basic execution with VPC access
resource "aws_iam_role_policy_attachment" "vpc_lambda_logs" {
  role       = aws_iam_role.lambda_vpc.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access policy - allows Lambda to create and manage ENIs
resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda_vpc.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Lambda function in a VPC
resource "aws_lambda_function" "vpc_function" {
  filename      = "function.zip"
  function_name = "vpc-function"
  role          = aws_iam_role.lambda_vpc.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  vpc_config {
    subnet_ids         = ["subnet-abc123", "subnet-def456"]
    security_group_ids = ["sg-12345678"]
  }
}
```

## Lambda Role with Multiple Service Access

Real-world Lambda functions often need access to several services.

```hcl
resource "aws_iam_role" "lambda_multi_service" {
  name               = "lambda-api-handler"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# Attach basic execution policy
resource "aws_iam_role_policy_attachment" "multi_service_logs" {
  role       = aws_iam_role.lambda_multi_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Comprehensive policy for an API handler Lambda
resource "aws_iam_policy" "api_handler_policy" {
  name        = "lambda-api-handler-policy"
  description = "Permissions for the API handler Lambda function"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Read/write to DynamoDB
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/api-*"
      },
      {
        # Send messages to SQS
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
        ]
        Resource = "arn:aws:sqs:us-east-1:*:processing-queue"
      },
      {
        # Read secrets
        Sid    = "SecretsAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:*:secret:api/*"
      },
      {
        # Publish to SNS
        Sid    = "SNSAccess"
        Effect = "Allow"
        Action = [
          "sns:Publish",
        ]
        Resource = "arn:aws:sns:us-east-1:*:notifications-*"
      },
      {
        # Use KMS for encryption
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
        ]
        Resource = "arn:aws:kms:us-east-1:*:key/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_handler" {
  role       = aws_iam_role.lambda_multi_service.name
  policy_arn = aws_iam_policy.api_handler_policy.arn
}
```

## Reusable Lambda Role Module

For organizations with many Lambda functions, a module reduces boilerplate.

```hcl
# modules/lambda-role/variables.tf
variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "additional_policy_arns" {
  description = "Additional managed policy ARNs to attach"
  type        = list(string)
  default     = []
}

variable "custom_policy_json" {
  description = "Custom inline policy JSON"
  type        = string
  default     = ""
}

variable "enable_vpc_access" {
  description = "Whether the function needs VPC access"
  type        = bool
  default     = false
}

# modules/lambda-role/main.tf
data "aws_iam_policy_document" "trust" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}

# Always attach basic execution
resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Conditionally attach VPC access
resource "aws_iam_role_policy_attachment" "vpc" {
  count      = var.enable_vpc_access ? 1 : 0
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Attach additional managed policies
resource "aws_iam_role_policy_attachment" "additional" {
  for_each   = toset(var.additional_policy_arns)
  role       = aws_iam_role.this.name
  policy_arn = each.value
}

# Attach custom inline policy if provided
resource "aws_iam_role_policy" "custom" {
  count  = var.custom_policy_json != "" ? 1 : 0
  name   = "${var.function_name}-custom-policy"
  role   = aws_iam_role.this.id
  policy = var.custom_policy_json
}

output "role_arn" {
  value = aws_iam_role.this.arn
}

output "role_name" {
  value = aws_iam_role.this.name
}
```

## Best Practices for Lambda IAM Roles

1. **One role per function.** Each Lambda function should have its own execution role. Sharing roles between functions leads to overly broad permissions.

2. **Scope resources tightly.** Use specific ARNs rather than wildcards. Instead of `"Resource": "*"`, specify the exact S3 bucket, DynamoDB table, or SQS queue.

3. **Always include logging permissions.** Without CloudWatch Logs access, you cannot debug your Lambda functions.

4. **Use IAM Access Analyzer.** AWS IAM Access Analyzer can help identify unused permissions so you can tighten your policies.

5. **Tag your roles.** Tags help you track which Lambda function each role belongs to.

For related topics, see [How to Attach Multiple Policies to IAM Role in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-attach-multiple-policies-to-iam-role-in-terraform/view) and [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view).

## Conclusion

Creating properly scoped IAM roles for Lambda functions is essential for both security and functionality. Terraform makes it easy to define the trust policy, attach the right permissions, and keep everything version-controlled. Start with the basic execution role, add only the permissions your function actually needs, and consider creating a reusable module if you manage many Lambda functions. Your Lambda functions will be more secure, and your infrastructure will be easier to audit.
