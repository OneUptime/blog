# How to Create IAM Policies with jsonencode in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Infrastructure as Code, Security, JSON

Description: Learn how to use Terraform's jsonencode function to create AWS IAM policies with proper JSON formatting, dynamic values, and maintainable code.

---

When creating AWS IAM policies with Terraform, you need a way to express JSON policy documents within your HCL configuration files. The `jsonencode` function is one of the most popular approaches, offering a clean and maintainable way to define IAM policies directly in your Terraform code. This guide walks you through everything you need to know about using `jsonencode` for IAM policies.

## Why Use jsonencode?

Terraform provides several ways to define IAM policy documents. You could use heredoc strings with raw JSON, the `aws_iam_policy_document` data source, or the `jsonencode` function. Each approach has its trade-offs.

The `jsonencode` function converts an HCL expression into a valid JSON string. This is particularly useful for IAM policies because you can write your policy using HCL syntax while Terraform handles the JSON conversion. Benefits include syntax highlighting in your editor, automatic formatting, the ability to use Terraform variables and expressions, and compile-time validation of the structure.

## Prerequisites

Make sure you have the following ready:

- Terraform 1.0 or later
- AWS account with IAM management permissions
- AWS CLI configured with valid credentials

## Basic jsonencode Usage

Here is the simplest example of creating an IAM policy with `jsonencode`.

```hcl
# Create an IAM policy using jsonencode
resource "aws_iam_policy" "s3_read_only" {
  name        = "s3-read-only"
  description = "Allows read-only access to S3 buckets"

  # jsonencode converts the HCL map to valid JSON
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowS3ReadOnly"
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          "arn:aws:s3:::my-bucket",
          "arn:aws:s3:::my-bucket/*"
        ]
      }
    ]
  })
}
```

The `jsonencode` function takes an HCL map or list and produces a properly formatted JSON string. The `Version` and `Statement` keys follow the standard IAM policy structure.

## Multiple Statements in a Policy

Most real-world policies contain multiple statements. Here is how to define them.

```hcl
resource "aws_iam_policy" "developer_access" {
  name        = "developer-access"
  description = "Developer access policy with multiple permission sets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow reading from specific S3 buckets
        Sid    = "S3ReadAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::app-data-*",
          "arn:aws:s3:::app-data-*/*"
        ]
      },
      {
        # Allow managing DynamoDB tables with a specific prefix
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/app-*"
      },
      {
        # Allow reading CloudWatch logs
        Sid    = "CloudWatchLogsRead"
        Effect = "Allow"
        Action = [
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Using Terraform Variables with jsonencode

One of the biggest advantages of `jsonencode` over raw JSON strings is the ability to use Terraform variables and expressions.

```hcl
# Define variables for dynamic policy creation
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "allowed_s3_buckets" {
  description = "List of S3 bucket names to allow access to"
  type        = list(string)
  default     = ["app-data", "app-logs", "app-config"]
}

# Build resource ARNs dynamically from the bucket list
locals {
  s3_bucket_arns = flatten([
    for bucket in var.allowed_s3_buckets : [
      "arn:aws:s3:::${bucket}-${var.environment}",
      "arn:aws:s3:::${bucket}-${var.environment}/*"
    ]
  ])
}

resource "aws_iam_policy" "dynamic_s3_access" {
  name        = "s3-access-${var.environment}"
  description = "S3 access policy for ${var.environment} environment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowS3Access"
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        # Use the dynamically built ARN list
        Resource = local.s3_bucket_arns
      },
      {
        Sid    = "AllowKMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "arn:aws:kms:us-east-1:${var.aws_account_id}:key/*"
      }
    ]
  })
}
```

## Adding Conditions to Policies

IAM policy conditions let you control when a policy takes effect. Here is how to include them with `jsonencode`.

```hcl
resource "aws_iam_policy" "conditional_access" {
  name        = "conditional-s3-access"
  description = "S3 access restricted by IP and MFA"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3WithConditions"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::sensitive-data/*"
        # Require MFA and restrict to specific IP range
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
          IpAddress = {
            "aws:SourceIp" = [
              "10.0.0.0/8",
              "172.16.0.0/12"
            ]
          }
        }
      }
    ]
  })
}
```

## Deny Statements with jsonencode

Explicit deny statements are powerful for preventing specific actions regardless of other allow policies.

```hcl
resource "aws_iam_policy" "deny_dangerous_actions" {
  name        = "deny-dangerous-actions"
  description = "Explicitly denies dangerous IAM and billing actions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyIAMChanges"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachUserPolicy",
          "iam:AttachRolePolicy"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyBillingAccess"
        Effect = "Deny"
        Action = [
          "aws-portal:*",
          "budgets:*",
          "cur:*"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Building Policies Dynamically with for Expressions

You can use Terraform's `for` expressions inside `jsonencode` to build statements dynamically.

```hcl
variable "service_permissions" {
  description = "Map of services and their allowed actions"
  type = map(object({
    actions   = list(string)
    resources = list(string)
  }))
  default = {
    s3 = {
      actions   = ["s3:GetObject", "s3:PutObject"]
      resources = ["arn:aws:s3:::my-bucket/*"]
    }
    dynamodb = {
      actions   = ["dynamodb:GetItem", "dynamodb:PutItem"]
      resources = ["arn:aws:dynamodb:us-east-1:*:table/my-table"]
    }
    sqs = {
      actions   = ["sqs:SendMessage", "sqs:ReceiveMessage"]
      resources = ["arn:aws:sqs:us-east-1:*:my-queue"]
    }
  }
}

resource "aws_iam_policy" "dynamic_multi_service" {
  name        = "dynamic-multi-service-policy"
  description = "Dynamically generated policy from service map"

  policy = jsonencode({
    Version = "2012-10-17"
    # Generate one statement per service using a for expression
    Statement = [
      for service_name, config in var.service_permissions : {
        Sid      = "Allow${title(service_name)}Access"
        Effect   = "Allow"
        Action   = config.actions
        Resource = config.resources
      }
    ]
  })
}
```

## Inline Policies vs Managed Policies

You can use `jsonencode` for both managed policies and inline policies.

```hcl
# Managed policy (standalone, reusable)
resource "aws_iam_policy" "managed_example" {
  name   = "managed-example"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:ListAllMyBuckets"]
      Resource = "*"
    }]
  })
}

# Inline policy attached directly to a role
resource "aws_iam_role_policy" "inline_example" {
  name = "inline-example"
  role = aws_iam_role.my_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::my-bucket/*"
    }]
  })
}
```

## Common Mistakes to Avoid

When using `jsonencode` for IAM policies, watch out for these common pitfalls:

1. **Forgetting the Version field.** Always include `Version = "2012-10-17"` in your policy. Without it, AWS defaults to an older policy version that may not support all features.

2. **Incorrect Resource ARN format.** Double-check your ARN formats. A missing wildcard or incorrect region can cause unexpected access denials.

3. **Using HCL booleans instead of strings for conditions.** IAM conditions often expect string values like `"true"` rather than HCL boolean `true`.

4. **Not handling empty lists.** If a dynamic expression might produce an empty list for actions or resources, the policy will be invalid.

## jsonencode vs aws_iam_policy_document

Both approaches are valid. Use `jsonencode` when you want a straightforward, inline policy definition that closely mirrors the JSON structure. Use `aws_iam_policy_document` when you need to merge multiple policy fragments or when you prefer a more declarative, HCL-native syntax. You can learn more about the data source approach in [How to Create IAM Policies with aws_iam_policy_document in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-policies-with-aws-iam-policy-document-in-terraform/view).

## Conclusion

The `jsonencode` function provides a clean and flexible way to define IAM policies in Terraform. It gives you the full power of HCL expressions, variables, and loops while producing valid JSON policy documents. By combining `jsonencode` with Terraform variables and local values, you can create dynamic, reusable policies that adapt to your infrastructure needs. Start with simple policies and gradually adopt more advanced patterns like dynamic statement generation as your infrastructure grows.
