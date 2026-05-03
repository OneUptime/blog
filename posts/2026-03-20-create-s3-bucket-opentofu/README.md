# How to Create an S3 Bucket with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Storage, Infrastructure as Code

Description: Learn how to create and configure an AWS S3 bucket with OpenTofu, including versioning, encryption, access control, and lifecycle policies.

## Introduction

Amazon S3 is the most commonly used AWS storage service. OpenTofu's AWS provider splits S3 configuration across multiple resource types-bucket, versioning, encryption, ACL, and lifecycle-following the AWS provider v4+ pattern where each configuration concern is its own resource.

## Basic Bucket

```hcl
resource "aws_s3_bucket" "data" {
  bucket = var.bucket_name  # Must be globally unique

  tags = {
    Name        = var.bucket_name
    Environment = var.environment
  }
}
```

## Versioning

```hcl
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Server-Side Encryption

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      # Use AWS-managed keys (SSE-S3)
      sse_algorithm = "AES256"

      # Or use a customer-managed KMS key (SSE-KMS):
      # sse_algorithm     = "aws:kms"
      # kms_master_key_id = aws_kms_key.s3.arn
    }

    # Use an S3 Bucket Key to reduce SSE-KMS request costs
    bucket_key_enabled = true
  }
}
```

## Block Public Access

```hcl
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  # Block all forms of public access
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Lifecycle Rules

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "transition-and-expire"
    status = "Enabled"

    # Empty filter applies the rule to all objects in the bucket
    filter {}

    # Move objects to cheaper storage after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Archive to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete objects after 365 days
    expiration {
      days = 365
    }

    # Clean up incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

## Bucket Policy

```hcl
data "aws_iam_policy_document" "bucket_policy" {
  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.data.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id
  policy = data.aws_iam_policy_document.bucket_policy.json

  # Ensure public access block is applied before the policy
  depends_on = [aws_s3_bucket_public_access_block.data]
}
```

## Outputs

```hcl
output "bucket_id"  { value = aws_s3_bucket.data.id }
output "bucket_arn" { value = aws_s3_bucket.data.arn }
output "bucket_regional_domain_name" {
  value = aws_s3_bucket.data.bucket_regional_domain_name
}
```

## Conclusion

A production S3 bucket requires multiple companion resources: versioning, encryption, public access blocking, and lifecycle rules. By managing each as a separate OpenTofu resource, you get granular control and clear separation of concerns across your storage configuration.
