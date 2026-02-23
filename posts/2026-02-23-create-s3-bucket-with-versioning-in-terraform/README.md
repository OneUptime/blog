# How to Create S3 Bucket with Versioning in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Versioning, Data Protection

Description: A practical guide to creating S3 buckets with versioning enabled in Terraform, covering version management, lifecycle rules for old versions, MFA delete, and cost considerations.

---

S3 versioning keeps multiple variants of an object in the same bucket. Every time you overwrite or delete an object, S3 preserves the previous version instead of replacing it. This gives you a safety net against accidental deletions, a way to recover from application bugs that corrupt data, and an audit trail of changes.

Enabling versioning is simple. Managing it well - cleaning up old versions, handling delete markers, controlling costs - takes a bit more thought. Let's cover all of it in Terraform.

## Enabling Versioning

With the current AWS provider, versioning is configured as a separate resource from the bucket itself.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Create the S3 bucket
resource "aws_s3_bucket" "data" {
  bucket_prefix = "app-data-"

  tags = {
    Name        = "app-data"
    Environment = var.environment
  }
}

# Enable versioning on the bucket
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

That's all it takes to turn on versioning. Every new object put into this bucket will have a version ID, and overwriting an object creates a new version while preserving the old one.

## How Versioned Objects Work

When versioning is enabled:

- Each object has a unique **version ID** assigned by S3
- **Overwriting** an object creates a new version with a new version ID
- **Deleting** an object doesn't actually remove it - S3 adds a **delete marker** that hides the object from normal listing
- You can retrieve any previous version by specifying its version ID
- **Listing** the bucket normally only shows the latest version of each object

```bash
# Upload a file (creates version 1)
aws s3 cp file.txt s3://my-bucket/file.txt

# Overwrite it (creates version 2, version 1 is preserved)
aws s3 cp file-updated.txt s3://my-bucket/file.txt

# List all versions
aws s3api list-object-versions --bucket my-bucket --prefix file.txt

# Retrieve a specific version
aws s3api get-object --bucket my-bucket --key file.txt --version-id "abc123" output.txt

# Delete creates a delete marker (previous versions are preserved)
aws s3 rm s3://my-bucket/file.txt

# Restore by deleting the delete marker
aws s3api delete-object --bucket my-bucket --key file.txt --version-id "delete-marker-id"
```

## Versioning with Lifecycle Rules

Without lifecycle rules, old versions accumulate forever and your storage costs grow continuously. You should always pair versioning with lifecycle rules that clean up old versions.

```hcl
resource "aws_s3_bucket" "documents" {
  bucket_prefix = "documents-"

  tags = {
    Name = "documents"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rules for managing versions
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  # Depends on versioning being enabled
  depends_on = [aws_s3_bucket_versioning.documents]

  # Rule for current versions
  rule {
    id     = "current-version-transitions"
    status = "Enabled"

    # Move current versions to IA after 90 days
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 180 days
    transition {
      days          = 180
      storage_class = "GLACIER"
    }
  }

  # Rule for noncurrent (old) versions
  rule {
    id     = "noncurrent-version-cleanup"
    status = "Enabled"

    # Move old versions to IA after 30 days
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    # Move old versions to Glacier after 60 days
    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }

    # Delete old versions after 180 days
    noncurrent_version_expiration {
      noncurrent_days = 180
    }
  }

  # Rule for cleaning up delete markers
  rule {
    id     = "delete-marker-cleanup"
    status = "Enabled"

    # Remove expired delete markers (delete markers with no noncurrent versions)
    expiration {
      expired_object_delete_marker = true
    }
  }

  # Rule for cleaning up incomplete multipart uploads
  rule {
    id     = "abort-multipart"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

This configuration keeps the last 180 days of history available, with older versions transitioning through cheaper storage tiers before being deleted.

## Keeping a Specific Number of Versions

Instead of time-based expiration, you can keep a fixed number of noncurrent versions.

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "limited_versions" {
  bucket = aws_s3_bucket.config.id

  depends_on = [aws_s3_bucket_versioning.config]

  rule {
    id     = "keep-last-5-versions"
    status = "Enabled"

    # Keep only the 5 most recent noncurrent versions
    noncurrent_version_expiration {
      newer_noncurrent_versions = 5
      noncurrent_days           = 1  # Delete excess versions after 1 day
    }
  }
}
```

## Versioning with Encryption

Always encrypt versioned buckets. Each version is encrypted independently.

```hcl
resource "aws_s3_bucket" "secure" {
  bucket_prefix = "secure-data-"
}

resource "aws_s3_bucket_versioning" "secure" {
  bucket = aws_s3_bucket.secure.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption with KMS
resource "aws_s3_bucket_server_side_encryption_configuration" "secure" {
  bucket = aws_s3_bucket.secure.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true  # Reduces KMS costs for versioned buckets
  }
}

# KMS key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}
```

The `bucket_key_enabled = true` setting is especially important for versioned buckets. It reduces the number of KMS API calls (and costs) by using a bucket-level key derived from the KMS key.

## MFA Delete

MFA Delete requires multi-factor authentication to delete object versions or change versioning state. This adds an extra layer of protection against compromised credentials.

```hcl
# Note: MFA Delete can only be enabled by the root account
# Terraform can configure the versioning, but the MFA device
# must be specified through the root account

resource "aws_s3_bucket_versioning" "critical" {
  bucket = aws_s3_bucket.critical.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"  # Requires root account to apply
  }

  # MFA string format: "arn-of-mfa-device mfa-code"
  # This can only be provided by the root account
  # mfa = "arn:aws:iam::123456789012:mfa/root-account-mfa 123456"
}
```

In practice, many teams enable MFA Delete through a one-time CLI operation rather than through Terraform, since it requires root account credentials.

## Suspending Versioning

You can suspend versioning, but you cannot delete existing versions by doing so. Existing versions remain accessible.

```hcl
# Suspend versioning (existing versions are preserved)
resource "aws_s3_bucket_versioning" "suspended" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Suspended"
  }
}
```

When versioning is suspended, new objects get a version ID of "null". Overwriting an object replaces only the "null" version. Previous versioned objects (with real version IDs) remain intact.

## Versioned Bucket with Replication

Versioning is required for cross-region replication. Here's a complete setup.

```hcl
# Source bucket with versioning
resource "aws_s3_bucket" "source" {
  bucket_prefix = "source-"
}

resource "aws_s3_bucket_versioning" "source" {
  bucket = aws_s3_bucket.source.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Destination bucket with versioning (required for replication)
resource "aws_s3_bucket" "destination" {
  provider      = aws.us_west_2
  bucket_prefix = "destination-"
}

resource "aws_s3_bucket_versioning" "destination" {
  provider = aws.us_west_2
  bucket   = aws_s3_bucket.destination.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Cost Considerations

Versioning increases storage costs because you're keeping multiple copies of objects. Here are strategies to manage costs:

1. **Always set lifecycle rules** for noncurrent versions - transition to cheaper storage classes and eventually expire them
2. **Use `bucket_key_enabled`** with KMS encryption to reduce API costs
3. **Clean up delete markers** - orphaned delete markers consume a small amount of storage
4. **Monitor with S3 Storage Lens** - track how much storage noncurrent versions consume
5. **Use Intelligent-Tiering** for objects with unpredictable access patterns

```hcl
# S3 Storage Lens configuration to monitor versioning costs
resource "aws_s3control_storage_lens_configuration" "versioning_monitor" {
  config_id = "versioning-costs"

  storage_lens_configuration {
    enabled = true

    account_level {
      bucket_level {
        activity_metrics {
          enabled = true
        }
      }
    }

    data_export {
      s3_bucket_destination {
        bucket_arn = aws_s3_bucket.analytics.arn
        prefix     = "storage-lens"
        format     = "CSV"
        output_schema_version = "V_1"

        encryption {
          sse_s3 {}
        }
      }
    }
  }
}
```

## Summary

Versioning is a must-have for any S3 bucket storing important data. Enable it from the start - it's much easier than trying to recover data after an accidental deletion. But always pair it with lifecycle rules to manage costs, especially `noncurrent_version_expiration` to clean up old versions. For critical data, consider MFA Delete to protect against compromised credentials. And enable `bucket_key_enabled` with KMS encryption to keep API costs under control.

For more S3 configuration, see our guides on [configuring S3 bucket policies](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-policies-in-terraform/view) and [configuring S3 bucket encryption](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-encryption-in-terraform/view).
