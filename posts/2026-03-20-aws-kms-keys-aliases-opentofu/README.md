# How to Create AWS KMS Keys and Aliases with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, KMS, Encryption, Key Management, Security, Infrastructure as Code

Description: Learn how to create and manage AWS KMS customer-managed keys and aliases with OpenTofu, including key policies, automatic rotation, and multi-region keys.

## Introduction

AWS KMS customer managed keys provide full control over encryption keys used to protect your AWS resources-S3, EBS, RDS, DynamoDB, and more. Unlike AWS-managed keys, customer managed keys allow custom key policies, usage auditing via CloudTrail, the ability to disable or schedule deletion of keys, and cross-account sharing. For cross-Region architectures, AWS KMS also supports multi-Region keys.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with KMS permissions

## Step 1: Create a General-Purpose KMS Key

```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_kms_key" "main" {
  description             = "Customer-managed key for ${var.project_name}"
  deletion_window_in_days = 30  # 7-30 days; key can be recovered during this window
  enable_key_rotation     = true  # Automatic annual rotation

  # Custom key policy
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Key Administrators"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.admin_role_name}"
          ]
        }
        Action = [
          "kms:Create*", "kms:Describe*", "kms:Enable*", "kms:List*",
          "kms:Put*", "kms:Update*", "kms:Revoke*", "kms:Disable*",
          "kms:Get*", "kms:Delete*", "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow Key Users"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.app_role_name}"
          ]
        }
        Action = [
          "kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*",
          "kms:GenerateDataKey*", "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-cmk"
    Environment = var.environment
    Purpose     = "General"
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project_name}/main"
  target_key_id = aws_kms_key.main.key_id
}
```

## Step 2: Create Service-Specific Keys

```hcl
# Separate key for RDS (grant access to the IAM principal that creates the RDS resource)

resource "aws_kms_key" "rds" {
  description         = "KMS key for RDS encryption"
  enable_key_rotation = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.app_role_name}" }
        Action    = ["kms:DescribeKey"]
        Resource  = "*"
      },
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.app_role_name}" }
        Action    = ["kms:CreateGrant", "kms:ListGrants", "kms:RevokeGrant"]
        Resource  = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "rds.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-rds-key"
    Purpose = "RDS"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}/rds"
  target_key_id = aws_kms_key.rds.key_id
}
```

## Step 3: Create Multi-Region Key

```hcl
# Multi-region primary key (can replicate to other regions)
resource "aws_kms_key" "multi_region" {
  description         = "Multi-region KMS key for ${var.project_name}"
  enable_key_rotation = true
  multi_region        = true  # Enable multi-region capability

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
      Action    = "kms:*"
      Resource  = "*"
    }]
  })

  tags = {
    Name    = "${var.project_name}-multi-region-primary"
    Purpose = "MultiRegion"
  }
}

# Replica key in another region
resource "aws_kms_replica_key" "replica" {
  provider = aws.secondary_region

  description             = "Replica of ${var.project_name} multi-region key"
  primary_key_arn         = aws_kms_key.multi_region.arn
  deletion_window_in_days = 30

  tags = {
    Name   = "${var.project_name}-multi-region-replica"
    Region = var.secondary_region
  }
}
```

## Step 4: Cross-Account Key Sharing

```hcl
# Allow another account to use this key.
# Note: principals in the partner account also need an IAM policy in that account.
resource "aws_kms_key" "shared" {
  description         = "Shared key for cross-account encryption"
  enable_key_rotation = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.partner_account_id}:root" }
        Action    = ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:DescribeKey"]
        Resource  = "*"
      }
    ]
  })
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# View key details
aws kms describe-key --key-id alias/my-project/main

# View key rotation status
aws kms get-key-rotation-status \
  --key-id "$(aws kms describe-key --key-id alias/my-project/main --query 'KeyMetadata.KeyId' --output text)"
```

## Conclusion

Create separate KMS keys per service or data classification rather than sharing a single key-this limits the blast radius if a key is compromised and enables independent key lifecycle management. For symmetric customer managed keys with AWS-generated key material, enable automatic key rotation so AWS KMS rotates the backing cryptographic material while preserving the key ARN and alias. Multi-region keys are useful when you need related KMS keys with shared key material across Regions.
