# How to Configure S3 Backend with Server-Side Encryption in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, AWS, Security

Description: Learn how to configure server-side encryption for OpenTofu state files stored in S3, including AES-256 and KMS-based encryption options.

## Introduction

S3 server-side encryption protects state files at rest in the S3 bucket. OpenTofu's S3 backend supports both AES-256 (SSE-S3) and KMS-based encryption (SSE-KMS). This is separate from OpenTofu's native state encryption - server-side encryption protects data in S3, while native state encryption encrypts before sending to S3.

## AES-256 Encryption (SSE-S3)

The simplest option - AWS manages the keys automatically:

```hcl
terraform {
  backend "s3" {
    bucket  = "my-tofu-state"
    key     = "production/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true  # Enables SSE-S3 (AES-256)
  }
}
```

## KMS Encryption (SSE-KMS)

Use your own KMS key for greater control and audit logging:

```hcl
terraform {
  backend "s3" {
    bucket     = "my-tofu-state"
    key        = "production/terraform.tfstate"
    region     = "us-east-1"
    encrypt    = true
    kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123-def-456"
  }
}
```

## Using KMS Key Alias

```hcl
terraform {
  backend "s3" {
    bucket     = "my-tofu-state"
    key        = "production/terraform.tfstate"
    region     = "us-east-1"
    encrypt    = true
    kms_key_id = "alias/opentofu-state"  # Use alias for flexibility
  }
}
```

## Enforcing Encryption on the Bucket

Use a bucket policy to deny uploads without encryption:

```hcl
resource "aws_s3_bucket_policy" "enforce_encryption" {
  bucket = aws_s3_bucket.tofu_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.tofu_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = ["aws:kms", "AES256"]
          }
        }
      }
    ]
  })
}
```

## Creating a KMS Key for State

```hcl
resource "aws_kms_key" "tofu_state" {
  description             = "KMS key for OpenTofu state files"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::123456789012:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid    = "Allow Terraform State Operations"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/TerraformDeployer"
        }
        Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
        Resource = "*"
      }
    ]
  })
}
```

## SSE-S3 vs SSE-KMS Comparison

| Feature | SSE-S3 | SSE-KMS |
|---|---|---|
| Key management | AWS-managed | Customer-managed |
| Cost | Free | $0.03/10,000 requests |
| Audit trail | No | CloudTrail logs |
| Key rotation | Automatic | Configurable |
| Cross-account access | Difficult | Easy with key policy |

## Combined: Server-Side + Native State Encryption

Use both for maximum protection:

```hcl
terraform {
  # S3 backend with server-side encryption (S3 layer)
  backend "s3" {
    bucket     = "my-tofu-state"
    key        = "production/terraform.tfstate"
    region     = "us-east-1"
    encrypt    = true
    kms_key_id = "alias/s3-state-key"
  }

  # OpenTofu native encryption (client-side layer)
  encryption {
    key_provider "aws_kms" "main" {
      kms_key_id = "alias/tofu-state-encryption-key"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }
    method "aes_gcm" "main" {
      keys = key_provider.aws_kms.main
    }
    state {
      method = method.aes_gcm.main
    }
  }
}
```

## Conclusion

S3 server-side encryption is a baseline requirement for protecting OpenTofu state. Use `encrypt = true` for automatic SSE-S3, or add `kms_key_id` for KMS encryption with audit logging and custom key control. For sensitive environments, combine S3 SSE with OpenTofu's native state encryption for defense-in-depth protection.
