# How to Create S3 Buckets with Server-Side Encryption in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Encryption, KMS, Security, Infrastructure as Code

Description: Learn how to create S3 buckets with server-side encryption using SSE-S3, SSE-KMS, and DSSE-KMS encryption options in OpenTofu to protect data at rest.

## Introduction

S3 server-side encryption (SSE) automatically encrypts objects when stored and decrypts them when retrieved. You can choose between Amazon S3-managed keys (SSE-S3), KMS keys (SSE-KMS), or dual-layer encryption (DSSE-KMS). This guide covers SSE-S3 and SSE-KMS with a customer-managed KMS key.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 and KMS permissions

## Step 1: Create a KMS Key for S3 Encryption

```hcl
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = { Name = "s3-encryption-key" }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/s3-encryption"
  target_key_id = aws_kms_key.s3.key_id
}
```

## Step 2: Create S3 Bucket with SSE-KMS Encryption

```hcl
resource "aws_s3_bucket" "encrypted" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Environment = var.environment
  }
}

# Apply SSE-KMS encryption to the bucket

resource "aws_s3_bucket_server_side_encryption_configuration" "kms" {
  bucket = aws_s3_bucket.encrypted.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }

    # Enable bucket keys to reduce KMS API calls and costs
    bucket_key_enabled = true
  }
}
```

## Step 3: Create Bucket with SSE-S3 (Amazon S3-Managed Keys)

```hcl
resource "aws_s3_bucket" "sse_s3" {
  bucket = "${var.bucket_name}-sse-s3"
}

# SSE-S3 uses AES-256 with Amazon S3-managed keys (no KMS charges)
resource "aws_s3_bucket_server_side_encryption_configuration" "sse_s3" {
  bucket = aws_s3_bucket.sse_s3.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

## Step 4: Enforce Encryption via Bucket Policy

```hcl
# Deny uploads without server-side encryption
resource "aws_s3_bucket_policy" "enforce_encryption" {
  bucket = aws_s3_bucket.encrypted.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.encrypted.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid    = "DenyWrongKMSKey"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.encrypted.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption-aws-kms-key-id" = aws_kms_key.s3.arn
          }
        }
      }
    ]
  })
}
```

## Step 5: Block Public Access

```hcl
# Block all public access for sensitive buckets
resource "aws_s3_bucket_public_access_block" "encrypted" {
  bucket = aws_s3_bucket.encrypted.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 server-side encryption with customer-managed KMS keys provides the strongest control over your data encryption, enabling key rotation policies, access auditing via CloudTrail, and the ability to revoke access by disabling the key. Enable `bucket_key_enabled = true` to reduce KMS API call costs by up to 99% for buckets with high object access rates.
