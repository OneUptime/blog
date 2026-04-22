# How to Block Public Access on S3 Buckets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Public Access Block, Security, Infrastructure as Code, Data Protection

Description: Learn how to configure S3 Block Public Access settings at bucket and account levels using OpenTofu to prevent accidental exposure of sensitive data stored in S3.

## Introduction

S3 Block Public Access settings provide a centralized way to ensure S3 buckets and objects cannot be made publicly accessible. You can enable these settings at the individual bucket level or at the AWS account level to apply them to all buckets. This is a critical security baseline for production AWS accounts.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3, S3 Control, and AWS Config permissions

## Step 1: Enable Account-Level Block Public Access

```hcl
# Block all public access at the account level

# S3 applies the most restrictive combination with bucket-level settings
resource "aws_s3_account_public_access_block" "account" {
  # Blocks any ACL that grants public access
  block_public_acls = true

  # Blocks bucket policies that grant public access
  block_public_policy = true

  # Ignores any public ACLs on objects
  ignore_public_acls = true

  # Restricts access to buckets with public policies
  restrict_public_buckets = true
}
```

## Step 2: Enable Block Public Access at Bucket Level

```hcl
resource "aws_s3_bucket" "private" {
  bucket = var.bucket_name
  tags   = { Name = var.bucket_name, Public = "false" }
}

# All four settings enabled for maximum protection
resource "aws_s3_bucket_public_access_block" "private" {
  bucket = aws_s3_bucket.private.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Step 3: Configure for Static Website with CloudFront

```hcl
# Website bucket served via CloudFront Origin Access Control
# Keep Block Public Access enabled; the CloudFront OAC bucket policy is not public
resource "aws_s3_bucket" "website" {
  bucket = "${var.project_name}-website"
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  # Blocks any ACL that grants public access
  block_public_acls = true

  # Blocks bucket policies that grant public access
  block_public_policy = true

  # Ignore any pre-existing public ACLs
  ignore_public_acls = true

  # Restricts access if a public policy is attached
  restrict_public_buckets = true
}
```

## Step 4: Enforce via AWS Config Rule

```hcl
# AWS Config rule to detect bucket-level public access block drift
resource "aws_config_config_rule" "s3_public_access" {
  name        = "s3-bucket-level-public-access-prohibited"
  description = "Checks that S3 bucket-level public access block settings prohibit public access"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_LEVEL_PUBLIC_ACCESS_PROHIBITED"
  }

  tags = { Name = "s3-public-access-check" }
}

# AWS Config rule for account-level public access block
resource "aws_config_config_rule" "s3_account_public_access" {
  name        = "s3-account-level-public-access-blocks-periodic"
  description = "Checks that S3 account-level public access blocks are enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_ACCOUNT_LEVEL_PUBLIC_ACCESS_BLOCKS_PERIODIC"
  }
}
```

## Step 5: Verify Public Access Block Status

```bash
# Check account-level public access block settings
aws s3control get-public-access-block \
  --account-id 123456789012

# Check bucket-level public access block settings
aws s3api get-public-access-block \
  --bucket my-private-bucket

# List all buckets and check each one
aws s3api list-buckets --query 'Buckets[].Name' --output text | \
  tr '\t' '\n' | \
  xargs -I{} aws s3api get-public-access-block --bucket {}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Enabling S3 Block Public Access at the account level is the most effective way to prevent accidental data exposure-it provides a safety net even if individual bucket configurations are misconfigured. Apply this setting to all accounts that should never have public S3 buckets, and use AWS Config rules to detect any drift. For websites and CDN origins, use CloudFront with Origin Access Control rather than making buckets directly public.
