# How to Create S3 Buckets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, S3, Infrastructure as Code

Description: Learn how to create and configure Amazon S3 buckets using Terraform, including versioning, encryption, lifecycle rules, and access controls.

---

Amazon S3 is one of the most widely used AWS services. Whether you're storing application assets, backups, logs, or static website files, chances are you've got at least a few S3 buckets in your infrastructure. Managing them manually through the AWS console works fine for experiments, but it doesn't scale. That's where Terraform comes in.

In this post, we'll walk through creating S3 buckets with Terraform - from the basics all the way to production-ready configurations with versioning, encryption, lifecycle policies, and proper access controls.

## Prerequisites

You'll need Terraform installed (v1.0+) and AWS credentials configured. If you haven't set up your Terraform AWS provider yet, here's the basic configuration.

This block tells Terraform to use the AWS provider and sets your target region:

```hcl
# main.tf - Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a Basic S3 Bucket

Let's start simple. The minimum configuration for an S3 bucket is just a name. AWS S3 bucket names are globally unique, so pick something distinctive.

This creates a basic bucket with a unique name and tags for identification:

```hcl
# A simple S3 bucket with just a name and tags
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-company-app-assets-2026"

  tags = {
    Name        = "App Assets"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

That's it for a bare-bones bucket. But you'd never ship this to production. Let's add the essentials.

## Enabling Versioning

Versioning protects you from accidental deletions and overwrites. When enabled, S3 keeps every version of every object. It's a must-have for anything important.

This resource enables versioning on the bucket we just created:

```hcl
# Enable versioning to protect against accidental deletes
resource "aws_s3_bucket_versioning" "my_bucket_versioning" {
  bucket = aws_s3_bucket.my_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

One thing to keep in mind: once you enable versioning, you can't fully disable it. You can only suspend it. So plan accordingly.

## Server-Side Encryption

Every S3 bucket should have encryption enabled. AWS now encrypts buckets by default with SSE-S3, but you might want to use your own KMS key for compliance reasons.

This configuration sets up AES256 encryption and ensures all uploads are encrypted:

```hcl
# Enable server-side encryption using AES256
resource "aws_s3_bucket_server_side_encryption_configuration" "my_bucket_encryption" {
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
      # Optionally specify your own KMS key
      # kms_master_key_id = aws_kms_key.my_key.arn
    }
    bucket_key_enabled = true
  }
}
```

If you want to use a custom KMS key, check out our post on [creating KMS keys with Terraform](https://oneuptime.com/blog/post/create-kms-keys-with-terraform/view).

## Blocking Public Access

Unless you're hosting a static website, your buckets should block all public access. This is so important that AWS added account-level settings for it. Here's how to enforce it per bucket.

This locks down the bucket by blocking all forms of public access:

```hcl
# Block all public access - this is critical for security
resource "aws_s3_bucket_public_access_block" "my_bucket_public_access" {
  bucket = aws_s3_bucket.my_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Lifecycle Rules

S3 lifecycle rules let you automatically transition objects to cheaper storage classes or delete them after a certain period. This saves money on storage costs over time.

These rules move objects to Infrequent Access after 30 days, Glacier after 90 days, and delete them after a year:

```hcl
# Lifecycle rules to save on storage costs
resource "aws_s3_bucket_lifecycle_configuration" "my_bucket_lifecycle" {
  bucket = aws_s3_bucket.my_bucket.id

  # Move infrequently accessed objects to cheaper storage
  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }

  # Clean up incomplete multipart uploads after 7 days
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.my_bucket_versioning]
}
```

That `abort_incomplete_multipart_upload` rule is one people often forget. Incomplete multipart uploads silently accumulate and cost you money. Always include it.

## Bucket Policy

Sometimes you need to grant cross-account access or enforce specific conditions on how objects are accessed. Bucket policies handle that.

This policy requires all uploads to use SSL/TLS, refusing any unencrypted connections:

```hcl
# Enforce SSL-only access
resource "aws_s3_bucket_policy" "my_bucket_policy" {
  bucket = aws_s3_bucket.my_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSL"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.my_bucket.arn,
          "${aws_s3_bucket.my_bucket.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
```

## CORS Configuration

If you're serving assets from S3 to a web application, you'll need CORS rules. Without them, browsers will block cross-origin requests.

This sets up CORS to allow GET requests from your domain:

```hcl
# CORS configuration for web applications
resource "aws_s3_bucket_cors_configuration" "my_bucket_cors" {
  bucket = aws_s3_bucket.my_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://myapp.example.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
```

## Using Variables for Reusability

Hardcoding values works for examples, but real projects need variables. Here's a more reusable approach.

Define variables for the bucket name and environment so you can reuse this module:

```hcl
# variables.tf
variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "dev"
}

# main.tf - Using variables
resource "aws_s3_bucket" "this" {
  bucket = "${var.bucket_name}-${var.environment}"

  tags = {
    Name        = var.bucket_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Putting It All Together

Here's a complete, production-ready S3 bucket module that combines everything we've covered:

```hcl
# Complete production-ready S3 bucket
resource "aws_s3_bucket" "production" {
  bucket = "mycompany-prod-data-2026"

  tags = {
    Name        = "Production Data"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "production" {
  bucket = aws_s3_bucket.production.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "production" {
  bucket = aws_s3_bucket.production.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "production" {
  bucket                  = aws_s3_bucket.production.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Common Pitfalls

A few things that trip people up with S3 and Terraform:

**Bucket naming conflicts.** S3 bucket names are globally unique across all AWS accounts. If someone else has your name, you're out of luck. Use a naming convention that includes your organization and environment.

**Forgetting `depends_on`.** Some S3 resources have implicit ordering requirements. Lifecycle configurations, for example, require versioning to be enabled first. Terraform usually figures this out, but not always.

**State drift.** If someone modifies a bucket through the console, Terraform won't know until the next plan. Run `terraform plan` regularly to catch drift early. For monitoring state drift and infrastructure health, consider setting up proper [monitoring for your AWS infrastructure](https://oneuptime.com/blog/post/aws-cloudwatch-setup-guide/view).

## Wrapping Up

S3 buckets are foundational to most AWS architectures, and Terraform makes managing them repeatable and auditable. Start with the basics - a bucket, versioning, encryption, and public access blocks. Then layer on lifecycle rules and policies as your needs grow.

The key takeaway: never create a production S3 bucket without at least versioning, encryption, and public access blocks. These three settings alone prevent the most common S3 security incidents.
