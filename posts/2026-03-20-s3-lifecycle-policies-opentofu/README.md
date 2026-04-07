# How to Configure S3 Lifecycle Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, S3, Lifecycle Policies, AWS, Storage, Cost Optimization, Infrastructure as Code

Description: Learn how to configure S3 Lifecycle Policies with OpenTofu - transitioning objects to cheaper storage classes, expiring old versions, managing incomplete multipart uploads, and optimizing storage...

## Introduction

S3 Lifecycle Policies automatically move objects between storage classes and delete them when no longer needed. OpenTofu manages lifecycle rules as code - defining transitions to Intelligent-Tiering, Glacier, and Deep Archive, expiration of current and noncurrent versions, and cleanup of incomplete multipart uploads.

## Basic Lifecycle Rule

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  rule {
    id     = "app-data-lifecycle"
    status = "Enabled"

    # Apply to all objects
    filter {}

    # Move to Infrequent Access after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Move to Deep Archive after 180 days
    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    # Delete after 365 days
    expiration {
      days = 365
    }
  }
}
```

## Prefix-Based Rules

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  # Access logs - short retention
  rule {
    id     = "access-logs"
    status = "Enabled"

    filter {
      prefix = "access-logs/"
    }

    transition {
      days          = 7
      storage_class = "INTELLIGENT_TIERING"
    }

    expiration {
      days = 90
    }
  }

  # Audit logs - long retention, cold storage
  rule {
    id     = "audit-logs"
    status = "Enabled"

    filter {
      prefix = "audit-logs/"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2557  # 7 years for compliance
    }
  }

  # Temp files - expire quickly
  rule {
    id     = "temp-cleanup"
    status = "Enabled"

    filter {
      prefix = "tmp/"
    }

    expiration {
      days = 1
    }
  }
}
```

## Noncurrent Version Management (Versioned Bucket)

```hcl
resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "versioned_app" {
  bucket     = aws_s3_bucket.app.id
  depends_on = [aws_s3_bucket_versioning.app]

  rule {
    id     = "noncurrent-version-lifecycle"
    status = "Enabled"

    filter {}

    # Transition old versions to cheaper storage
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    # Keep only 5 noncurrent versions
    noncurrent_version_expiration {
      noncurrent_days           = 90
      newer_noncurrent_versions = 5
    }

    # Clean up delete markers when all versions are gone
    expiration {
      expired_object_delete_marker = true
    }
  }
}
```

## Incomplete Multipart Upload Cleanup

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "multipart_cleanup" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    # Abort incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

## Tag-Based Lifecycle Rules

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "tagged" {
  bucket = aws_s3_bucket.data.id

  # Archive objects tagged for archiving
  rule {
    id     = "archive-tagged"
    status = "Enabled"

    filter {
      tag {
        key   = "ArchivePolicy"
        value = "standard"
      }
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 730
    }
  }

  # Long-term retention for compliance-tagged objects
  rule {
    id     = "compliance-retention"
    status = "Enabled"

    filter {
      and {
        prefix = "records/"
        tags = {
          "Compliance" = "required"
          "DataClass"  = "regulated"
        }
      }
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 3650  # 10 years
    }
  }
}
```

## Intelligent-Tiering Configuration

```hcl
resource "aws_s3_bucket_intelligent_tiering_configuration" "app" {
  bucket = aws_s3_bucket.app.id
  name   = "app-intelligent-tiering"

  # Opt into Archive tiers within Intelligent-Tiering
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "intelligent" {
  bucket = aws_s3_bucket.app.id

  rule {
    id     = "move-to-intelligent-tiering"
    status = "Enabled"

    filter {}

    # Move to Intelligent-Tiering after 30 days of age
    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}
```

## Conclusion

S3 Lifecycle Policies with OpenTofu automate cost optimization by moving cold data to cheaper storage classes without manual intervention. Define prefix-based rules to differentiate retention policies for logs, user uploads, and compliance records. For versioned buckets, always configure `noncurrent_version_expiration` to prevent unlimited version accumulation. Add an `abort_incomplete_multipart_upload` rule to all buckets to reclaim storage from stalled uploads. Use tags for dynamic classification - applications tag objects at write time, and lifecycle rules act based on those tags.
