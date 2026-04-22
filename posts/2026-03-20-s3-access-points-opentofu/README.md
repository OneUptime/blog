# How to Create S3 Access Points with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Access Point, Multi-Tenant, IAM, Infrastructure as Code

Description: Learn how to create S3 Access Points using OpenTofu to provide customized access paths with different permissions for different applications accessing the same S3 bucket.

## Introduction

S3 Access Points simplify managing data access at scale by creating separate endpoints with individual access policies for the same S3 bucket. Instead of a single complex bucket policy, each application or team gets its own access point with scoped permissions.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 permissions

## Step 1: Create a Shared S3 Bucket

```hcl
resource "aws_s3_bucket" "shared_data" {
  bucket = "${var.project_name}-shared-data"
  tags   = { Name = "shared-data-lake" }
}

resource "aws_s3_bucket_public_access_block" "shared_data" {
  bucket                  = aws_s3_bucket.shared_data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Step 2: Create Access Points for Different Applications

```hcl
# Access point for the analytics team - read-only to analytics/ prefix

resource "aws_s3_access_point" "analytics" {
  bucket = aws_s3_bucket.shared_data.id
  name   = "analytics-access-point"

  # Optional: Restrict to a specific VPC
  vpc_configuration {
    vpc_id = var.analytics_vpc_id
  }

  public_access_block_configuration {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }
}

# Access point policy - read-only to analytics prefix
resource "aws_s3control_access_point_policy" "analytics" {
  access_point_arn = aws_s3_access_point.analytics.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = var.analytics_role_arn }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_access_point.analytics.arn}/object/analytics/*"
      },
      {
        Effect    = "Allow"
        Principal = { AWS = var.analytics_role_arn }
        Action    = "s3:ListBucket"
        Resource  = aws_s3_access_point.analytics.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["analytics/*"]
          }
        }
      }
    ]
  })
}

# Access point for the data ingestion team - write access to ingestion/ prefix
resource "aws_s3_access_point" "ingestion" {
  bucket = aws_s3_bucket.shared_data.id
  name   = "ingestion-access-point"
}

resource "aws_s3control_access_point_policy" "ingestion" {
  access_point_arn = aws_s3_access_point.ingestion.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = var.ingestion_role_arn }
      Action    = ["s3:PutObject", "s3:AbortMultipartUpload"]
      Resource  = "${aws_s3_access_point.ingestion.arn}/object/ingestion/*"
    }]
  })
}
```

## Step 3: Update Bucket Policy to Delegate to Access Points

```hcl
# The bucket policy must delegate access to the access points
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_policy" "delegate_to_access_points" {
  bucket = aws_s3_bucket.shared_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DelegateToAccessPoints"
      Effect = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject", "s3:PutObject", "s3:AbortMultipartUpload", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.shared_data.arn,
        "${aws_s3_bucket.shared_data.arn}/*"
      ]
      Condition = {
        StringEquals = {
          "s3:DataAccessPointAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })
}
```

## Step 4: Use Access Point in Applications

```python
# Python example using an S3 Access Point ARN instead of bucket name
import boto3

s3 = boto3.client('s3')

# Use the access point ARN as the "bucket" parameter
access_point_arn = "arn:aws:s3:us-east-1:123456789012:accesspoint/analytics-access-point"

# List objects via access point
response = s3.list_objects_v2(
    Bucket=access_point_arn,
    Prefix="analytics/"
)

# Get object via access point
response = s3.get_object(
    Bucket=access_point_arn,
    Key="analytics/report-2026.csv"
)
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 Access Points simplify multi-tenant data access by replacing complex bucket policies with per-application access points. Each access point has its own policy, network origin control, and prefix restrictions, making it easy to audit and modify one application's permissions without affecting others. VPC-restricted access points ensure sensitive data is only accessible from within your private network.
