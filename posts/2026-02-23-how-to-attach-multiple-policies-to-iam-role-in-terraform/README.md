# How to Attach Multiple Policies to IAM Role in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Infrastructure as Code, Security, Roles

Description: Learn how to attach multiple IAM policies to a single IAM role in Terraform using various approaches including for_each, count, and dynamic policy maps.

---

When working with AWS IAM roles, you almost always need to attach more than one policy. A Lambda function role might need access to S3, DynamoDB, and CloudWatch Logs. An ECS task role might need permissions for secrets, S3, and SQS. Terraform provides several ways to attach multiple policies to a single role, and choosing the right approach depends on your specific needs.

This guide covers all the methods for attaching multiple policies to an IAM role in Terraform, with practical examples and recommendations for each approach.

## Understanding Policy Attachment in AWS

Before diving into Terraform code, it helps to understand how AWS handles policy attachments. Each IAM role can have up to 10 managed policies attached to it (this limit can be increased). Additionally, a role can have one inline policy per name. There are two main types of policies you can attach:

- **Managed policies**: Standalone policy objects that can be reused across multiple roles. These can be AWS-managed (created by AWS) or customer-managed (created by you).
- **Inline policies**: Policies embedded directly in the role. They are deleted when the role is deleted.

## Method 1: Individual Policy Attachment Resources

The most straightforward approach is to create a separate `aws_iam_role_policy_attachment` resource for each policy.

```hcl
# Create the IAM role
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Attach the basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach S3 read-only policy
resource "aws_iam_role_policy_attachment" "lambda_s3" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# Attach DynamoDB full access policy
resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}
```

This approach is simple and readable but becomes verbose when you have many policies.

## Method 2: Using for_each with a Set of Policy ARNs

The `for_each` meta-argument lets you iterate over a collection to create multiple resources from a single block. This is the recommended approach for most cases.

```hcl
# Define the list of policy ARNs to attach
variable "lambda_policy_arns" {
  description = "List of IAM policy ARNs to attach to the Lambda role"
  type        = list(string)
  default = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    "arn:aws:iam::aws:policy/AmazonSQSFullAccess",
  ]
}

# Create the role
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Attach all policies using for_each
resource "aws_iam_role_policy_attachment" "lambda_policies" {
  for_each = toset(var.lambda_policy_arns)

  role       = aws_iam_role.lambda_role.name
  policy_arn = each.value
}
```

Using `toset()` converts the list to a set, which is required by `for_each`. Each policy ARN becomes both the key and value in the iteration.

## Method 3: Mixing Managed and Custom Policies

Often you need a combination of AWS managed policies and custom policies you define yourself.

```hcl
# Create custom policies
resource "aws_iam_policy" "custom_s3_access" {
  name        = "custom-s3-access"
  description = "Custom S3 access for specific buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
      ]
      Resource = "arn:aws:s3:::my-app-data/*"
    }]
  })
}

resource "aws_iam_policy" "custom_secrets_access" {
  name        = "custom-secrets-access"
  description = "Access to specific secrets in Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:us-east-1:*:secret:app/*"
    }]
  })
}

# Combine AWS managed and custom policy ARNs
locals {
  all_policy_arns = concat(
    [
      # AWS managed policies
      "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      "arn:aws:iam::aws:policy/AmazonSQSFullAccess",
    ],
    [
      # Custom policies
      aws_iam_policy.custom_s3_access.arn,
      aws_iam_policy.custom_secrets_access.arn,
    ]
  )
}

# Create the role
resource "aws_iam_role" "app_role" {
  name = "app-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Attach all policies
resource "aws_iam_role_policy_attachment" "app_policies" {
  for_each = toset(local.all_policy_arns)

  role       = aws_iam_role.app_role.name
  policy_arn = each.value
}
```

## Method 4: Using a Map for Named Attachments

When you want more descriptive resource addresses in your Terraform state, use a map instead of a set.

```hcl
# Define policies as a map with descriptive names
variable "role_policies" {
  description = "Map of policy names to their ARNs"
  type        = map(string)
  default = {
    basic_execution = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    s3_access       = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
    dynamodb_access = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
    sqs_access      = "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
    vpc_access      = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  }
}

resource "aws_iam_role_policy_attachment" "policies" {
  for_each = var.role_policies

  role       = aws_iam_role.lambda_role.name
  policy_arn = each.value
}
```

With this approach, your state addresses look like `aws_iam_role_policy_attachment.policies["basic_execution"]` instead of using the full ARN as the key.

## Method 5: Adding Inline Policies

For policies that should be tightly coupled to the role, use inline policies alongside managed policy attachments.

```hcl
resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  # Inline policy defined directly on the role
  inline_policy {
    name = "task-specific-permissions"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:us-east-1:*:parameter/app/*"
      }]
    })
  }

  # You can add multiple inline policies
  inline_policy {
    name = "logging-permissions"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "*"
      }]
    })
  }
}

# Also attach managed policies
resource "aws_iam_role_policy_attachment" "ecs_managed_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess",
  ])

  role       = aws_iam_role.ecs_task_role.name
  policy_arn = each.value
}
```

## Method 6: Creating a Reusable Module

For complex setups, wrap the role and policy attachment logic in a module.

```hcl
# modules/iam-role/variables.tf
variable "role_name" {
  description = "Name of the IAM role"
  type        = string
}

variable "trusted_service" {
  description = "AWS service that can assume this role"
  type        = string
}

variable "managed_policy_arns" {
  description = "List of managed policy ARNs to attach"
  type        = list(string)
  default     = []
}

variable "inline_policies" {
  description = "Map of inline policy names to their JSON documents"
  type        = map(string)
  default     = {}
}

# modules/iam-role/main.tf
resource "aws_iam_role" "this" {
  name = var.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = var.trusted_service
      }
      Action = "sts:AssumeRole"
    }]
  })

  # Dynamically create inline policies
  dynamic "inline_policy" {
    for_each = var.inline_policies

    content {
      name   = inline_policy.key
      policy = inline_policy.value
    }
  }
}

resource "aws_iam_role_policy_attachment" "managed" {
  for_each = toset(var.managed_policy_arns)

  role       = aws_iam_role.this.name
  policy_arn = each.value
}
```

Then use it from your root module:

```hcl
module "lambda_role" {
  source = "./modules/iam-role"

  role_name       = "my-lambda-role"
  trusted_service = "lambda.amazonaws.com"

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    aws_iam_policy.custom_policy.arn,
  ]

  inline_policies = {
    ssm_access = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "*"
      }]
    })
  }
}
```

## Best Practices

1. **Prefer managed policies over inline policies** when the permissions might be reused across multiple roles.
2. **Use `for_each` instead of `count`** for policy attachments. It handles additions and removals more gracefully.
3. **Be mindful of the 10-policy limit** per role. If you exceed it, request a limit increase or consolidate policies.
4. **Name your policies clearly** so that `terraform plan` output is easy to understand.
5. **Use variables for policy ARNs** to make your configurations reusable across environments.

For related topics, see [How to Create IAM Roles for Lambda Functions in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-lambda-functions-in-terraform/view) and [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view).

## Conclusion

Attaching multiple policies to an IAM role is a fundamental task when working with AWS and Terraform. The `for_each` approach with a set or map of policy ARNs is the most maintainable method for most scenarios. For complex setups with both managed and inline policies, consider creating a reusable module. Whatever approach you choose, keep your policy attachments well-organized and your permissions as narrow as possible.
