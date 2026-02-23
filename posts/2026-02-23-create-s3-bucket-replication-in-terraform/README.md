# How to Create S3 Bucket Replication in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Replication, Disaster Recovery

Description: A step-by-step guide to configuring S3 bucket replication in Terraform, covering cross-region replication, same-region replication, replication rules, and disaster recovery patterns.

---

S3 replication automatically copies objects from one bucket to another. Cross-Region Replication (CRR) copies to a bucket in a different AWS region for disaster recovery and low-latency access. Same-Region Replication (SRR) copies within the same region for compliance, log aggregation, or maintaining separate copies for different teams.

Setting up replication in Terraform involves several pieces: versioned source and destination buckets, an IAM role for the replication process, and replication rules that define what gets copied and how. Let's put it all together.

## Prerequisites

Both the source and destination buckets must have versioning enabled. Replication won't work without it.

## Basic Cross-Region Replication

```hcl
# Provider for the source region
provider "aws" {
  region = "us-east-1"
  alias  = "source"
}

# Provider for the destination region
provider "aws" {
  region = "eu-west-1"
  alias  = "destination"
}

# Source bucket
resource "aws_s3_bucket" "source" {
  provider      = aws.source
  bucket_prefix = "source-"

  tags = {
    Name = "replication-source"
  }
}

# Versioning on source (required for replication)
resource "aws_s3_bucket_versioning" "source" {
  provider = aws.source
  bucket   = aws_s3_bucket.source.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Destination bucket
resource "aws_s3_bucket" "destination" {
  provider      = aws.destination
  bucket_prefix = "destination-"

  tags = {
    Name = "replication-destination"
  }
}

# Versioning on destination (required for replication)
resource "aws_s3_bucket_versioning" "destination" {
  provider = aws.destination
  bucket   = aws_s3_bucket.destination.id

  versioning_configuration {
    status = "Enabled"
  }
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  provider = aws.source
  name     = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "s3.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# IAM policy granting replication permissions
resource "aws_iam_role_policy" "replication" {
  provider = aws.source
  name     = "s3-replication-policy"
  role     = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.source.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.source.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.destination.arn}/*"
      }
    ]
  })
}

# Replication configuration
resource "aws_s3_bucket_replication_configuration" "replication" {
  provider = aws.source
  bucket   = aws_s3_bucket.source.id
  role     = aws_iam_role.replication.arn

  # Depends on versioning being enabled on both buckets
  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination,
  ]

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD"
    }
  }
}
```

## Prefix-Based Replication

Replicate only objects matching specific prefixes.

```hcl
resource "aws_s3_bucket_replication_configuration" "selective" {
  provider = aws.source
  bucket   = aws_s3_bucket.source.id
  role     = aws_iam_role.replication.arn

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination,
  ]

  # Only replicate objects under the "critical/" prefix
  rule {
    id     = "replicate-critical"
    status = "Enabled"

    filter {
      prefix = "critical/"
    }

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD"
    }
  }

  # Replicate backups to Glacier in the destination
  rule {
    id     = "replicate-backups"
    status = "Enabled"

    filter {
      prefix = "backups/"
    }

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "GLACIER"  # Store replicas in cheaper storage
    }
  }
}
```

## Tag-Based Replication

Filter objects by tags instead of (or in addition to) prefixes.

```hcl
resource "aws_s3_bucket_replication_configuration" "tag_based" {
  provider = aws.source
  bucket   = aws_s3_bucket.source.id
  role     = aws_iam_role.replication.arn

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination,
  ]

  # Replicate objects tagged with replicate=true
  rule {
    id     = "replicate-tagged"
    status = "Enabled"

    filter {
      tag {
        key   = "replicate"
        value = "true"
      }
    }

    destination {
      bucket = aws_s3_bucket.destination.arn
    }
  }

  # Replicate objects matching both prefix and tag
  rule {
    id     = "replicate-critical-tagged"
    status = "Enabled"

    filter {
      and {
        prefix = "data/"
        tags = {
          classification = "sensitive"
          replicate      = "true"
        }
      }
    }

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

## Replication with Encryption

When both source and destination buckets use KMS encryption, you need additional configuration.

```hcl
# KMS key in the destination region
resource "aws_kms_key" "destination" {
  provider            = aws.destination
  description         = "KMS key for S3 replication destination"
  enable_key_rotation = true
}

# Add KMS permissions to the replication role
resource "aws_iam_role_policy" "replication_kms" {
  provider = aws.source
  name     = "s3-replication-kms-policy"
  role     = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.source.arn
        Condition = {
          StringLike = {
            "kms:ViaService" = "s3.us-east-1.amazonaws.com"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt"
        ]
        Resource = aws_kms_key.destination.arn
        Condition = {
          StringLike = {
            "kms:ViaService" = "s3.eu-west-1.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Replication configuration with encryption
resource "aws_s3_bucket_replication_configuration" "encrypted" {
  provider = aws.source
  bucket   = aws_s3_bucket.source.id
  role     = aws_iam_role.replication.arn

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination,
  ]

  rule {
    id     = "replicate-encrypted"
    status = "Enabled"

    # Enable replication of KMS-encrypted objects
    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD"

      # Re-encrypt with the destination region's KMS key
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.destination.arn
      }
    }
  }
}
```

## Same-Region Replication

Same-Region Replication uses the same configuration as CRR, just with both buckets in the same region.

```hcl
# Both buckets in the same region
resource "aws_s3_bucket" "primary" {
  bucket_prefix = "primary-"
}

resource "aws_s3_bucket" "replica" {
  bucket_prefix = "replica-"
}

resource "aws_s3_bucket_versioning" "primary" {
  bucket = aws_s3_bucket.primary.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "replica" {
  bucket = aws_s3_bucket.replica.id
  versioning_configuration { status = "Enabled" }
}

# Same-region replication configuration
resource "aws_s3_bucket_replication_configuration" "same_region" {
  bucket = aws_s3_bucket.primary.id
  role   = aws_iam_role.replication.arn

  depends_on = [
    aws_s3_bucket_versioning.primary,
    aws_s3_bucket_versioning.replica,
  ]

  rule {
    id     = "same-region-replicate"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.replica.arn
    }
  }
}
```

Common use cases for SRR:
- Aggregating logs from multiple buckets into one
- Maintaining a read-only copy for analytics teams
- Compliance requirements for data redundancy

## Delete Marker Replication

By default, delete markers are not replicated. Enable this if you want deletions in the source to be reflected in the destination.

```hcl
resource "aws_s3_bucket_replication_configuration" "with_deletes" {
  bucket = aws_s3_bucket.source.id
  role   = aws_iam_role.replication.arn

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination,
  ]

  rule {
    id     = "replicate-with-deletes"
    status = "Enabled"

    # Replicate delete markers
    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket = aws_s3_bucket.destination.arn
    }
  }
}
```

Note: even with delete marker replication enabled, permanent deletes of specific object versions are never replicated. This prevents accidental mass deletion from propagating.

## Replication Time Control

For critical data, S3 Replication Time Control (RTC) guarantees that 99.99% of objects replicate within 15 minutes.

```hcl
resource "aws_s3_bucket_replication_configuration" "rtc" {
  bucket = aws_s3_bucket.source.id
  role   = aws_iam_role.replication.arn

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination,
  ]

  rule {
    id     = "rtc-replication"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.destination.arn

      # Enable Replication Time Control
      replication_time {
        status = "Enabled"

        time {
          minutes = 15
        }
      }

      # Metrics for monitoring replication
      metrics {
        status = "Enabled"

        event_threshold {
          minutes = 15
        }
      }
    }
  }
}
```

RTC adds cost but provides SLA-backed replication times.

## Monitoring Replication

Track replication status with CloudWatch.

```hcl
# Alarm when replication is failing
resource "aws_cloudwatch_metric_alarm" "replication_failure" {
  alarm_name          = "s3-replication-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "OperationFailedReplication"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    SourceBucket      = aws_s3_bucket.source.id
    DestinationBucket = aws_s3_bucket.destination.id
    RuleId            = "replicate-all"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Summary

S3 replication is a cornerstone of disaster recovery and data distribution strategies. Cross-region replication protects against regional outages, while same-region replication serves compliance and data management needs. Always start with versioning on both buckets, set up the IAM role carefully, and choose whether to replicate delete markers based on your use case. For critical data, Replication Time Control provides guaranteed SLAs.

For more S3 topics, see our guides on [creating S3 buckets with versioning](https://oneuptime.com/blog/post/2026-02-23-create-s3-bucket-with-versioning-in-terraform/view) and [configuring S3 bucket encryption](https://oneuptime.com/blog/post/2026-02-23-configure-s3-bucket-encryption-in-terraform/view).
