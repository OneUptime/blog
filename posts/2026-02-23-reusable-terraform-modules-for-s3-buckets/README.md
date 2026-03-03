# How to Create Reusable Terraform Modules for S3 Buckets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, S3, Storage

Description: Build a production-ready Terraform module for S3 buckets with encryption, versioning, lifecycle rules, access logging, and bucket policies baked in.

---

S3 buckets are deceptively simple to create but surprisingly complex to configure properly. Encryption, versioning, lifecycle policies, access logging, public access blocks, CORS rules, replication - a production bucket can easily have 10+ configuration blocks. A well-designed module encapsulates all of this complexity and gives your team a safe, consistent way to create buckets.

## Why a Module for S3?

Every S3 bucket in your organization should have certain properties:

- Encryption enabled (either SSE-S3 or SSE-KMS)
- Public access blocked by default
- Versioning enabled for critical data
- Access logging configured
- Lifecycle rules to manage storage costs

Without a module, these settings get applied inconsistently. Someone forgets to block public access, another team skips encryption, and suddenly you have a compliance problem.

## Module Structure

```text
modules/s3-bucket/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
```

## Variables

```hcl
# modules/s3-bucket/variables.tf

variable "bucket_name" {
  description = "Name of the S3 bucket. Must be globally unique."
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket deletion even when non-empty. Use with caution."
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable versioning on the bucket"
  type        = bool
  default     = true
}

variable "encryption_type" {
  description = "Encryption type: 'sse-s3' or 'sse-kms'"
  type        = string
  default     = "sse-s3"

  validation {
    condition     = contains(["sse-s3", "sse-kms"], var.encryption_type)
    error_message = "encryption_type must be 'sse-s3' or 'sse-kms'"
  }
}

variable "kms_key_arn" {
  description = "KMS key ARN for SSE-KMS encryption. Required when encryption_type is 'sse-kms'."
  type        = string
  default     = null
}

variable "enable_access_logging" {
  description = "Enable S3 access logging"
  type        = bool
  default     = false
}

variable "logging_bucket" {
  description = "Target bucket for access logs. Required if enable_access_logging is true."
  type        = string
  default     = null
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for object management"
  type = list(object({
    id      = string
    enabled = optional(bool, true)
    prefix  = optional(string, "")

    transition = optional(list(object({
      days          = number
      storage_class = string
    })), [])

    expiration_days = optional(number, null)

    noncurrent_version_expiration_days = optional(number, null)
  }))
  default = []
}

variable "cors_rules" {
  description = "CORS rules for the bucket"
  type = list(object({
    allowed_headers = optional(list(string), ["*"])
    allowed_methods = list(string)
    allowed_origins = list(string)
    max_age_seconds = optional(number, 3600)
  }))
  default = []
}

variable "bucket_policy" {
  description = "JSON bucket policy document. Leave null for no additional policy."
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

## Main Resource

```hcl
# modules/s3-bucket/main.tf

resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy

  tags = merge(
    var.tags,
    {
      Name = var.bucket_name
    }
  )
}

# Block all public access by default - this is critical for security
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning configuration
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.encryption_type == "sse-kms" ? "aws:kms" : "AES256"
      kms_master_key_id = var.encryption_type == "sse-kms" ? var.kms_key_arn : null
    }
    bucket_key_enabled = var.encryption_type == "sse-kms" ? true : false
  }
}

# Access logging (conditional)
resource "aws_s3_bucket_logging" "this" {
  count = var.enable_access_logging ? 1 : 0

  bucket = aws_s3_bucket.this.id

  target_bucket = var.logging_bucket
  target_prefix = "${var.bucket_name}/"
}

# Lifecycle rules (conditional)
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count = length(var.lifecycle_rules) > 0 ? 1 : 0

  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.lifecycle_rules

    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      filter {
        prefix = rule.value.prefix
      }

      dynamic "transition" {
        for_each = rule.value.transition

        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [1] : []

        content {
          days = rule.value.expiration_days
        }
      }

      dynamic "noncurrent_version_expiration" {
        for_each = rule.value.noncurrent_version_expiration_days != null ? [1] : []

        content {
          noncurrent_days = rule.value.noncurrent_version_expiration_days
        }
      }
    }
  }
}

# CORS configuration (conditional)
resource "aws_s3_bucket_cors_configuration" "this" {
  count = length(var.cors_rules) > 0 ? 1 : 0

  bucket = aws_s3_bucket.this.id

  dynamic "cors_rule" {
    for_each = var.cors_rules

    content {
      allowed_headers = cors_rule.value.allowed_headers
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      max_age_seconds = cors_rule.value.max_age_seconds
    }
  }
}

# Bucket policy (conditional)
resource "aws_s3_bucket_policy" "this" {
  count = var.bucket_policy != null ? 1 : 0

  bucket = aws_s3_bucket.this.id
  policy = var.bucket_policy

  # Policy must be applied after the public access block
  depends_on = [aws_s3_bucket_public_access_block.this]
}
```

## Outputs

```hcl
# modules/s3-bucket/outputs.tf

output "bucket_id" {
  description = "The name of the bucket"
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "The ARN of the bucket"
  value       = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  description = "The bucket domain name"
  value       = aws_s3_bucket.this.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "The bucket region-specific domain name"
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}
```

## Usage Examples

A simple application data bucket:

```hcl
module "app_data" {
  source = "./modules/s3-bucket"

  bucket_name        = "mycompany-app-data-prod"
  versioning_enabled = true

  tags = {
    Environment = "production"
    Team        = "backend"
  }
}
```

A log archive bucket with lifecycle transitions:

```hcl
module "log_archive" {
  source = "./modules/s3-bucket"

  bucket_name        = "mycompany-logs-archive"
  versioning_enabled = false
  force_destroy      = false

  lifecycle_rules = [
    {
      id     = "archive-old-logs"
      prefix = ""

      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        },
        {
          days          = 365
          storage_class = "DEEP_ARCHIVE"
        }
      ]

      expiration_days = 2555  # ~7 years for compliance
    }
  ]

  tags = {
    Environment = "production"
    Purpose     = "log-retention"
  }
}
```

A static website hosting bucket with CORS:

```hcl
module "static_assets" {
  source = "./modules/s3-bucket"

  bucket_name        = "mycompany-static-assets"
  versioning_enabled = true

  cors_rules = [
    {
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["https://myapp.example.com"]
      max_age_seconds = 86400
    }
  ]

  tags = {
    Environment = "production"
    Service     = "cdn-origin"
  }
}
```

## Handling Common Edge Cases

One thing that trips people up is the dependency between the public access block and bucket policies. If you try to apply a bucket policy that grants public access while the public access block is in place, Terraform will fail. The `depends_on` in the bucket policy resource handles the ordering, but you still need to think about whether to relax the public access block for specific use cases.

Another common issue is `force_destroy`. Default it to `false` so nobody accidentally deletes a bucket full of production data. Only set it to `true` for ephemeral buckets like CI/CD artifacts.

For more on structuring your Terraform modules, see [how to refactor Terraform code into modules](https://oneuptime.com/blog/post/2026-02-23-refactor-terraform-code-into-modules/view).
