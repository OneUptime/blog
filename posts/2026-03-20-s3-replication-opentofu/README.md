# How to Configure S3 Replication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, S3, Replication, AWS, Disaster Recovery, Infrastructure as Code

Description: Learn how to configure S3 Cross-Region Replication (CRR) and Same-Region Replication (SRR) with OpenTofu - including IAM roles, replication rules, filter-based replication, and replica...

## Introduction

S3 Replication copies new objects and eligible object metadata changes automatically between buckets - across regions (CRR) for disaster recovery, or within the same region (SRR) for log aggregation and compliance. OpenTofu manages the source bucket's replication configuration, the destination bucket, and the IAM role that S3 assumes to perform replication.

## IAM Role for Replication

```hcl
resource "aws_iam_role" "replication" {
  name = "${var.environment}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "replication" {
  name = "s3-replication-policy"
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [aws_s3_bucket.source.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = ["${aws_s3_bucket.source.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags",
          "s3:ObjectOwnerOverrideToBucketOwner"
        ]
        Resource = ["${aws_s3_bucket.destination.arn}/*"]
      },
      # Required when replicating SSE-KMS or DSSE-KMS encrypted source objects
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [aws_kms_key.source.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Encrypt"]
        Resource = [aws_kms_key.replica.arn]
      }
    ]
  })
}
```

## Source and Destination Buckets

```hcl
# Source bucket (us-east-1)

resource "aws_s3_bucket" "source" {
  bucket = "${var.project}-source-${var.environment}"
}

resource "aws_s3_bucket_versioning" "source" {
  bucket = aws_s3_bucket.source.id
  versioning_configuration { status = "Enabled" }
}

# Destination bucket (eu-west-1) - uses an aliased provider
resource "aws_s3_bucket" "destination" {
  provider = aws.eu_west_1
  bucket   = "${var.project}-replica-${var.environment}"
}

resource "aws_s3_bucket_versioning" "destination" {
  provider = aws.eu_west_1
  bucket   = aws_s3_bucket.destination.id
  versioning_configuration { status = "Enabled" }
}
```

## Cross-Region Replication Configuration

Each source bucket can have only one `aws_s3_bucket_replication_configuration`; treat the CRR, prefix-filtered, and SRR snippets below as alternative rule sets or combine their `rule` blocks into one resource.

```hcl
resource "aws_s3_bucket_replication_configuration" "crr" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.source.id

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination
  ]

  rule {
    id     = "replicate-all"
    status = "Enabled"

    filter {}  # Empty filter = replicate all objects

    # Replicate SSE-KMS/DSSE-KMS encrypted objects and replica metadata changes
    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }

      replica_modifications {
        status = "Enabled"
      }
    }

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD_IA"  # Cost-optimize replicas

      # Encrypt replicas with a destination-Region KMS key
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.replica.arn
      }

      # Enable S3 Replication Time Control (RTC)
      replication_time {
        status = "Enabled"
        time { minutes = 15 }  # RTC threshold
      }

      metrics {
        status = "Enabled"
        event_threshold { minutes = 15 }
      }
    }

    delete_marker_replication {
      status = "Enabled"  # Replicate delete markers to replica
    }
  }
}
```

## Prefix-Filtered Replication

```hcl
resource "aws_s3_bucket_replication_configuration" "prefix_crr" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.source.id

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.compliance_replica,
    aws_s3_bucket_versioning.log_replica
  ]

  # Only replicate compliance records
  rule {
    id     = "replicate-compliance"
    status = "Enabled"
    priority = 10

    filter {
      and {
        prefix = "compliance/"
        tags = {
          Replicate = "true"
        }
      }
    }

    destination {
      bucket        = aws_s3_bucket.compliance_replica.arn
      storage_class = "GLACIER"
    }

    delete_marker_replication {
      status = "Disabled"  # Don't replicate deletions for compliance data
    }
  }

  # Replicate logs separately
  rule {
    id       = "replicate-logs"
    status   = "Enabled"
    priority = 20

    filter {
      prefix = "logs/"
    }

    destination {
      bucket        = aws_s3_bucket.log_replica.arn
      storage_class = "STANDARD_IA"
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }
}
```

## Same-Region Replication (SRR) for Log Aggregation

```hcl
# SRR: Copy logs from multiple account buckets into a central log bucket
resource "aws_s3_bucket_replication_configuration" "srr" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.source.id

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.central_logs
  ]

  rule {
    id     = "srr-log-aggregation"
    status = "Enabled"

    filter {}

    destination {
      bucket        = aws_s3_bucket.central_logs.arn
      storage_class = "STANDARD"
      account       = var.log_account_id  # Cross-account SRR

      # Requires a destination bucket policy unless Object Ownership is Bucket owner enforced
      access_control_translation {
        owner = "Destination"
      }
    }
  }
}
```

## Replication Metrics Alarm

```hcl
resource "aws_cloudwatch_metric_alarm" "replication_latency" {
  alarm_name          = "${var.environment}-s3-replication-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Maximum"
  threshold           = 900  # 15 minutes
  treat_missing_data  = "ignore"
  alarm_description   = "S3 replication latency exceeded 15 minutes"

  dimensions = {
    SourceBucket      = aws_s3_bucket.source.id
    DestinationBucket = aws_s3_bucket.destination.id
    RuleId            = "replicate-all"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Conclusion

S3 Replication with OpenTofu provides automated data redundancy without manual copy jobs. Enable versioning on both source and destination - it's required for replication. Use S3 Replication Time Control (RTC) for an SLA-backed 15-minute replication objective when your RPO requires predictable replication timing. Set `delete_marker_replication { status = "Disabled" }` for compliance archives to prevent accidental deletion propagation. Monitor `ReplicationLatency` and `BytesPendingReplication` CloudWatch metrics to detect replication lag before it impacts your RPO.
