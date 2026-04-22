# How to Set Up S3 Lifecycle Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Lifecycle Rules, Cost Optimization, Storage Class, Infrastructure as Code

Description: Learn how to configure S3 lifecycle rules using OpenTofu to automatically transition objects between storage classes and expire old data to optimize storage costs.

## Introduction

S3 lifecycle rules automate the movement of objects through storage tiers as they age. Objects start in STANDARD, transition to cheaper tiers like STANDARD_IA or GLACIER as access frequency decreases, and eventually expire. This can reduce storage costs by 70-90% for data with predictable access patterns.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 and CloudWatch permissions

## Step 1: Create an S3 Bucket

```hcl
resource "aws_s3_bucket" "data" {
  bucket = var.bucket_name
  tags   = { Name = var.bucket_name }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration { status = "Enabled" }
}
```

## Step 2: Configure Lifecycle Rules

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  depends_on = [aws_s3_bucket_versioning.data]

  bucket = aws_s3_bucket.data.id

  # Rule for application logs
  rule {
    id     = "application-logs-lifecycle"
    status = "Enabled"

    filter {
      prefix = "logs/"  # Apply only to objects with this prefix
    }

    # Move to STANDARD_IA after 30 days (minimum object size: 128 KB)
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to GLACIER after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Expire current versions after 365 days
    expiration {
      days = 365
    }
  }

  # Rule for analytics data with longer retention
  rule {
    id     = "analytics-data-lifecycle"
    status = "Enabled"

    filter {
      # Filter by tags too
      and {
        prefix = "analytics/"
        tags = {
          DataClass = "Analytics"
        }
      }
    }

    transition {
      days          = 60
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"  # Lowest cost, 12-hour retrieval
    }
  }

  # Rule for object versions
  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    # Clean up delete markers with no versions beneath them
    expiration {
      expired_object_delete_marker = true
    }

    # Abort unfinished multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 3
    }
  }

  # Rule for temporary files
  rule {
    id     = "temp-files-cleanup"
    status = "Enabled"

    filter {
      prefix = "tmp/"
    }

    # Expire current temporary files after 7 days
    expiration {
      days = 7
    }
  }
}
```

## Step 3: Monitor Standard Storage Size

```hcl
# CloudWatch metric to track S3 Standard storage size

resource "aws_cloudwatch_metric_alarm" "s3_storage" {
  alarm_name          = "${var.bucket_name}-storage-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = 86400  # Daily check
  statistic           = "Average"
  threshold           = 1000000000000  # 1 TB

  dimensions = {
    BucketName  = aws_s3_bucket.data.bucket
    StorageType = "StandardStorage"
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 lifecycle rules are one of the most effective cost optimization tools for S3. A typical transition pattern-STANDARD for 30 days, STANDARD_IA for 30-90 days, GLACIER for 90-365 days, then expire current versions-can reduce storage costs by 80%+ for log data. Always configure `abort_incomplete_multipart_upload` to prevent orphaned uploads from accumulating hidden costs.
