# How to Manage S3 Bucket Lifecycle Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Infrastructure as Code, Storage, Cost Optimization

Description: Learn how to define and manage S3 bucket lifecycle policies using OpenTofu to automate object transitions and expirations for cost savings.

## Introduction

S3 lifecycle policies let you automatically transition objects to cheaper storage classes or delete them after a set period. Managing these policies through OpenTofu keeps your cost-optimization rules versioned and consistent.

## Prerequisites

- OpenTofu installed (version 1.6 or later)
- AWS credentials configured
- An existing S3 bucket or one to be created

## Creating the S3 Bucket

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "my-app-logs-bucket"
}
```

## Defining a Lifecycle Policy

The following example transitions eligible objects through storage classes and expires them after 365 days:

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs_lifecycle" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "transition-and-expire-logs"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 365
    }
  }
}
```

## Handling Incomplete Multipart Uploads

It's also good practice to add another rule to the same lifecycle configuration to abort incomplete multipart uploads:

```hcl
rule {
  id     = "abort-incomplete-multipart"
  status = "Enabled"

  filter {}

  abort_incomplete_multipart_upload {
    days_after_initiation = 7
  }
}
```

## Expiring Old Versions

If versioning is enabled on the bucket, you can add another rule to the same lifecycle configuration to expire non-current versions:

```hcl
rule {
  id     = "expire-old-versions"
  status = "Enabled"

  filter {}

  noncurrent_version_expiration {
    noncurrent_days = 90
  }
}
```

## Applying the Configuration

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Verifying the Policy

After applying, confirm in the AWS Console under S3 > your bucket > Management > Lifecycle rules, or use the AWS CLI:

```bash
aws s3api get-bucket-lifecycle-configuration --bucket my-app-logs-bucket
```

## Conclusion

OpenTofu makes it easy to manage complex S3 lifecycle policies as code, ensuring consistent cost optimization across all your environments without manual console changes.
