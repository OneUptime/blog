# How to Secure OpenTofu State Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Security, State Files, Remote Backend, Encryption, Infrastructure as Code

Description: A comprehensive guide to securing OpenTofu state files through encryption, access controls, versioning, and locking to protect sensitive infrastructure data.

## Introduction

OpenTofu state files contain every attribute of your managed resources - including database passwords, private keys, and other secrets stored in plaintext. Securing state files is one of the most important security steps in any OpenTofu deployment.

## Use a Remote Backend - Never Local State in Production

Local state files checked into version control expose sensitive data. Always use a remote backend for anything beyond local development:

```hcl
# backend.tf - S3 remote backend with encryption and locking

terraform {
  backend "s3" {
    bucket         = "my-opentofu-state-prod"
    key            = "environments/prod/vpc/tofu.tfstate"
    region         = "us-east-1"

    # Server-side encryption with AWS KMS
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"

    # DynamoDB table for state locking
    dynamodb_table = "opentofu-state-locks"

    # Access logging
    # Enable on the bucket separately in AWS console or via OpenTofu
  }
}
```

## Provisioning the Secure S3 Backend

```hcl
# bootstrap/main.tf - create the secure backend resources
resource "aws_s3_bucket" "state" {
  bucket = "my-opentofu-state-prod"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.state.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_kms_key" "state" {
  description             = "KMS key for OpenTofu state encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_dynamodb_table" "state_lock" {
  name         = "opentofu-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

## IAM Policy: Least Privilege State Access

```hcl
# IAM policy granting only the permissions needed to read/write state
resource "aws_iam_policy" "opentofu_state" {
  name = "opentofu-state-access"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::my-opentofu-state-prod/environments/prod/vpc/tofu.tfstate"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::my-opentofu-state-prod"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/opentofu-state-locks"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.state.arn
      }
    ]
  })
}
```

## OpenTofu's Native State Encryption (v1.7+)

OpenTofu 1.7 introduced native state encryption, providing an additional layer on top of backend-level encryption:

```hcl
# terraform.tf - enable native state encryption
terraform {
  encryption {
    key_provider "pbkdf2" "passphrase" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "default" {
      keys = key_provider.pbkdf2.passphrase
    }

    state {
      method = method.aes_gcm.default
    }
  }
}
```

## Conclusion

Securing OpenTofu state requires multiple layers: a remote backend with server-side encryption and versioning, DynamoDB locking to prevent corruption, least-privilege IAM policies, and optionally native state encryption for defense in depth. Never commit state files to version control.
