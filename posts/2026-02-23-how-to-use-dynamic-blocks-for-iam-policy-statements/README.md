# How to Use Dynamic Blocks for IAM Policy Statements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, IAM, AWS, Security, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to build flexible IAM policies with variable-driven statements for scalable access management.

---

IAM policies are the backbone of AWS security. They define who can do what to which resources. As your infrastructure grows, IAM policies grow with it - more services, more resources, more fine-grained permissions. Maintaining these policies in Terraform gets cumbersome when you have to write each statement manually. Dynamic blocks let you generate IAM policy statements from structured data, making your access management code easier to maintain and audit.

## The Challenge with IAM Policies

A typical IAM policy has multiple statements, each with different actions, resources, and conditions. Writing them inline gets verbose:

```hcl
# This is manageable with a few statements but becomes unwieldy at scale
data "aws_iam_policy_document" "app" {
  statement {
    sid    = "ReadS3"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    resources = [
      "arn:aws:s3:::my-bucket",
      "arn:aws:s3:::my-bucket/*"
    ]
  }

  statement {
    sid    = "WriteDynamoDB"
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query"
    ]
    resources = [
      "arn:aws:dynamodb:us-east-1:*:table/my-table"
    ]
  }

  statement {
    sid    = "PublishSNS"
    effect = "Allow"
    actions = [
      "sns:Publish"
    ]
    resources = [
      "arn:aws:sns:us-east-1:*:my-topic"
    ]
  }

  # ... 10 more statements for a microservice
}
```

## Defining Policy Statements as Data

Structure your IAM statements as a variable:

```hcl
# variables.tf
variable "iam_statements" {
  description = "IAM policy statements for the application"
  type = list(object({
    sid       = string
    effect    = string
    actions   = list(string)
    resources = list(string)
    conditions = optional(list(object({
      test     = string
      variable = string
      values   = list(string)
    })), [])
  }))
}
```

Then define your statements in a tfvars file or locals:

```hcl
# iam_config.tf
locals {
  app_iam_statements = [
    {
      sid       = "ReadAppBucket"
      effect    = "Allow"
      actions   = ["s3:GetObject", "s3:ListBucket", "s3:HeadObject"]
      resources = [
        "arn:aws:s3:::${local.name_prefix}-data",
        "arn:aws:s3:::${local.name_prefix}-data/*"
      ]
      conditions = []
    },
    {
      sid       = "WriteAppBucket"
      effect    = "Allow"
      actions   = ["s3:PutObject", "s3:DeleteObject"]
      resources = ["arn:aws:s3:::${local.name_prefix}-data/uploads/*"]
      conditions = [
        {
          test     = "StringEquals"
          variable = "s3:x-amz-server-side-encryption"
          values   = ["aws:kms"]
        }
      ]
    },
    {
      sid       = "DynamoDBAccess"
      effect    = "Allow"
      actions   = [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      resources = [
        "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.name_prefix}-*"
      ]
      conditions = []
    },
    {
      sid       = "SQSAccess"
      effect    = "Allow"
      actions   = [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ]
      resources = [
        "arn:aws:sqs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${local.name_prefix}-*"
      ]
      conditions = []
    },
    {
      sid       = "CloudWatchLogs"
      effect    = "Allow"
      actions   = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/app/${local.name_prefix}*"]
      conditions = []
    }
  ]
}
```

## Generating the Policy with Dynamic Blocks

Now use a dynamic block in `aws_iam_policy_document` to generate statements:

```hcl
# iam.tf
data "aws_iam_policy_document" "app" {
  dynamic "statement" {
    for_each = local.app_iam_statements

    content {
      sid       = statement.value.sid
      effect    = statement.value.effect
      actions   = statement.value.actions
      resources = statement.value.resources

      # Conditionally add conditions if present
      dynamic "condition" {
        for_each = statement.value.conditions

        content {
          test     = condition.value.test
          variable = condition.value.variable
          values   = condition.value.values
        }
      }
    }
  }
}

resource "aws_iam_policy" "app" {
  name        = "${local.name_prefix}-app-policy"
  description = "IAM policy for the application in ${terraform.workspace}"
  policy      = data.aws_iam_policy_document.app.json

  tags = {
    Environment = terraform.workspace
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "app" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.app.arn
}
```

## Environment-Specific Permissions

Different environments need different levels of access. Use workspace-based conditions:

```hcl
locals {
  # Base permissions every environment needs
  base_statements = [
    {
      sid       = "CloudWatchLogs"
      effect    = "Allow"
      actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      resources = ["arn:aws:logs:*:*:log-group:/app/${local.name_prefix}*"]
      conditions = []
    },
    {
      sid       = "ECRPull"
      effect    = "Allow"
      actions   = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetAuthorizationToken"
      ]
      resources = ["*"]
      conditions = []
    }
  ]

  # Dev gets more permissive access for debugging
  dev_statements = [
    {
      sid       = "S3FullAccess"
      effect    = "Allow"
      actions   = ["s3:*"]
      resources = ["arn:aws:s3:::${local.name_prefix}-*"]
      conditions = []
    },
    {
      sid       = "DynamoDBFullAccess"
      effect    = "Allow"
      actions   = ["dynamodb:*"]
      resources = ["arn:aws:dynamodb:*:*:table/${local.name_prefix}-*"]
      conditions = []
    }
  ]

  # Production gets minimal required permissions
  prod_statements = [
    {
      sid       = "S3ReadOnly"
      effect    = "Allow"
      actions   = ["s3:GetObject", "s3:ListBucket"]
      resources = [
        "arn:aws:s3:::${local.name_prefix}-data",
        "arn:aws:s3:::${local.name_prefix}-data/*"
      ]
      conditions = []
    },
    {
      sid       = "S3WriteUploads"
      effect    = "Allow"
      actions   = ["s3:PutObject"]
      resources = ["arn:aws:s3:::${local.name_prefix}-data/uploads/*"]
      conditions = [
        {
          test     = "StringEquals"
          variable = "s3:x-amz-server-side-encryption"
          values   = ["aws:kms"]
        }
      ]
    },
    {
      sid       = "DynamoDBLimited"
      effect    = "Allow"
      actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
      resources = ["arn:aws:dynamodb:*:*:table/${local.name_prefix}-*"]
      conditions = []
    }
  ]

  # Select statements based on workspace
  env_statements = {
    dev     = local.dev_statements
    staging = local.prod_statements  # Staging matches prod permissions
    prod    = local.prod_statements
  }

  # Combine base + environment statements
  all_statements = concat(
    local.base_statements,
    lookup(local.env_statements, terraform.workspace, local.dev_statements)
  )
}

data "aws_iam_policy_document" "app" {
  dynamic "statement" {
    for_each = local.all_statements

    content {
      sid       = statement.value.sid
      effect    = statement.value.effect
      actions   = statement.value.actions
      resources = statement.value.resources

      dynamic "condition" {
        for_each = statement.value.conditions

        content {
          test     = condition.value.test
          variable = condition.value.variable
          values   = condition.value.values
        }
      }
    }
  }
}
```

## Generating Assume Role Policies

Dynamic blocks work great for trust policies too. When multiple services or accounts need to assume a role:

```hcl
variable "trusted_principals" {
  description = "List of principals that can assume this role"
  type = list(object({
    type        = string
    identifiers = list(string)
    conditions  = optional(list(object({
      test     = string
      variable = string
      values   = list(string)
    })), [])
  }))
  default = [
    {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    },
    {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789:role/admin"]
      conditions = [
        {
          test     = "StringEquals"
          variable = "sts:ExternalId"
          values   = ["my-external-id"]
        }
      ]
    }
  ]
}

data "aws_iam_policy_document" "assume_role" {
  dynamic "statement" {
    for_each = var.trusted_principals

    content {
      effect  = "Allow"
      actions = ["sts:AssumeRole"]

      principals {
        type        = statement.value.type
        identifiers = statement.value.identifiers
      }

      dynamic "condition" {
        for_each = statement.value.conditions

        content {
          test     = condition.value.test
          variable = condition.value.variable
          values   = condition.value.values
        }
      }
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${local.name_prefix}-app-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = {
    Environment = terraform.workspace
  }
}
```

## Building Service-Specific Policies

For microservices architectures, each service needs its own set of permissions:

```hcl
variable "services" {
  description = "Service configurations including their IAM needs"
  type = map(object({
    s3_buckets    = optional(list(string), [])
    sqs_queues    = optional(list(string), [])
    sns_topics    = optional(list(string), [])
    dynamo_tables = optional(list(string), [])
    secrets       = optional(list(string), [])
  }))
  default = {
    user_service = {
      dynamo_tables = ["users", "sessions"]
      sqs_queues    = ["user-events"]
      secrets       = ["db-credentials"]
    }
    order_service = {
      dynamo_tables = ["orders", "order-items"]
      sqs_queues    = ["order-events", "payment-events"]
      sns_topics    = ["order-notifications"]
      s3_buckets    = ["invoices"]
    }
  }
}

# Generate a policy for each service
data "aws_iam_policy_document" "service" {
  for_each = var.services

  # S3 access
  dynamic "statement" {
    for_each = length(each.value.s3_buckets) > 0 ? [1] : []

    content {
      sid    = "S3Access"
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ]
      resources = flatten([
        for bucket in each.value.s3_buckets : [
          "arn:aws:s3:::${local.name_prefix}-${bucket}",
          "arn:aws:s3:::${local.name_prefix}-${bucket}/*"
        ]
      ])
    }
  }

  # DynamoDB access
  dynamic "statement" {
    for_each = length(each.value.dynamo_tables) > 0 ? [1] : []

    content {
      sid    = "DynamoDBAccess"
      effect = "Allow"
      actions = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ]
      resources = [
        for table in each.value.dynamo_tables :
        "arn:aws:dynamodb:*:*:table/${local.name_prefix}-${table}"
      ]
    }
  }

  # SQS access
  dynamic "statement" {
    for_each = length(each.value.sqs_queues) > 0 ? [1] : []

    content {
      sid    = "SQSAccess"
      effect = "Allow"
      actions = [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ]
      resources = [
        for queue in each.value.sqs_queues :
        "arn:aws:sqs:*:*:${local.name_prefix}-${queue}"
      ]
    }
  }

  # Secrets Manager access
  dynamic "statement" {
    for_each = length(each.value.secrets) > 0 ? [1] : []

    content {
      sid       = "SecretsAccess"
      effect    = "Allow"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [
        for secret in each.value.secrets :
        "arn:aws:secretsmanager:*:*:secret:${local.name_prefix}/${secret}-*"
      ]
    }
  }
}

# Create a policy for each service
resource "aws_iam_policy" "service" {
  for_each = var.services

  name   = "${local.name_prefix}-${each.key}-policy"
  policy = data.aws_iam_policy_document.service[each.key].json
}
```

## Auditing Generated Policies

Always verify that the generated policies match your expectations:

```hcl
# Output the generated policy for review
output "app_policy_json" {
  description = "Generated IAM policy document"
  value       = data.aws_iam_policy_document.app.json
}

# Output per-service policies
output "service_policies" {
  description = "Generated service policies"
  value = {
    for name, doc in data.aws_iam_policy_document.service :
    name => doc.json
  }
}
```

```bash
# Review the generated policy before applying
terraform plan
terraform output -raw app_policy_json | jq .
```

## Summary

Dynamic blocks make IAM policy management in Terraform significantly cleaner. By defining permissions as structured data, you can build environment-specific policies, service-specific policies, and complex trust relationships without drowning in repetitive HCL. The key is to structure your data well, use nested dynamic blocks for conditions, and always review the generated policy JSON before applying. For more dynamic block patterns, see our post on [dynamic blocks for security group rules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-security-group-rules/view).
