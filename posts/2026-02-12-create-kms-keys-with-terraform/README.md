# How to Create KMS Keys with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, KMS, Security, Encryption

Description: A practical guide to creating and managing AWS KMS encryption keys with Terraform, including key policies, aliases, rotation, and multi-region replication.

---

AWS Key Management Service (KMS) is the foundation of encryption on AWS. Every time you encrypt an S3 object, an RDS database, an EBS volume, or a Secrets Manager secret, KMS is handling the encryption keys behind the scenes. Most of the time you can use AWS-managed keys and not think about it. But when you need fine-grained control over key policies, rotation, or cross-account access, you need customer-managed keys.

This post covers creating and managing KMS keys with Terraform, including key policies, aliases, automatic rotation, and multi-region setups.

## Basic KMS Key

Here's a symmetric encryption key - the most common type:

```hcl
# Basic KMS key for symmetric encryption
resource "aws_kms_key" "main" {
  description             = "Main encryption key for application data"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Key alias for easier reference
resource "aws_kms_alias" "main" {
  name          = "alias/myapp-main"
  target_key_id = aws_kms_key.main.key_id
}
```

A few important notes: `deletion_window_in_days` sets a waiting period before the key is permanently deleted. This is your safety net - once a key is deleted, anything encrypted with it is gone forever. Always set this to the maximum (30 days) for production keys. `enable_key_rotation` automatically creates new key material every year while keeping old material available for decryption.

## Key Policy

Key policies are the primary way to control who can use and manage a KMS key. Unlike most AWS resources, KMS keys don't inherit permissions from IAM policies alone - you need an explicit key policy.

This key policy grants the account root full access and allows specific roles to use the key for encryption:

```hcl
# KMS key with a custom key policy
resource "aws_kms_key" "app_data" {
  description             = "Encryption key for application data"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/admin"
        }
        Action = [
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
        Resource = "*"
      },
      {
        Sid    = "AllowKeyUsage"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/app-server",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/lambda-exec"
          ]
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
        Sid    = "AllowGrantsForAWSServices"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/app-server"
          ]
        }
        Action = [
          "kms:CreateGrant",
          "kms:ListGrants",
          "kms:RevokeGrant"
        ]
        Resource = "*"
        Condition = {
          Bool = {
            "kms:GrantIsForAWSResource" = "true"
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
```

The root account access statement is critical - without it, you can lock yourself out of the key entirely. Always include it.

## Keys for Specific Services

It's good practice to create separate KMS keys for different services. This limits the blast radius if a key is compromised and makes it easier to audit who's using what.

Here's a pattern for creating service-specific keys:

```hcl
# KMS key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Service = "s3"
  }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/myapp-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS database encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Service = "rds"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/myapp-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# KMS key for Secrets Manager
resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Service = "secrets-manager"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/myapp-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}
```

For using these keys with S3, see our post on [creating S3 buckets with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-s3-buckets-with-terraform/view). For Secrets Manager, check out [creating Secrets Manager secrets with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-secrets-manager-secrets-with-terraform/view).

## Cross-Account Access

To let another AWS account use your KMS key, add a statement to the key policy:

```hcl
# Key with cross-account access
resource "aws_kms_key" "shared" {
  description             = "Shared encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCrossAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::987654321098:root"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}
```

The other account also needs an IAM policy granting its users/roles permission to use the key. Cross-account KMS access requires both the key policy and the IAM policy to allow it.

## Multi-Region Keys

Multi-region keys replicate the same key material across AWS regions, so data encrypted in one region can be decrypted in another:

```hcl
# Primary multi-region key
resource "aws_kms_key" "primary" {
  description             = "Multi-region primary key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = true

  tags = {
    Role = "primary"
  }
}

resource "aws_kms_alias" "primary" {
  name          = "alias/myapp-global"
  target_key_id = aws_kms_key.primary.key_id
}

# Replica in another region
provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

resource "aws_kms_replica_key" "eu" {
  provider = aws.eu_west_1

  description             = "Multi-region replica key in eu-west-1"
  deletion_window_in_days = 30
  primary_key_arn         = aws_kms_key.primary.arn

  tags = {
    Role = "replica"
  }
}

resource "aws_kms_alias" "eu" {
  provider      = aws.eu_west_1
  name          = "alias/myapp-global"
  target_key_id = aws_kms_replica_key.eu.key_id
}
```

## Asymmetric Keys

For digital signatures or public-key encryption, you can create asymmetric keys:

```hcl
# RSA key for signing
resource "aws_kms_key" "signing" {
  description             = "RSA key for digital signatures"
  deletion_window_in_days = 30
  key_usage               = "SIGN_VERIFY"
  customer_master_key_spec = "RSA_2048"

  tags = {
    Purpose = "signing"
  }
}

# RSA key for encryption
resource "aws_kms_key" "asymmetric_encrypt" {
  description             = "RSA key for asymmetric encryption"
  deletion_window_in_days = 30
  key_usage               = "ENCRYPT_DECRYPT"
  customer_master_key_spec = "RSA_2048"

  tags = {
    Purpose = "encryption"
  }
}
```

Asymmetric keys don't support automatic rotation. You'll need to handle key rotation manually for these.

## Outputs

Export key information for other Terraform configurations:

```hcl
output "kms_key_id" {
  description = "The KMS key ID"
  value       = aws_kms_key.main.key_id
}

output "kms_key_arn" {
  description = "The KMS key ARN"
  value       = aws_kms_key.main.arn
}

output "kms_alias_arn" {
  description = "The KMS alias ARN"
  value       = aws_kms_alias.main.arn
}
```

## Common Mistakes

**Locking yourself out.** If you remove the root account access from the key policy, you can't modify the key anymore. The only way to recover is to contact AWS support.

**Forgetting grants.** Some AWS services (like EBS and RDS) use grants instead of direct key policies. Make sure the roles that interact with these services have `kms:CreateGrant` permission.

**Deleting keys too quickly.** The minimum deletion window is 7 days. Always use the maximum of 30 days for production keys. Better yet, disable the key first and wait before scheduling deletion.

## Wrapping Up

KMS keys are the backbone of encryption on AWS. Customer-managed keys give you control over who can access your encrypted data, audit trails through CloudTrail, and automatic key rotation. Create separate keys for different services, always include root account access in key policies, and never set the deletion window below 30 days for production. Encryption is only as strong as your key management, and Terraform makes it auditable.
