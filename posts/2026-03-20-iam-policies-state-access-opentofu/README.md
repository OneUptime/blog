# How to Set Up IAM Policies for State File Access Control in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, IAM, State Files, Access Control, Security, AWS, Infrastructure as Code

Description: Learn how to design least-privilege IAM policies that grant OpenTofu CI/CD roles exactly the S3 and DynamoDB permissions needed to read, write, and lock state files.

## Introduction

State files in an S3 bucket are sensitive - they contain resource IDs, attribute values, and sometimes secrets. Overly broad IAM permissions like `s3:*` expose the entire bucket. This guide shows how to write tight IAM policies that grant only the permissions OpenTofu actually needs.

## Minimum S3 Permissions for State Operations

OpenTofu needs these S3 actions to read, write, and delete state objects within the prefix it uses:

```hcl
data "aws_iam_policy_document" "opentofu_state" {
  # List the bucket to check if the state key exists
  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::my-opentofu-state"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = [local.state_prefix, "${local.state_prefix}/*"]
    }
  }

  # Read, write, and delete state objects within a specific prefix
  statement {
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    # Scope to a specific path - each team gets their own prefix
    resources = ["arn:aws:s3:::my-opentofu-state/${local.state_prefix}/*"]
  }
}

locals {
  state_prefix = "teams/platform"
}
```

## Minimum DynamoDB Permissions for State Locking

```hcl
statement {
  effect = "Allow"
  actions = [
    "dynamodb:DescribeTable",
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:DeleteItem"
  ]
  # Scope to the specific locking table only
  resources = [
    "arn:aws:dynamodb:us-east-1:123456789012:table/opentofu-state-locks"
  ]
}
```

## KMS Permissions (If Using Customer-Managed Keys)

```hcl
statement {
  effect = "Allow"
  actions = [
    "kms:Encrypt",
    "kms:Decrypt",
    "kms:GenerateDataKey"
  ]
  resources = [aws_kms_key.state.arn]
}
```

## Full IAM Role for a CI/CD Pipeline

```hcl
resource "aws_iam_role" "opentofu_ci" {
  name = "opentofu-ci-role"

  # Allow GitHub Actions OIDC to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:my-org/infra-repo:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "opentofu_state" {
  name   = "opentofu-state-access"
  role   = aws_iam_role.opentofu_ci.id
  policy = data.aws_iam_policy_document.opentofu_state.json
}

resource "aws_iam_role_policy" "opentofu_lock" {
  name = "opentofu-lock-access"
  role = aws_iam_role.opentofu_ci.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:DescribeTable",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ]
      Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/opentofu-state-locks"
    }]
  })
}

# Attach this only if the state bucket uses a customer-managed KMS key
resource "aws_iam_role_policy" "opentofu_kms" {
  name = "opentofu-kms-access"
  role = aws_iam_role.opentofu_ci.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ]
      Resource = "arn:aws:kms:us-east-1:123456789012:key/11111111-2222-3333-4444-555555555555"
    }]
  })
}
```

## Separating Plan and Apply Roles

For stronger security, use separate roles for plan (read-only state) and apply (read-write state). If your backend uses DynamoDB locking or a customer-managed KMS key, attach those policies to both roles as needed:

```hcl
# Plan role: read-only state access

resource "aws_iam_role_policy" "plan_state" {
  name = "plan-state-read"
  role = aws_iam_role.opentofu_plan.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = "arn:aws:s3:::my-opentofu-state"
        Condition = {
          StringLike = {
            "s3:prefix" = "teams/platform/*"
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "arn:aws:s3:::my-opentofu-state/teams/platform/*"
      }
    ]
  })
}

# Apply role: state read-write access
resource "aws_iam_role_policy" "apply_state" {
  name   = "apply-state-write"
  role   = aws_iam_role.opentofu_apply.id
  policy = data.aws_iam_policy_document.opentofu_state.json
}
```

## Conclusion

Scoping IAM policies to specific S3 prefixes, specific DynamoDB tables, and specific KMS keys ensures the blast radius of a compromised CI/CD credential is limited. Using OIDC-based role assumption instead of long-lived access keys further reduces exposure by eliminating static credentials entirely.
