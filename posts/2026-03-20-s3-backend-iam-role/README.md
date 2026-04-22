# How to Configure S3 Backend with IAM Role Assumption in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS, Security

Description: Learn how to configure the OpenTofu S3 backend to assume an IAM role for accessing state storage, enabling cross-account state management and least-privilege access.

## Introduction

IAM role assumption is a best practice for OpenTofu's S3 backend. Instead of using long-lived credentials directly, OpenTofu assumes a specific role with only the permissions needed to manage state. This supports cross-account setups, improves security, and integrates cleanly with AWS IAM Identity Center (SSO).

## Basic Role Assumption Configuration

```hcl
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    assume_role = {
      # Assume this role for backend operations
      role_arn = "arn:aws:iam::123456789012:role/TerraformStateAccess"

      # Optional: external ID for cross-account access
      external_id = "my-terraform-external-id"

      # Optional: session name for CloudTrail visibility
      session_name = "OpenTofu-Backend-prod"
    }
  }
}
```

## Cross-Account State Access

A common pattern is storing state in a dedicated "ops" account while deploying to other accounts:

```hcl
terraform {
  backend "s3" {
    bucket   = "ops-account-terraform-state"
    key      = "prod-account/app/terraform.tfstate"
    region   = "us-east-1"
    encrypt  = true

    assume_role = {
      # Role in the ops account (where state bucket lives)
      role_arn = "arn:aws:iam::OPS_ACCOUNT_ID:role/TerraformStateManager"
    }
  }
}

# Separate provider configuration for deploying to prod account

provider "aws" {
  region = "us-east-1"

  # This role is in the prod account
  assume_role {
    role_arn = "arn:aws:iam::PROD_ACCOUNT_ID:role/TerraformDeployRole"
  }
}
```

## Creating the State Access Role

```hcl
# ops-account IAM role for state access
resource "aws_iam_role" "terraform_state_access" {
  name = "TerraformStateAccess"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = [
            # CI/CD role in the CI account
            "arn:aws:iam::CI_ACCOUNT_ID:role/github-actions",
            # Dev role for manual operations
            "arn:aws:iam::DEVELOPER_ACCOUNT_ID:role/terraform-developer"
          ]
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "my-terraform-external-id"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "terraform_state_access" {
  name = "TerraformStateAccessPolicy"
  role = aws_iam_role.terraform_state_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::ops-account-terraform-state/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::ops-account-terraform-state"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DescribeTable", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:us-east-1:OPS_ACCOUNT_ID:table/terraform-state-locks"
      }
    ]
  })
}
```

## Role Chaining

For complex setups, you can chain role assumptions (source role → intermediate role → final role):

```bash
# The CI runner first obtains credentials for a CI role.
# OpenTofu then uses those current credentials to call STS and assume the state role.
# AWS limits chained role sessions to a maximum of one hour.
```

## Session Names for Audit

Use a session name to improve CloudTrail visibility:

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"

    assume_role = {
      role_arn     = "arn:aws:iam::123456789012:role/TerraformStateAccess"
      session_name = "OpenTofu-Prod-Deploy"
    }
  }
}
```

CloudTrail will show the session name in API calls, making it easy to trace state operations.

## Duration Configuration

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"

    assume_role = {
      role_arn     = "arn:aws:iam::123456789012:role/TerraformStateAccess"
      session_name = "opentofu-backend"
      duration     = "1h"
    }
  }
}
```

## Troubleshooting Role Assumption Failures

```bash
# Test role assumption manually
aws sts assume-role \
  --role-arn "arn:aws:iam::123456789012:role/TerraformStateAccess" \
  --role-session-name "test-session" \
  --external-id "my-terraform-external-id"

# Common errors:
# AccessDenied: Check the trust policy allows the caller's identity and the caller can call sts:AssumeRole
# InvalidClientTokenId: Check AWS credentials are valid
# The security token included in the request is expired: Refresh credentials
```

## Conclusion

Configuring IAM role assumption for the S3 backend follows the principle of least privilege and enables clean cross-account infrastructure management. The OpenTofu process assumes a role with only state management permissions, keeping those permissions separate from the infrastructure deployment permissions. This pattern is foundational for enterprise AWS environments managing multiple accounts.
