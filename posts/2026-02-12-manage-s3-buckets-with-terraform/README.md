# How to Manage S3 Buckets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Terraform, Infrastructure as Code

Description: A complete guide to creating and managing Amazon S3 buckets using Terraform, covering versioning, encryption, access control, and best practices.

---

Managing S3 buckets through the AWS console works fine when you have a handful of them. But once your infrastructure grows, clicking through the console becomes tedious, error-prone, and impossible to audit. Terraform solves this by letting you define your S3 configuration as code, track changes in version control, and apply them consistently across environments.

Let's go through everything you need to manage S3 buckets with Terraform, from basic creation to advanced configurations.

## Prerequisites

Before we start, make sure you have Terraform installed and your AWS credentials configured. Your provider block should look something like this:

```hcl
# Configure the AWS provider with the desired region
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

The simplest S3 bucket in Terraform requires just a few lines:

```hcl
# Create a basic S3 bucket with a unique name
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-company-app-data-2026"

  tags = {
    Environment = "production"
    Team        = "backend"
  }
}
```

One thing to note - S3 bucket names are globally unique across all AWS accounts. If someone else already has the name you want, Terraform will fail. A good pattern is to include your account ID or a random suffix.

## Enabling Versioning

Versioning protects you from accidental deletions and overwrites. With the newer AWS provider (version 4+), versioning is configured as a separate resource:

```hcl
# Enable versioning to protect against accidental deletions
resource "aws_s3_bucket_versioning" "my_bucket_versioning" {
  bucket = aws_s3_bucket.my_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

When versioning is enabled, every overwrite or delete creates a new version instead of replacing the object. You can always recover previous versions if something goes wrong.

## Server-Side Encryption

You should encrypt every bucket. There's really no reason not to. Here's how to enable default encryption with AWS-managed keys:

```hcl
# Enable server-side encryption with AES-256 by default
resource "aws_s3_bucket_server_side_encryption_configuration" "my_bucket_encryption" {
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}
```

Using `aws:kms` with `bucket_key_enabled` reduces the cost of KMS API calls. If you want to use a custom KMS key instead of the default one:

```hcl
# Use a custom KMS key for bucket encryption
resource "aws_kms_key" "bucket_key" {
  description             = "Key for S3 bucket encryption"
  deletion_window_in_days = 7
}

resource "aws_s3_bucket_server_side_encryption_configuration" "custom_key_encryption" {
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.bucket_key.arn
    }
    bucket_key_enabled = true
  }
}
```

## Blocking Public Access

AWS now blocks public access by default on new buckets, but it's good practice to be explicit about it in your Terraform code:

```hcl
# Explicitly block all public access to the bucket
resource "aws_s3_bucket_public_access_block" "my_bucket_public_access" {
  bucket = aws_s3_bucket.my_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

This ensures that even if someone tries to add a public ACL or policy, it won't take effect.

## Bucket Policies

Bucket policies control who can access your bucket and what they can do. Here's an example that allows a specific IAM role to read objects:

```hcl
# Attach a policy allowing a specific IAM role to read objects
resource "aws_s3_bucket_policy" "allow_read" {
  bucket = aws_s3_bucket.my_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowRoleRead"
        Effect    = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/MyAppRole"
        }
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.my_bucket.arn,
          "${aws_s3_bucket.my_bucket.arn}/*"
        ]
      }
    ]
  })
}
```

Notice that you need both the bucket ARN (for ListBucket) and the bucket ARN with `/*` (for GetObject). This trips up a lot of people.

## Lifecycle Rules

Lifecycle rules let you automatically transition objects to cheaper storage classes or delete them after a certain period. This is essential for managing costs:

```hcl
# Set up lifecycle rules for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "my_bucket_lifecycle" {
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    id     = "archive-old-data"
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

  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

The second rule is one people often forget. Incomplete multipart uploads accumulate over time and cost money. Always clean them up.

## Cross-Region Replication

For disaster recovery or compliance requirements, you might need to replicate objects to another region:

```hcl
# Set up cross-region replication for disaster recovery
resource "aws_s3_bucket" "replica" {
  provider = aws.west
  bucket   = "my-company-app-data-replica-2026"
}

resource "aws_s3_bucket_versioning" "replica_versioning" {
  provider = aws.west
  bucket   = aws_s3_bucket.replica.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "replication" {
  depends_on = [aws_s3_bucket_versioning.my_bucket_versioning]

  role   = aws_iam_role.replication_role.arn
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

Both the source and destination buckets must have versioning enabled for replication to work.

## Using Modules for Reusable Configuration

If you're managing many buckets, wrapping your configuration in a module keeps things DRY:

```hcl
# modules/s3-bucket/main.tf - reusable module for standard buckets
variable "bucket_name" {
  type = string
}

variable "environment" {
  type = string
}

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "bucket_id" {
  value = aws_s3_bucket.this.id
}
```

Then use it across your configurations:

```hcl
# Create multiple standardized buckets using the module
module "app_data" {
  source      = "./modules/s3-bucket"
  bucket_name = "my-company-app-data-2026"
  environment = "production"
}

module "logs" {
  source      = "./modules/s3-bucket"
  bucket_name = "my-company-logs-2026"
  environment = "production"
}
```

## Import Existing Buckets

If you have buckets that were created manually, you can import them into Terraform state:

```bash
# Import an existing S3 bucket into Terraform state
terraform import aws_s3_bucket.my_bucket my-existing-bucket-name
```

After importing, run `terraform plan` to see what differences exist between your code and the actual bucket configuration. Adjust your Terraform code until the plan shows no changes.

## State Management Tips

When working with S3 in Terraform, keep these things in mind. Always use remote state storage (ironically, often in S3 itself). Enable state locking with DynamoDB to prevent concurrent modifications. Use separate state files for different environments.

For monitoring your Terraform-managed infrastructure, consider setting up automated checks. You can learn more about monitoring cloud resources in our [infrastructure monitoring guide](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).

## Wrapping Up

Terraform makes S3 bucket management predictable and repeatable. You get version-controlled configurations, easy environment replication, and a clear audit trail of every change. Start with the basics - a bucket, versioning, encryption, and public access blocks - then layer on lifecycle rules and replication as your needs grow. The module pattern helps you enforce organizational standards across all your buckets without duplicating code everywhere.
