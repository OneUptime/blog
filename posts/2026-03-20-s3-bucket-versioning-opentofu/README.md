# How to Configure S3 Bucket Versioning with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Versioning, Data Protection, Infrastructure as Code, MFA Delete

Description: Learn how to enable S3 bucket versioning with OpenTofu to preserve, retrieve, and restore every version of objects stored in your bucket for compliance and accidental deletion protection.

## Introduction

S3 versioning maintains multiple versions of an object in the same bucket. When enabled, every PUT and POST creates a new version rather than overwriting, and a simple DELETE adds a delete marker rather than removing existing versions. This provides protection against accidental deletions and enables point-in-time recovery of objects.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 permissions

## Step 1: Create a Versioned S3 Bucket

```hcl
resource "aws_s3_bucket" "versioned" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Versioning  = "enabled"
    Environment = var.environment
  }
}

# Enable versioning on the bucket

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.versioned.id

  versioning_configuration {
    # "Enabled" turns on versioning for all new objects
    # "Suspended" stops creating new versions but preserves existing ones
    # "Disabled" is the default state (cannot be set after enabling)
    status = "Enabled"

    # MFA Delete adds a second factor for permanently deleting versions or changing versioning state
    # Requires the bucket-owner root account's MFA device and the resource-level mfa argument
    # Cannot be used with lifecycle configurations
    # mfa_delete = "Enabled"
  }
}
```

## Step 2: Combine Versioning with Lifecycle Rules

```hcl
# Lifecycle rules to manage old versions and reduce costs
resource "aws_s3_bucket_lifecycle_configuration" "versioned" {
  bucket = aws_s3_bucket.versioned.id

  depends_on = [aws_s3_bucket_versioning.main]

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    # Apply to all objects
    filter {}

    # Keep only the last 10 non-current versions
    noncurrent_version_expiration {
      noncurrent_days           = 90  # Delete versions older than 90 days
      newer_noncurrent_versions = 10  # Always keep 10 most recent versions
    }

    # Transition old versions to cheaper storage first
    noncurrent_version_transition {
      noncurrent_days           = 30
      newer_noncurrent_versions = 5
      storage_class             = "STANDARD_IA"
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

## Step 3: Block Public Access

```hcl
resource "aws_s3_bucket_public_access_block" "versioned" {
  bucket = aws_s3_bucket.versioned.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Step 4: Enable Encryption

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "versioned" {
  bucket = aws_s3_bucket.versioned.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}
```

## Step 5: List Versions via CLI

```bash
# List all versions of a specific object
aws s3api list-object-versions \
  --bucket my-versioned-bucket \
  --prefix "documents/report.pdf"

# Download a specific version
aws s3api get-object \
  --bucket my-versioned-bucket \
  --key "documents/report.pdf" \
  --version-id "abc123" \
  restored-report.pdf

# Delete a specific version permanently
aws s3api delete-object \
  --bucket my-versioned-bucket \
  --key "documents/report.pdf" \
  --version-id "abc123"
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 versioning is a fundamental data protection feature that should be enabled on any bucket containing important data. Combine versioning with lifecycle rules to manage storage costs-transition old versions to STANDARD_IA or GLACIER and set expiration policies. Note that versioning cannot be disabled once enabled (only suspended), and versioning-enabled buckets incur storage charges for all versions.
