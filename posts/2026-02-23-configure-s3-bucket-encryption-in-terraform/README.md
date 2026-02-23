# How to Configure S3 Bucket Encryption in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Encryption, KMS, Security

Description: Learn how to configure S3 bucket encryption in Terraform using SSE-S3, SSE-KMS, and DSSE-KMS, including bucket keys, key policies, and enforcing encryption via bucket policies.

---

Every S3 bucket in production should have encryption configured. AWS offers several server-side encryption options, ranging from fully managed (zero effort) to customer-managed KMS keys (full control). Terraform makes it straightforward to configure any of them.

Since January 2023, AWS automatically encrypts all new objects with SSE-S3 (AES-256) even if you don't configure anything. But explicit configuration is still important for compliance, for using KMS keys, and for ensuring your Terraform state accurately reflects reality.

## Encryption Options

S3 supports three server-side encryption methods:

- **SSE-S3 (AES256)** - AWS manages everything. Zero cost, zero effort. Good for most use cases.
- **SSE-KMS (aws:kms)** - Uses AWS KMS keys. Provides audit trails via CloudTrail, key rotation, and access control through key policies. Costs $1/month per key plus $0.03 per 10,000 API calls.
- **DSSE-KMS** - Dual-layer server-side encryption with KMS keys. Provides two layers of encryption for highly regulated workloads.

## SSE-S3 Encryption (Default)

The simplest option. AWS handles key management completely.

```hcl
resource "aws_s3_bucket" "basic" {
  bucket_prefix = "basic-encrypted-"

  tags = {
    Name = "basic-encrypted"
  }
}

# Configure SSE-S3 encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "basic" {
  bucket = aws_s3_bucket.basic.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

## SSE-KMS with AWS Managed Key

Use the default AWS-managed KMS key for S3. You get CloudTrail audit logging of key usage without managing the key yourself.

```hcl
resource "aws_s3_bucket" "kms_managed" {
  bucket_prefix = "kms-managed-"

  tags = {
    Name = "kms-managed-encrypted"
  }
}

# SSE-KMS with the AWS-managed key (alias: aws/s3)
resource "aws_s3_bucket_server_side_encryption_configuration" "kms_managed" {
  bucket = aws_s3_bucket.kms_managed.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
      # Omitting kms_master_key_id uses the AWS-managed aws/s3 key
    }

    # Enable bucket key to reduce KMS API costs
    bucket_key_enabled = true
  }
}
```

The `bucket_key_enabled` setting is worth calling out. Without it, every S3 PutObject and GetObject call makes a separate KMS API call, which adds up quickly. With bucket keys enabled, S3 generates a bucket-level key from your KMS key and uses that for encryption, drastically reducing KMS API calls and costs.

## SSE-KMS with Customer Managed Key

For full control over the encryption key - custom key policies, cross-account access, manual key rotation - use a customer managed key (CMK).

```hcl
# Create a KMS key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Automatic annual rotation

  # Key policy controlling who can use and manage the key
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
        Sid    = "AllowS3ServiceAccess"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowAppRoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.app.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "s3-encryption-key"
  }
}

# Give the key a human-readable alias
resource "aws_kms_alias" "s3" {
  name          = "alias/s3-encryption"
  target_key_id = aws_kms_key.s3.key_id
}

# S3 bucket with CMK encryption
resource "aws_s3_bucket" "cmk_encrypted" {
  bucket_prefix = "cmk-encrypted-"

  tags = {
    Name = "cmk-encrypted"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cmk_encrypted" {
  bucket = aws_s3_bucket.cmk_encrypted.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}
```

## DSSE-KMS (Dual-Layer Encryption)

For regulated industries that require two layers of encryption.

```hcl
resource "aws_s3_bucket" "dual_layer" {
  bucket_prefix = "dsse-"

  tags = {
    Name = "dual-layer-encrypted"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dual_layer" {
  bucket = aws_s3_bucket.dual_layer.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms:dsse"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}
```

## Enforcing Encryption via Bucket Policy

The default encryption configuration applies encryption automatically, but it doesn't prevent someone from uploading an object with a different (or no) encryption method specified in their request. To enforce encryption, add a bucket policy.

```hcl
data "aws_iam_policy_document" "enforce_encryption" {
  # Deny PutObject without encryption
  statement {
    sid    = "DenyUnencryptedUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:PutObject"]

    resources = ["${aws_s3_bucket.enforced.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  # Deny PutObject without the specific KMS key
  statement {
    sid    = "DenyWrongKey"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:PutObject"]

    resources = ["${aws_s3_bucket.enforced.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.s3.arn]
    }
  }

  # Deny uploads without SSL
  statement {
    sid    = "DenyNonSSL"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.enforced.arn,
      "${aws_s3_bucket.enforced.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "enforced" {
  bucket = aws_s3_bucket.enforced.id
  policy = data.aws_iam_policy_document.enforce_encryption.json
}
```

## Per-Prefix Encryption

You can use different encryption keys for different object prefixes by specifying the key in the upload request rather than relying on the default encryption.

```hcl
# Key for sensitive data
resource "aws_kms_key" "sensitive" {
  description         = "Key for sensitive data in S3"
  enable_key_rotation = true

  tags = {
    DataClassification = "sensitive"
  }
}

# Key for general data
resource "aws_kms_key" "general" {
  description         = "Key for general data in S3"
  enable_key_rotation = true

  tags = {
    DataClassification = "general"
  }
}

# Default encryption uses the general key
resource "aws_s3_bucket_server_side_encryption_configuration" "multi_key" {
  bucket = aws_s3_bucket.multi_key.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.general.arn
    }
    bucket_key_enabled = true
  }
}

# Bucket policy enforcing the sensitive key for the sensitive/ prefix
data "aws_iam_policy_document" "multi_key" {
  statement {
    sid    = "EnforceSensitiveKey"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:PutObject"]

    resources = ["${aws_s3_bucket.multi_key.arn}/sensitive/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.sensitive.arn]
    }
  }
}
```

## Complete Production Setup

Here's a production-ready encrypted bucket with all the bells and whistles.

```hcl
# KMS key
resource "aws_kms_key" "production" {
  description             = "Production S3 encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = "production"
  }
}

resource "aws_kms_alias" "production" {
  name          = "alias/production-s3"
  target_key_id = aws_kms_key.production.key_id
}

# Bucket
resource "aws_s3_bucket" "production" {
  bucket_prefix = "prod-"

  tags = {
    Environment = "production"
  }
}

# Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "production" {
  bucket = aws_s3_bucket.production.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.production.arn
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "production" {
  bucket = aws_s3_bucket.production.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning
resource "aws_s3_bucket_versioning" "production" {
  bucket = aws_s3_bucket.production.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enforce encryption and SSL via bucket policy
resource "aws_s3_bucket_policy" "production" {
  bucket = aws_s3_bucket.production.id
  policy = data.aws_iam_policy_document.enforce_encryption.json

  depends_on = [aws_s3_bucket_public_access_block.production]
}
```

## Checking Encryption Status

Verify your configuration after applying:

```bash
# Check default encryption configuration
aws s3api get-bucket-encryption --bucket my-bucket

# Check encryption on a specific object
aws s3api head-object --bucket my-bucket --key my-object.txt

# List objects with their encryption info
aws s3api list-objects-v2 --bucket my-bucket --prefix data/ \
  --query "Contents[].Key" --output text | \
  while read key; do
    echo -n "$key: "
    aws s3api head-object --bucket my-bucket --key "$key" \
      --query "ServerSideEncryption" --output text
  done
```

## Summary

For most buckets, SSE-S3 (AES256) is sufficient and completely free. Step up to SSE-KMS when you need audit trails, key rotation control, or cross-account key sharing. Use DSSE-KMS only if regulations demand dual-layer encryption. Always enable `bucket_key_enabled` with KMS to keep costs down, and add bucket policies to enforce encryption requirements rather than relying solely on default encryption.

For more S3 security, see our guides on [configuring S3 bucket policies](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-policies-in-terraform/view) and [blocking public access to S3 buckets](https://oneuptime.com/blog/post/2026-02-23-block-public-access-to-s3-buckets-in-terraform/view).
