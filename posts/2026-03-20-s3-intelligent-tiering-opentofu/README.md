# How to Configure S3 Intelligent-Tiering with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Intelligent-Tiering, Cost Optimization, Infrastructure as Code, Storage

Description: Learn how to configure S3 Intelligent-Tiering storage class using OpenTofu to automatically optimize storage costs by moving objects between access tiers based on usage patterns.

## Introduction

S3 Intelligent-Tiering automatically moves objects between access tiers based on changing access patterns, optimizing costs without operational overhead. Its low-latency tiers have no performance impact, while optional archive tiers trade retrieval latency for lower storage costs. It's ideal for data with unknown or unpredictable access patterns-you pay a small monitoring fee for eligible monitored objects but avoid manual tier management.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 permissions

## Step 1: Create an S3 Bucket

```hcl
resource "aws_s3_bucket" "intelligent" {
  bucket = var.bucket_name
  tags   = { Name = var.bucket_name, StorageClass = "IntelligentTiering" }
}
```

## Step 2: Configure Intelligent-Tiering at the Bucket Level

```hcl
# Configure Intelligent-Tiering with archive tiers for maximum cost savings

resource "aws_s3_bucket_intelligent_tiering_configuration" "archive" {
  bucket = aws_s3_bucket.intelligent.id
  name   = "archive-inactive-objects"

  # Filter: apply to all objects (or filter by prefix/tags)
  # Uncomment for filtered configuration:
  # filter {
  #   prefix = "archive/"
  #   tags = { DataClass = "Archive" }
  # }

  tiering {
    # Move to Archive Access tier after 90 days of no access
    # Objects can be retrieved in 3-5 hours (like Glacier)
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  tiering {
    # Move to Deep Archive Access tier after 180 days of no access
    # Objects retrieved in 12 hours (like Glacier Deep Archive)
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}
```

## Step 3: Apply Lifecycle Rules to Move Objects to Intelligent-Tiering

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "intelligent" {
  bucket = aws_s3_bucket.intelligent.id

  rule {
    id     = "transition-to-intelligent-tiering"
    status = "Enabled"

    # Objects 128 KB and larger are eligible for automatic tiering
    # (Objects smaller than 128 KB are not eligible for automatic tiering)
    filter {
      object_size_greater_than = 131071  # Include objects >= 128 KB
    }

    transition {
      days          = 0  # Move to IT immediately
      storage_class = "INTELLIGENT_TIERING"
    }
  }

  rule {
    id     = "cleanup-small-objects"
    status = "Enabled"

    # Objects smaller than 128 KB don't auto-tier in IT - put them on a simple lifecycle
    filter {
      object_size_less_than = 131072
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }
}
```

## Step 4: Monitor Intelligent-Tiering Savings

```hcl
# S3 Storage Lens for Intelligent-Tiering analytics
resource "aws_s3control_storage_lens_configuration" "it_analytics" {
  account_id       = data.aws_caller_identity.current.account_id
  config_id        = "intelligent-tiering-analytics"

  storage_lens_configuration {
    enabled = true

    account_level {
      bucket_level {
        prefix_level {
          storage_metrics {
            enabled = true
            selection_criteria {
              delimiter                    = "/"
              max_depth                    = 5
              min_storage_bytes_percentage = 1.0
            }
          }
        }
      }
    }

    data_export {
      s3_bucket_destination {
        account_id        = data.aws_caller_identity.current.account_id
        arn               = aws_s3_bucket.analytics_export.arn
        format            = "CSV"
        output_schema_version = "V_1"
      }
    }
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 Intelligent-Tiering eliminates the need to manually manage storage tiers for data with variable access patterns. Enable the Archive and Deep Archive tiers for maximum savings on infrequently accessed data that can be restored asynchronously. Note that Intelligent-Tiering has a minimum eligible object size of 128 KB for automatic tiering-smaller objects are not monitored, remain in the Frequent Access tier, and do not incur the monitoring and automation charge, so apply separate lifecycle rules for small objects.
