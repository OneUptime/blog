# How to Import AWS S3 Buckets into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, S3, Import, Storage

Description: Learn how to import existing AWS S3 buckets and their configurations (versioning, encryption, lifecycle rules) into OpenTofu state management.

## Introduction

Importing S3 buckets is more complex than it appears because bucket configuration is spread across multiple AWS resources: versioning, encryption, public access blocks, lifecycle configurations, and policies are all separate resources in the AWS provider.

## Step 1: Inventory the Bucket Configuration

```bash
BUCKET="my-existing-bucket"

# Check versioning status

aws s3api get-bucket-versioning --bucket $BUCKET

# Check encryption
aws s3api get-bucket-encryption --bucket $BUCKET

# Check public access block
aws s3api get-public-access-block --bucket $BUCKET 2>/dev/null || echo "No public access block"

# Check lifecycle rules
aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET 2>/dev/null || echo "No lifecycle rules"

# Check bucket policy
aws s3api get-bucket-policy --bucket $BUCKET 2>/dev/null || echo "No bucket policy"
```

## Step 2: Write HCL to Match Existing Configuration

```hcl
resource "aws_s3_bucket" "main" {
  bucket = "my-existing-bucket"
  tags   = { Environment = "prod", Purpose = "app-data" }
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"  # Match existing setting
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"  # Match existing algorithm
    }
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket                  = aws_s3_bucket.main.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Step 3: Import Blocks for Each Existing Sub-Resource

Only add import blocks for sub-resources that actually exist on the bucket.

```hcl
# import.tf
import {
  to = aws_s3_bucket.main
  id = "my-existing-bucket"
}

import {
  to = aws_s3_bucket_versioning.main
  id = "my-existing-bucket"
}

import {
  to = aws_s3_bucket_server_side_encryption_configuration.main
  id = "my-existing-bucket"
}

import {
  to = aws_s3_bucket_public_access_block.main
  id = "my-existing-bucket"
}
```

## Importing Lifecycle Configuration

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "move-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }
}

import {
  to = aws_s3_bucket_lifecycle_configuration.main
  id = "my-existing-bucket"
}
```

## Importing a Bucket Policy

```hcl
data "aws_iam_policy_document" "bucket_policy" {
  statement {
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [
      "arn:aws:s3:::my-existing-bucket",
      "arn:aws:s3:::my-existing-bucket/*",
    ]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id
  policy = data.aws_iam_policy_document.bucket_policy.json
}

import {
  to = aws_s3_bucket_policy.main
  id = "my-existing-bucket"
}
```

## Handling Attributes to Ignore

S3 buckets often have attributes changed by AWS internally or by external processes:

```hcl
resource "aws_s3_bucket" "main" {
  bucket = "my-existing-bucket"

  lifecycle {
    ignore_changes = [
      # Ignore if tags are managed outside OpenTofu
      tags,
    ]
  }
}
```

## Conclusion

S3 bucket import requires importing the bucket itself plus each existing configuration sub-resource separately. Check each configuration with AWS CLI first, write matching HCL, then import in dependency order (bucket first, then its configurations). The `import` block approach makes this process version-controlled and repeatable across environments.
