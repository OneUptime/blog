# How to Use Dynamic Blocks for Resource Policy Documents

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, IAM, Policy Document, Infrastructure as Code

Description: Learn how to build AWS IAM and resource policy documents dynamically in Terraform using the aws_iam_policy_document data source with dynamic statement blocks.

---

AWS resource policies - IAM policies, S3 bucket policies, SQS queue policies, KMS key policies - are JSON documents with a specific structure. Terraform's `aws_iam_policy_document` data source lets you build these documents with HCL instead of raw JSON, and dynamic blocks make the statement generation flexible and data-driven.

## The aws_iam_policy_document Data Source

Instead of writing JSON policy documents as strings, Terraform provides a data source that generates them:

```hcl
data "aws_iam_policy_document" "example" {
  statement {
    sid       = "AllowS3Access"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["arn:aws:s3:::my-bucket/*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789:role/my-role"]
    }
  }
}
```

This is cleaner than raw JSON. But when you need to generate statements dynamically - say, one per service or one per principal - dynamic blocks take it to the next level.

## Dynamic Statements from Variable Data

```hcl
variable "s3_access_grants" {
  description = "S3 access grants for different roles"
  type = list(object({
    sid         = string
    actions     = list(string)
    bucket_name = string
    prefix      = string
    principals  = list(string)
  }))
  default = [
    {
      sid         = "AllowAppRead"
      actions     = ["s3:GetObject", "s3:ListBucket"]
      bucket_name = "app-data"
      prefix      = "public/*"
      principals  = ["arn:aws:iam::123456789:role/app-role"]
    },
    {
      sid         = "AllowETLWrite"
      actions     = ["s3:PutObject", "s3:DeleteObject"]
      bucket_name = "app-data"
      prefix      = "etl-output/*"
      principals  = ["arn:aws:iam::123456789:role/etl-role"]
    }
  ]
}

data "aws_iam_policy_document" "s3_policy" {
  # Generate a statement for each access grant
  dynamic "statement" {
    for_each = var.s3_access_grants
    content {
      sid     = statement.value.sid
      effect  = "Allow"
      actions = statement.value.actions

      resources = [
        "arn:aws:s3:::${statement.value.bucket_name}",
        "arn:aws:s3:::${statement.value.bucket_name}/${statement.value.prefix}"
      ]

      principals {
        type        = "AWS"
        identifiers = statement.value.principals
      }
    }
  }
}

resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.app_data.id
  policy = data.aws_iam_policy_document.s3_policy.json
}
```

## IAM Role Policies with Dynamic Statements

Build IAM policies where each statement grants access to a specific resource:

```hcl
variable "role_permissions" {
  description = "Permission sets for the IAM role"
  type = list(object({
    sid       = string
    actions   = list(string)
    resources = list(string)
    conditions = optional(list(object({
      test     = string
      variable = string
      values   = list(string)
    })), [])
  }))
}

data "aws_iam_policy_document" "role_policy" {
  dynamic "statement" {
    for_each = var.role_permissions
    content {
      sid       = statement.value.sid
      effect    = "Allow"
      actions   = statement.value.actions
      resources = statement.value.resources

      # Dynamic conditions within the statement
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

resource "aws_iam_role_policy" "main" {
  name   = "dynamic-policy"
  role   = aws_iam_role.main.id
  policy = data.aws_iam_policy_document.role_policy.json
}
```

Usage:

```hcl
role_permissions = [
  {
    sid       = "AllowDynamoDB"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
    resources = ["arn:aws:dynamodb:us-east-1:123456789:table/users"]
    conditions = [
      {
        test     = "ForAllValues:StringEquals"
        variable = "dynamodb:LeadingKeys"
        values   = ["tenant-123"]
      }
    ]
  },
  {
    sid       = "AllowSQS"
    actions   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"]
    resources = ["arn:aws:sqs:us-east-1:123456789:processing-queue"]
  },
  {
    sid       = "AllowSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["arn:aws:secretsmanager:us-east-1:123456789:secret:app/*"]
    conditions = [
      {
        test     = "StringEquals"
        variable = "aws:RequestedRegion"
        values   = ["us-east-1"]
      }
    ]
  }
]
```

## KMS Key Policies

KMS key policies are particularly complex because they need statements for key administrators, key users, and grant management:

```hcl
variable "kms_key_admins" {
  description = "ARNs that can administer the KMS key"
  type        = list(string)
}

variable "kms_key_users" {
  description = "ARNs that can use the KMS key for encryption/decryption"
  type        = list(string)
}

variable "kms_grant_principals" {
  description = "ARNs that can create grants on the KMS key"
  type        = list(string)
  default     = []
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "kms_key_policy" {
  # Root account always has full access
  statement {
    sid       = "EnableRootAccess"
    effect    = "Allow"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  # Key administrators
  dynamic "statement" {
    for_each = length(var.kms_key_admins) > 0 ? [1] : []
    content {
      sid    = "AllowKeyAdministration"
      effect = "Allow"
      actions = [
        "kms:Create*",
        "kms:Describe*",
        "kms:Enable*",
        "kms:List*",
        "kms:Put*",
        "kms:Update*",
        "kms:Revoke*",
        "kms:Disable*",
        "kms:Get*",
        "kms:Delete*",
        "kms:TagResource",
        "kms:UntagResource",
        "kms:ScheduleKeyDeletion",
        "kms:CancelKeyDeletion"
      ]
      resources = ["*"]

      principals {
        type        = "AWS"
        identifiers = var.kms_key_admins
      }
    }
  }

  # Key users
  dynamic "statement" {
    for_each = length(var.kms_key_users) > 0 ? [1] : []
    content {
      sid    = "AllowKeyUsage"
      effect = "Allow"
      actions = [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ]
      resources = ["*"]

      principals {
        type        = "AWS"
        identifiers = var.kms_key_users
      }
    }
  }

  # Grant management
  dynamic "statement" {
    for_each = length(var.kms_grant_principals) > 0 ? [1] : []
    content {
      sid    = "AllowGrantManagement"
      effect = "Allow"
      actions = [
        "kms:CreateGrant",
        "kms:ListGrants",
        "kms:RevokeGrant"
      ]
      resources = ["*"]

      principals {
        type        = "AWS"
        identifiers = var.kms_grant_principals
      }

      condition {
        test     = "Bool"
        variable = "kms:GrantIsForAWSResource"
        values   = ["true"]
      }
    }
  }
}

resource "aws_kms_key" "main" {
  description = "Application encryption key"
  policy      = data.aws_iam_policy_document.kms_key_policy.json
}
```

## SQS Queue Policies

SQS queue policies are another common use case:

```hcl
variable "sqs_publishers" {
  description = "Services that can publish to this queue"
  type = list(object({
    sid            = string
    principal_type = string  # "AWS" or "Service"
    identifiers    = list(string)
    source_arn     = optional(string)
  }))
}

data "aws_iam_policy_document" "sqs_policy" {
  dynamic "statement" {
    for_each = var.sqs_publishers
    content {
      sid     = statement.value.sid
      effect  = "Allow"
      actions = ["sqs:SendMessage"]
      resources = [aws_sqs_queue.main.arn]

      principals {
        type        = statement.value.principal_type
        identifiers = statement.value.identifiers
      }

      # Optional source ARN condition (useful for S3 -> SQS notifications)
      dynamic "condition" {
        for_each = statement.value.source_arn != null ? [1] : []
        content {
          test     = "ArnEquals"
          variable = "aws:SourceArn"
          values   = [statement.value.source_arn]
        }
      }
    }
  }
}
```

## Combining Multiple Policy Documents

Terraform supports merging policy documents with `source_policy_documents`:

```hcl
# Base policy that all roles get
data "aws_iam_policy_document" "base" {
  statement {
    sid     = "AllowCloudWatchLogs"
    effect  = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

# Service-specific policy generated dynamically
data "aws_iam_policy_document" "service" {
  dynamic "statement" {
    for_each = var.service_permissions
    content {
      sid       = statement.value.sid
      effect    = "Allow"
      actions   = statement.value.actions
      resources = statement.value.resources
    }
  }
}

# Combined policy
data "aws_iam_policy_document" "combined" {
  source_policy_documents = [
    data.aws_iam_policy_document.base.json,
    data.aws_iam_policy_document.service.json
  ]
}

resource "aws_iam_role_policy" "combined" {
  name   = "combined-policy"
  role   = aws_iam_role.main.id
  policy = data.aws_iam_policy_document.combined.json
}
```

## Dynamic Principals in Statements

When a statement needs multiple principal types:

```hcl
variable "bucket_access" {
  type = list(object({
    sid = string
    actions = list(string)
    principals = list(object({
      type        = string
      identifiers = list(string)
    }))
  }))
}

data "aws_iam_policy_document" "bucket" {
  dynamic "statement" {
    for_each = var.bucket_access
    content {
      sid     = statement.value.sid
      effect  = "Allow"
      actions = statement.value.actions
      resources = [
        aws_s3_bucket.main.arn,
        "${aws_s3_bucket.main.arn}/*"
      ]

      # Dynamic principals block - can have multiple types
      dynamic "principals" {
        for_each = statement.value.principals
        content {
          type        = principals.value.type
          identifiers = principals.value.identifiers
        }
      }
    }
  }
}
```

## Summary

Building resource policy documents with dynamic blocks is one of the cleanest ways to manage AWS policies in Terraform. The `aws_iam_policy_document` data source combined with dynamic `statement` blocks lets you generate policies from structured data, merge multiple policy sources, and handle complex conditions. The patterns work the same whether you are building IAM policies, bucket policies, queue policies, or key policies. For related JSON handling, see [how to handle complex JSON policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-json-policies-in-terraform/view).
