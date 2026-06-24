# How to Configure S3 Backend with Server-Side Encryption in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS, Security, Encryption

Description: Learn how to configure the OpenTofu S3 backend with server-side encryption using SSE-S3, SSE-KMS, and DSSE-KMS to protect state files at rest in Amazon S3.

## Introduction

Server-side encryption (SSE) ensures that your OpenTofu state files are encrypted at rest in S3. This guide focuses on three AWS-managed S3 SSE options: SSE-S3 (S3-managed keys), SSE-KMS (AWS KMS-managed keys), and DSSE-KMS (dual-layer KMS encryption). It covers the OpenTofu backend settings for SSE-S3 and SSE-KMS, and the bucket-level default encryption configuration required for DSSE-KMS.

## Option 1: SSE-S3 (S3-Managed Keys)

The simplest option - AWS manages the encryption keys automatically:

```hcl
terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"

    # Enable SSE-S3 encryption (AES-256 with S3-managed keys)
    encrypt = true
  }
}
```

Pros: Zero configuration, no additional cost
Cons: No key rotation control, no CloudTrail audit of key usage

## Option 2: SSE-KMS (KMS-Managed Keys)

Use AWS KMS for key management with audit logging:

```hcl
terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"

    encrypt = true
    # Use a specific KMS key
    kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-4abc-9234-123456789012"

    # Or use the alias
    # kms_key_id = "alias/terraform-state"
  }
}
```

When using SSE-KMS, the `encrypt = true` flag is required.

## Creating the KMS Key for S3 SSE

```hcl
# Create the KMS key

resource "aws_kms_key" "s3_state" {
  description             = "KMS key for S3 state bucket SSE"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Allow S3 Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = ["kms:GenerateDataKey", "kms:Encrypt", "kms:Decrypt"]
        Resource = "*"
      },
      {
        Sid    = "Allow Terraform Roles"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/TerraformStateAccess"
        }
        Action = ["kms:GenerateDataKey", "kms:Encrypt", "kms:Decrypt", "kms:DescribeKey"]
        Resource = "*"
      },
      {
        Sid    = "Allow Root Full Access"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "s3_state" {
  name          = "alias/terraform-state-s3"
  target_key_id = aws_kms_key.s3_state.key_id
}
```

## Bucket-Level SSE Default

Enforce encryption on all objects in the bucket:

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3_state.arn
    }

    # Force bucket key to reduce KMS API calls (cost optimization)
    bucket_key_enabled = true
  }
}

# Enforce encryption - deny unencrypted PUTs
resource "aws_s3_bucket_policy" "enforce_encryption" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}
```

## Option 3: DSSE-KMS (Dual-Layer KMS Encryption)

For compliance requirements needing double encryption, configure DSSE-KMS as the bucket default. OpenTofu's S3 backend does not have a DSSE-KMS-specific argument, so do not set `encrypt` or `kms_key_id` in the backend when you want S3 to apply the bucket's DSSE-KMS default:

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state_dsse" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms:dsse"
      kms_master_key_id = aws_kms_key.s3_state.arn
    }
  }
}
```

Because this relies on the bucket default, do not combine it with a bucket policy that denies PUT requests solely because the `s3:x-amz-server-side-encryption` request header is absent.

## Combining S3 SSE with OpenTofu State Encryption

For defense in depth, use both S3 SSE and OpenTofu's native state encryption. For an existing unencrypted state, first migrate with an `unencrypted` fallback block as described by OpenTofu; the example below is for a new or already migrated state:

```hcl
terraform {
  backend "s3" {
    bucket     = "my-terraform-state"
    key        = "prod/terraform.tfstate"
    region     = "us-east-1"
    encrypt    = true
    kms_key_id = "alias/terraform-state-s3"  # S3-side encryption
  }

  encryption {
    key_provider "aws_kms" "opentofu_key" {
      kms_key_id = "alias/terraform-state-opentofu"  # OpenTofu-side encryption (different key)
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    method "aes_gcm" "method" {
      keys = key_provider.aws_kms.opentofu_key
    }

    state {
      method   = method.aes_gcm.method
      enforced = true
    }
  }
}
```

## Conclusion

Server-side encryption for the S3 backend is essential for protecting sensitive state files. SSE-S3 is the simplest option with zero overhead, while SSE-KMS adds key management control and CloudTrail audit trails. For regulated environments, combine S3 SSE with OpenTofu's native encryption for defense-in-depth protection. Enable bucket-level SSE defaults and enforcement policies to ensure no state file is ever stored unencrypted.
