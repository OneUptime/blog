# How to Create a KMS Key with OpenTofu on AWS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, KMS, Security, Encryption

Description: Learn how to create and manage AWS KMS customer-managed keys (CMKs) with key policies, aliases, and grants using OpenTofu for encryption across AWS services.

## Introduction

AWS Key Management Service (KMS) enables you to create and manage cryptographic keys for data encryption. Customer-managed keys give you full control over key rotation, access policies, and lifecycle management. This guide covers KMS key creation using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured

## Step 1: Configure the Provider

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
```

## Step 2: Create a KMS Key

```hcl
resource "aws_kms_key" "main" {
  description             = "KMS key for encrypting application data"
  deletion_window_in_days = 30  # 7-30 days before deletion

  # Enable automatic key rotation (annual)
  enable_key_rotation = true

  # Keep this as a single-Region key
  multi_region = false

  # Key policy
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow the AWS account to manage the key and delegate access via IAM
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        # Allow application role to use the key
        Sid    = "AllowApplicationUse"
        Effect = "Allow"
        Principal = {
          AWS = var.application_role_arn
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        # Allow CloudWatch Logs to use the key for log encryption
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Environment = "production"
    Purpose     = "application-encryption"
  }
}
```

## Step 3: Create a Key Alias

```hcl
# Human-readable alias for the key

resource "aws_kms_alias" "main" {
  name          = "alias/my-app-key"
  target_key_id = aws_kms_key.main.key_id
}
```

## Step 4: Create an Asymmetric Key for Signing

```hcl
resource "aws_kms_key" "signing" {
  description  = "Asymmetric KMS key for digital signatures"
  key_usage    = "SIGN_VERIFY"
  customer_master_key_spec = "RSA_4096"  # RSA 4096-bit for signing

  enable_key_rotation = false  # Not supported for asymmetric keys

  tags = {
    Purpose = "digital-signing"
  }
}

resource "aws_kms_alias" "signing" {
  name          = "alias/my-signing-key"
  target_key_id = aws_kms_key.signing.key_id
}
```

## Step 5: Create a Key Grant

```hcl
# Grant scoped access to a role
resource "aws_kms_grant" "lambda_access" {
  name              = "lambda-decrypt-grant"
  key_id            = aws_kms_key.main.key_id
  grantee_principal = var.lambda_role_arn

  operations = [
    "Decrypt",
    "DescribeKey"
  ]

  # Constraint - cryptographic operations such as Decrypt require a matching encryption context
  constraints {
    encryption_context_equals = {
      service = "my-lambda-function"
    }
  }
}
```

## Step 6: Outputs

```hcl
output "kms_key_arn" {
  value = aws_kms_key.main.arn
}

output "kms_key_alias_arn" {
  value = aws_kms_alias.main.arn
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created AWS KMS customer-managed keys using OpenTofu with key rotation, key policies, and key grants. Use customer-managed keys when you need full control over key access and lifecycle. Use key grants for scoped access delegation, and use encryption context for additional authorization controls on supported cryptographic operations.
