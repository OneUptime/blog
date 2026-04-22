# How to Configure S3 Bucket Replication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Infrastructure as Code, Storage, Replication

Description: Learn how to configure cross-region and same-region S3 bucket replication using OpenTofu to improve data durability and availability.

## Introduction

S3 bucket replication allows you to automatically copy objects from one S3 bucket to another, either within the same AWS region or across different regions. Using OpenTofu to manage this configuration ensures your replication rules are version-controlled and reproducible.

## Prerequisites

- OpenTofu installed (version 1.6 or later)
- AWS credentials configured
- AWS provider configured for the source region and, for cross-region replication, an aliased destination region
- Two S3 buckets (source and destination)

## Setting Up the Source Bucket

For cross-region replication, configure the default AWS provider for the source region and an aliased provider for the destination region:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_west_2"
  region = "us-west-2"
}
```

First, define the source bucket with versioning enabled, which is required for replication:

```hcl
resource "aws_s3_bucket" "source" {
  bucket = "my-source-bucket-replication"
}

resource "aws_s3_bucket_versioning" "source" {
  bucket = aws_s3_bucket.source.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Setting Up the Destination Bucket

```hcl
resource "aws_s3_bucket" "destination" {
  bucket   = "my-destination-bucket-replication"
  provider = aws.us_west_2
}

resource "aws_s3_bucket_versioning" "destination" {
  bucket = aws_s3_bucket.destination.id
  versioning_configuration {
    status = "Enabled"
  }
  provider = aws.us_west_2
}
```

## IAM Role for Replication

S3 needs an IAM role to replicate objects on your behalf:

```hcl
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "s3.amazonaws.com"
      }
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
        Action   = ["s3:GetReplicationConfiguration", "s3:ListBucket"]
        Effect   = "Allow"
        Resource = [aws_s3_bucket.source.arn]
      },
      {
        Action   = ["s3:GetObjectVersionForReplication", "s3:GetObjectVersionAcl", "s3:GetObjectVersionTagging"]
        Effect   = "Allow"
        Resource = ["${aws_s3_bucket.source.arn}/*"]
      },
      {
        Action   = ["s3:ReplicateObject", "s3:ReplicateDelete", "s3:ReplicateTags"]
        Effect   = "Allow"
        Resource = ["${aws_s3_bucket.destination.arn}/*"]
      }
    ]
  })
}
```

## Configuring Replication

```hcl
resource "aws_s3_bucket_replication_configuration" "replication" {
  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination
  ]

  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.source.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    filter {}

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD"
    }
  }
}
```

## Deploying with OpenTofu

```bash
tofu init
tofu plan
tofu apply
```

## Verifying Replication

After applying, upload a test object to the source bucket and verify it appears in the destination bucket within a few minutes.

## Conclusion

Using OpenTofu to manage S3 bucket replication ensures consistent, repeatable configurations across environments. This approach is especially useful for disaster recovery and data locality requirements.
