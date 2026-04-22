# How to Configure S3 Same-Region Replication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Same-Region Replication, Data Compliance, Infrastructure as Code, Data Protection

Description: Learn how to configure S3 Same-Region Replication (SRR) using OpenTofu to copy objects within the same region for data compliance, log aggregation, and cross-account data sharing.

## Introduction

S3 Same-Region Replication copies objects within the same AWS region to a different bucket, which may be in the same or different AWS account. SRR is used for data compliance (requiring copies in different buckets), log aggregation, and live replication between test and production accounts.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 and IAM permissions

## Step 1: Create Source and Destination Buckets

```hcl
# Source production bucket

resource "aws_s3_bucket" "production" {
  bucket = "${var.project_name}-production"
  tags   = { Name = "production-bucket" }
}

resource "aws_s3_bucket_versioning" "production" {
  bucket = aws_s3_bucket.production.id
  versioning_configuration { status = "Enabled" }
}

# Destination audit/compliance bucket in the same region
resource "aws_s3_bucket" "compliance" {
  bucket = "${var.project_name}-compliance-replica"
  tags   = { Name = "compliance-bucket", Purpose = "Audit" }
}

resource "aws_s3_bucket_versioning" "compliance" {
  bucket = aws_s3_bucket.compliance.id
  versioning_configuration { status = "Enabled" }
}
```

## Step 2: Create Replication IAM Role

```hcl
resource "aws_iam_role" "srr" {
  name = "s3-srr-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "srr" {
  name = "srr-replication-policy"
  role = aws_iam_role.srr.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetReplicationConfiguration", "s3:ListBucket"]
        Resource = aws_s3_bucket.production.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.production.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.compliance.arn}/*"
      }
    ]
  })
}
```

## Step 3: Configure SRR with Prefix Filtering

```hcl
resource "aws_s3_bucket_replication_configuration" "srr" {
  bucket = aws_s3_bucket.production.id
  role   = aws_iam_role.srr.arn

  # Replicate only specific prefixes for compliance
  rule {
    id       = "replicate-financial-records"
    priority = 1
    status   = "Enabled"

    filter {
      prefix = "finance/"
    }

    destination {
      bucket = aws_s3_bucket.compliance.arn
      # Store replicas in STANDARD
      storage_class = "STANDARD"
    }

    delete_marker_replication {
      status = "Disabled"  # Do not replicate deletes for compliance
    }
  }

  rule {
    id       = "replicate-customer-data"
    priority = 2
    status   = "Enabled"

    filter {
      prefix = "customers/"
    }

    destination {
      bucket        = aws_s3_bucket.compliance.arn
      storage_class = "STANDARD_IA"
    }

    delete_marker_replication {
      status = "Disabled"
    }
  }

  depends_on = [
    aws_iam_role_policy.srr,
    aws_s3_bucket_versioning.production,
    aws_s3_bucket_versioning.compliance
  ]
}
```

## Step 4: Object Lock on Compliance Bucket

```hcl
# Enable Object Lock on the compliance bucket to prevent modification
resource "aws_s3_bucket_object_lock_configuration" "compliance" {
  bucket = aws_s3_bucket.compliance.id

  rule {
    default_retention {
      mode  = "COMPLIANCE"
      years = 7  # 7-year retention for financial records
    }
  }

  depends_on = [aws_s3_bucket_versioning.compliance]
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 Same-Region Replication enables data governance patterns where records must exist in segregated buckets with different access controls and retention policies. Use SRR with Object Lock on the destination to create tamper-proof compliance archives. The `delete_marker_replication.status = "Disabled"` setting prevents deletes in the source bucket from affecting the compliance replica.
