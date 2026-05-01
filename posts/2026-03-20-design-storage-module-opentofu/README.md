# How to Design a Storage Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, S3, Storage, AWS, Module, Encryption

Description: Learn how to design a reusable S3 storage module for OpenTofu with encryption, versioning, lifecycle policies, and access control configurations.

## Introduction

An S3 storage module should create buckets with security best practices by default, such as encryption and blocked public access. It should let callers opt into versioning and lifecycle rules without needing to understand the underlying AWS resources.

## variables.tf

```hcl
variable "bucket_name" { type = string }
variable "environment" { type = string }

variable "purpose" {
  type    = string
  default = "general"
}

variable "versioning_enabled" {
  type    = bool
  default = false
}

variable "force_destroy" {
  type    = bool
  default = false
}

variable "server_side_encryption" {
  type    = string
  default = "AES256"  # "AES256" or "aws:kms"

  validation {
    condition     = contains(["AES256", "aws:kms"], var.server_side_encryption)
    error_message = "server_side_encryption must be AES256 or aws:kms."
  }
}

variable "kms_key_id" {
  type    = string
  default = null
}

variable "lifecycle_rules" {
  type = list(object({
    id                       = string
    enabled                  = bool
    prefix                   = optional(string, "")
    transition_days          = optional(number)
    transition_storage_class = optional(string)
    expiration_days          = optional(number)
  }))
  default = []

  validation {
    condition = alltrue([
      for rule in var.lifecycle_rules :
      (rule.transition_days == null && rule.transition_storage_class == null) ||
      (rule.transition_days != null && rule.transition_storage_class != null)
    ])
    error_message = "Each lifecycle rule must set both transition_days and transition_storage_class together."
  }
}

variable "bucket_policy_json" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
locals {
  tags = merge({
    Environment = var.environment
    Purpose     = var.purpose
    ManagedBy   = "OpenTofu"
  }, var.tags)
}

resource "aws_s3_bucket" "main" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy
  tags          = merge(local.tags, { Name = var.bucket_name })
}

# Block all public access by default

resource "aws_s3_bucket_public_access_block" "main" {
  bucket                  = aws_s3_bucket.main.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.server_side_encryption
      kms_master_key_id = var.server_side_encryption == "aws:kms" ? var.kms_key_id : null
    }
    bucket_key_enabled = var.server_side_encryption == "aws:kms"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count  = length(var.lifecycle_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      filter {
        prefix = rule.value.prefix
      }

      dynamic "transition" {
        for_each = rule.value.transition_days != null ? [1] : []
        content {
          days          = rule.value.transition_days
          storage_class = rule.value.transition_storage_class
        }
      }

      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [1] : []
        content {
          days = rule.value.expiration_days
        }
      }
    }
  }
}

resource "aws_s3_bucket_policy" "main" {
  count  = var.bucket_policy_json != "" ? 1 : 0
  bucket = aws_s3_bucket.main.id
  policy = var.bucket_policy_json
  depends_on = [aws_s3_bucket_public_access_block.main]
}
```

## outputs.tf

```hcl
output "bucket_id"            { value = aws_s3_bucket.main.id }
output "bucket_arn"           { value = aws_s3_bucket.main.arn }
output "bucket_domain_name"   { value = aws_s3_bucket.main.bucket_domain_name }
output "bucket_regional_domain_name" { value = aws_s3_bucket.main.bucket_regional_domain_name }
```

## Conclusion

This S3 module enforces security best practices by default - public access is always blocked and encryption is always enabled, while versioning remains configurable. Lifecycle rules with dynamic blocks handle any number of lifecycle rules with optional transition and expiration policies. The bucket policy is optional and passed as a pre-rendered JSON string for flexibility.
