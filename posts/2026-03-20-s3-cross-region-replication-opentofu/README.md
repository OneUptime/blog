# How to Set Up S3 Cross-Region Replication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Cross-Region Replication, Disaster Recovery, Infrastructure as Code

Description: Learn how to configure S3 Cross-Region Replication (CRR) using OpenTofu to automatically replicate objects to a bucket in a different AWS region for disaster recovery and compliance.

## Introduction

S3 Cross-Region Replication automatically copies objects from a source bucket to a destination bucket in a different region. Replication is asynchronous and requires versioning on both buckets. CRR supports replicas that are encrypted, filtered, and even replicated with different storage classes.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3, IAM, and KMS permissions in both regions

## Step 1: Create Source and Destination Buckets

```hcl
provider "aws" {
  region = var.primary_region
}

provider "aws" {
  alias  = "dr_region"
  region = var.dr_region
}

# Source bucket in primary region
resource "aws_s3_bucket" "source" {
  provider = aws
  bucket   = "${var.project_name}-primary"
  tags     = { Name = "source-bucket", Region = "primary" }
}

resource "aws_s3_bucket_versioning" "source" {
  provider = aws
  bucket   = aws_s3_bucket.source.id
  versioning_configuration { status = "Enabled" }
}

# Destination bucket in DR region - requires separate provider
resource "aws_s3_bucket" "destination" {
  provider = aws.dr_region
  bucket   = "${var.project_name}-dr"
  tags     = { Name = "destination-bucket", Region = "dr" }
}

resource "aws_s3_bucket_versioning" "destination" {
  provider = aws.dr_region
  bucket   = aws_s3_bucket.destination.id
  versioning_configuration { status = "Enabled" }
}
```

## Step 2: Create IAM Role for Replication

```hcl
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
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
      },
      {
        # Required when source objects are encrypted with SSE-KMS
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.source_kms_key_arn
      },
      {
        # Required to encrypt replicas with the destination KMS key
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.dr_kms_key_arn
      }
    ]
  })
}
```

## Step 3: Configure Replication

```hcl
resource "aws_s3_bucket_replication_configuration" "main" {
  provider = aws
  bucket   = aws_s3_bucket.source.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    # Filter: empty filter means replicate all objects
    filter {}

    # Opt in to replicating source objects encrypted with SSE-KMS
    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD_IA"  # Use cheaper class in DR region

      # Encrypt replicas with the KMS key in the destination region
      encryption_configuration {
        replica_kms_key_id = var.dr_kms_key_arn
      }

      # Enable Replication Time Control
      replication_time {
        status = "Enabled"
        time { minutes = 15 }  # 15-minute SLA (requires Replication Time Control)
      }

      metrics {
        status = "Enabled"
        event_threshold { minutes = 15 }
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }

  depends_on = [
    aws_iam_role_policy.replication,
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination,
  ]
}
```

## Step 4: Enable Encryption on Destination

```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "destination" {
  provider = aws.dr_region
  bucket   = aws_s3_bucket.destination.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.dr_kms_key_arn
    }
    bucket_key_enabled = true
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check replication status
aws s3api head-object \
  --bucket my-project-primary \
  --key myfile.txt \
  --query 'ReplicationStatus'
```

## Conclusion

S3 Cross-Region Replication provides automatic data redundancy across AWS regions for disaster recovery. Enable Replication Time Control (RTC) if you need a predictable 15-minute replication target backed by an AWS SLA for eligible new objects. Note that live replication only applies automatically to new and updated objects; existing objects require S3 Batch Replication, or a one-time `aws s3 sync` if you only need to copy the current object versions.
