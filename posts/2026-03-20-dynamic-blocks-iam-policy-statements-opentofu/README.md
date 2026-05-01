# How to Use Dynamic Blocks for IAM Policy Statements in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, IAM, Dynamic Blocks, Security, Policy

Description: Learn how to use dynamic blocks in OpenTofu to build AWS IAM policies with variable numbers of statements, conditions, and principals from structured data.

## Introduction

AWS IAM policies can contain multiple statements, each with its own actions, resources, and conditions. Hard-coding each statement in HCL is repetitive and error-prone. Dynamic blocks let you generate policy statements from a list, making complex IAM policies maintainable and data-driven.

## Dynamic Statement Blocks in IAM Policies

```hcl
variable "iam_policy_statements" {
  description = "List of IAM policy statements"
  type = list(object({
    sid       = string
    effect    = string
    actions   = list(string)
    resources = list(string)
  }))
  default = [
    {
      sid       = "AllowS3Read"
      effect    = "Allow"
      actions   = ["s3:GetObject", "s3:ListBucket"]
      resources = ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"]
    },
    {
      sid       = "AllowDynamoDB"
      effect    = "Allow"
      actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
      resources = ["arn:aws:dynamodb:*:*:table/my-table"]
    }
  ]
}

data "aws_iam_policy_document" "app" {
  # Generate one statement block per entry in the variable
  dynamic "statement" {
    for_each = var.iam_policy_statements
    content {
      sid       = statement.value.sid
      effect    = statement.value.effect
      actions   = statement.value.actions
      resources = statement.value.resources
    }
  }
}

resource "aws_iam_policy" "app" {
  name   = "app-policy"
  policy = data.aws_iam_policy_document.app.json
}
```

## Dynamic Statements with Conditions

For policies that require conditions (e.g., denying requests without MFA or restricting access by IP), use nested dynamic blocks.

```hcl
variable "conditional_statements" {
  type = list(object({
    sid       = string
    effect    = string
    actions   = list(string)
    resources = list(string)
    conditions = list(object({
      test     = string
      variable = string
      values   = list(string)
    }))
  }))
  default = [
    {
      sid       = "DenyWithoutMFA"
      effect    = "Deny"
      actions   = ["iam:*"]
      resources = ["*"]
      conditions = [
        {
          test     = "BoolIfExists"
          variable = "aws:MultiFactorAuthPresent"
          values   = ["false"]
        }
      ]
    }
  ]
}

data "aws_iam_policy_document" "mfa_policy" {
  dynamic "statement" {
    for_each = var.conditional_statements
    content {
      sid       = statement.value.sid
      effect    = statement.value.effect
      actions   = statement.value.actions
      resources = statement.value.resources

      # Nested dynamic block for conditions
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

## Dynamic Statement Blocks for Assume Role Policies

For IAM role trust policies with multiple trusted principals, use dynamic blocks.

```hcl
variable "trusted_roles" {
  description = "IAM role ARNs that can assume this role"
  type        = list(string)
  default     = []
}

variable "trusted_accounts" {
  description = "AWS account IDs that can assume this role"
  type        = list(string)
  default     = []
}

data "aws_iam_policy_document" "assume_role" {
  # One statement per trusted principal type
  dynamic "statement" {
    for_each = length(var.trusted_roles) > 0 ? [1] : []
    content {
      effect  = "Allow"
      actions = ["sts:AssumeRole"]
      principals {
        type        = "AWS"
        identifiers = var.trusted_roles
      }
    }
  }

  dynamic "statement" {
    for_each = length(var.trusted_accounts) > 0 ? [1] : []
    content {
      effect  = "Allow"
      actions = ["sts:AssumeRole"]
      principals {
        type = "AWS"
        identifiers = [
          for account_id in var.trusted_accounts : "arn:aws:iam::${account_id}:root"
        ]
      }
    }
  }
}

resource "aws_iam_role" "cross_account" {
  name               = "cross-account-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
```

## Conclusion

Dynamic blocks for IAM policy statements let you build arbitrarily complex policies from structured variable data. This pattern works particularly well when your organization has standardized policy templates - define the structure once in HCL, and let teams provide their specific statements as variable values without needing to write HCL themselves.
