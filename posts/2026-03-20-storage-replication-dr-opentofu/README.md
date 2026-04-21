# How to Set Up Storage Replication for DR with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Storage, Replication, Disaster Recovery, OpenTofu, S3, Azure Blob, GCS

Description: Learn how to configure storage replication for disaster recovery across AWS S3, Azure Blob Storage, and GCP Cloud Storage using OpenTofu for data durability.

## Overview

Storage replication for DR ensures object data is durably replicated across geographic regions. OpenTofu configures S3 Cross-Region Replication, Azure Blob geo-redundancy, and GCS dual-region buckets with appropriate retention and lifecycle policies.

## Step 1: AWS S3 Cross-Region Replication

```hcl
# main.tf - S3 CRR for DR

resource "aws_s3_bucket" "source" {
  provider = aws.primary
  bucket   = "app-data-primary"
}

resource "aws_s3_bucket" "replica" {
  provider = aws.dr
  bucket   = "app-data-dr-replica"
}

# Versioning required for CRR
resource "aws_s3_bucket_versioning" "source" {
  provider = aws.primary
  bucket   = aws_s3_bucket.source.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "replica" {
  provider = aws.dr
  bucket   = aws_s3_bucket.replica.id
  versioning_configuration { status = "Enabled" }
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

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
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetReplicationConfiguration", "s3:ListBucket"]
        Resource = [aws_s3_bucket.source.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObjectVersionForReplication", "s3:GetObjectVersionAcl",
                    "s3:GetObjectVersionTagging"]
        Resource = ["${aws_s3_bucket.source.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ReplicateObject", "s3:ReplicateDelete", "s3:ReplicateTags"]
        Resource = ["${aws_s3_bucket.replica.arn}/*"]
      }
    ]
  })
}

# Replication configuration
resource "aws_s3_bucket_replication_configuration" "main" {
  provider   = aws.primary
  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.replica
  ]
  bucket     = aws_s3_bucket.source.id
  role       = aws_iam_role.replication.arn

  rule {
    id       = "replicate-all"
    priority = 1
    status   = "Enabled"

    filter {}

    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"

      # S3 Replication Time Control with the required 15-minute metrics threshold
      metrics {
        status = "Enabled"
        event_threshold { minutes = 15 }
      }

      replication_time {
        status = "Enabled"
        time { minutes = 15 }
      }
    }

    delete_marker_replication { status = "Enabled" }
  }
}
```

## Step 2: Azure Blob with GZRS

```hcl
# Azure Storage Account with Geo-Zone-Redundant Storage
resource "azurerm_storage_account" "gzrs" {
  name                     = "appgzrsstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = "East US"
  account_tier             = "Standard"
  account_replication_type = "GZRS"  # Zone + Geo redundant

  # RA-GZRS for read access in secondary region
  # account_replication_type = "RAGZRS"

  blob_properties {
    versioning_enabled         = true
    change_feed_enabled        = true
    last_access_time_enabled   = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }
}
```

## Step 3: GCP Dual-Region Bucket with Turbo Replication

```hcl
# Dual-region GCS bucket with Turbo Replication
resource "google_storage_bucket" "dual_region" {
  name     = "app-data-us-dual-region"
  location = "NAM4" # Dual-region: US-CENTRAL1 + US-EAST1

  # Turbo replication: 15-minute RPO for newly written objects
  rpo = "ASYNC_TURBO"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age                   = 365
      num_newer_versions    = 5
      with_state            = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }
}
```

## Summary

Storage replication for DR configured with OpenTofu provides multiple tiers of protection. AWS S3 CRR with Replication Time Control is designed to replicate 99.99% of new objects within 15 minutes, with an SLA commitment measured at 99.9%. Azure GZRS combines zone redundancy within a region with geo-replication to a secondary region, providing protection from both zone and regional failures. GCP's Turbo Replication (dual-region buckets) offers a 15-minute RPO with SLA terms for monthly replication conformance at a higher storage cost than standard dual-region.
