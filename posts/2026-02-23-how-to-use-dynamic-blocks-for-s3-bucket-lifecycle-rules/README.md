# How to Use Dynamic Blocks for S3 Bucket Lifecycle Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, S3, Lifecycle Rules, Infrastructure as Code

Description: Learn how to manage S3 bucket lifecycle rules dynamically in Terraform using dynamic blocks for flexible storage management across environments.

---

S3 lifecycle rules control how objects in a bucket transition between storage classes and when they expire. Most production buckets have multiple lifecycle rules with different criteria, and these rules vary by environment. Dynamic blocks are the right tool for managing this complexity in Terraform.

## The Problem with Static Lifecycle Rules

A typical S3 bucket might have rules for transitioning logs to cheaper storage, expiring temporary files, and cleaning up incomplete multipart uploads. Writing each rule statically looks like this:

```hcl
# This gets unwieldy fast
resource "aws_s3_bucket_lifecycle_configuration" "example" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "transition-logs"
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
  }

  rule {
    id     = "expire-temp"
    status = "Enabled"
    filter {
      prefix = "tmp/"
    }
    expiration {
      days = 7
    }
  }
}
```

If every environment has different retention periods and rules, you end up maintaining multiple copies of this block.

## Dynamic Lifecycle Rules

Define your lifecycle rules as a variable and use dynamic blocks to generate them:

```hcl
variable "lifecycle_rules" {
  description = "S3 lifecycle rules"
  type = list(object({
    id     = string
    status = optional(string, "Enabled")
    prefix = optional(string)
    tags   = optional(map(string))

    transitions = optional(list(object({
      days          = number
      storage_class = string
    })), [])

    expiration_days                    = optional(number)
    noncurrent_version_expiration_days = optional(number)

    noncurrent_version_transitions = optional(list(object({
      noncurrent_days = number
      storage_class   = string
    })), [])

    abort_incomplete_multipart_upload_days = optional(number)
  }))
  default = []
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.status

      # Filter block - handles both prefix-based and tag-based filtering
      filter {
        # Use prefix if specified
        prefix = rule.value.prefix

        # Dynamic tag filter
        dynamic "tag" {
          for_each = rule.value.tags != null ? rule.value.tags : {}
          content {
            key   = tag.key
            value = tag.value
          }
        }
      }

      # Dynamic transition blocks - can have multiple per rule
      dynamic "transition" {
        for_each = rule.value.transitions
        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      # Optional expiration block
      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [rule.value.expiration_days] : []
        content {
          days = expiration.value
        }
      }

      # Optional noncurrent version expiration
      dynamic "noncurrent_version_expiration" {
        for_each = rule.value.noncurrent_version_expiration_days != null ? [rule.value.noncurrent_version_expiration_days] : []
        content {
          noncurrent_days = noncurrent_version_expiration.value
        }
      }

      # Dynamic noncurrent version transitions
      dynamic "noncurrent_version_transition" {
        for_each = rule.value.noncurrent_version_transitions
        content {
          noncurrent_days = noncurrent_version_transition.value.noncurrent_days
          storage_class   = noncurrent_version_transition.value.storage_class
        }
      }

      # Optional abort incomplete multipart upload
      dynamic "abort_incomplete_multipart_upload" {
        for_each = rule.value.abort_incomplete_multipart_upload_days != null ? [rule.value.abort_incomplete_multipart_upload_days] : []
        content {
          days_after_initiation = abort_incomplete_multipart_upload.value
        }
      }
    }
  }
}
```

## Environment-Specific Configurations

Now you can have different lifecycle configurations per environment:

```hcl
# Production - longer retention, glacier archival
lifecycle_rules = [
  {
    id     = "archive-logs"
    prefix = "logs/"
    transitions = [
      { days = 30, storage_class = "STANDARD_IA" },
      { days = 90, storage_class = "GLACIER" },
      { days = 365, storage_class = "DEEP_ARCHIVE" }
    ]
    expiration_days = 2555  # 7 years for compliance
  },
  {
    id     = "archive-backups"
    prefix = "backups/"
    transitions = [
      { days = 7, storage_class = "STANDARD_IA" },
      { days = 30, storage_class = "GLACIER" }
    ]
    noncurrent_version_expiration_days = 90
    noncurrent_version_transitions = [
      { noncurrent_days = 30, storage_class = "GLACIER" }
    ]
  },
  {
    id     = "cleanup-temp"
    prefix = "tmp/"
    expiration_days = 1
    abort_incomplete_multipart_upload_days = 1
  },
  {
    id     = "cleanup-multipart"
    prefix = ""
    abort_incomplete_multipart_upload_days = 7
  }
]
```

```hcl
# Development - shorter retention, no glacier
lifecycle_rules = [
  {
    id     = "expire-logs"
    prefix = "logs/"
    expiration_days = 14
  },
  {
    id     = "cleanup-temp"
    prefix = "tmp/"
    expiration_days = 1
    abort_incomplete_multipart_upload_days = 1
  }
]
```

The same Terraform code handles both environments. The only difference is the variable values.

## Using Locals for Standard Rule Sets

If you have common rule patterns that multiple buckets share, define them as locals:

```hcl
locals {
  # Standard rules every bucket should have
  standard_lifecycle_rules = [
    {
      id     = "abort-incomplete-uploads"
      prefix = ""
      abort_incomplete_multipart_upload_days = 7
    }
  ]

  # Log bucket standard rules
  log_lifecycle_rules = [
    {
      id     = "transition-to-ia"
      prefix = ""
      transitions = [
        { days = 30, storage_class = "STANDARD_IA" }
      ]
    },
    {
      id              = "transition-to-glacier"
      prefix          = ""
      transitions = [
        { days = 90, storage_class = "GLACIER" }
      ]
      expiration_days = 365
    }
  ]

  # Combine standard rules with bucket-specific rules
  app_bucket_rules = concat(
    local.standard_lifecycle_rules,
    var.app_lifecycle_rules
  )

  log_bucket_rules = concat(
    local.standard_lifecycle_rules,
    local.log_lifecycle_rules,
    var.additional_log_rules
  )
}
```

This ensures every bucket gets the standard rules plus any custom ones.

## Tag-Based Lifecycle Rules

S3 supports filtering by object tags, which is useful for managing different types of objects in the same prefix:

```hcl
variable "tag_based_rules" {
  type = list(object({
    id     = string
    tags   = map(string)
    transitions = list(object({
      days          = number
      storage_class = string
    }))
    expiration_days = optional(number)
  }))
  default = [
    {
      id   = "archive-processed"
      tags = { "Status" = "processed" }
      transitions = [
        { days = 7, storage_class = "GLACIER" }
      ]
      expiration_days = 365
    },
    {
      id   = "expire-temporary"
      tags = { "Lifecycle" = "temporary" }
      transitions = []
      expiration_days = 30
    }
  ]
}
```

## Handling the Filter Block Correctly

The S3 lifecycle filter block has specific requirements that trip people up. When you have both a prefix and tags, you need to use an `and` block:

```hcl
dynamic "rule" {
  for_each = var.lifecycle_rules
  content {
    id     = rule.value.id
    status = rule.value.status

    filter {
      # Simple prefix filter - when there are no tags
      dynamic "and" {
        for_each = rule.value.tags != null && length(rule.value.tags) > 0 ? [1] : []
        content {
          prefix = rule.value.prefix
          tags   = rule.value.tags
        }
      }

      # When only prefix is used (no tags), set prefix directly
      prefix = rule.value.tags == null || length(rule.value.tags) == 0 ? rule.value.prefix : null
    }

    # ... transitions and expirations
  }
}
```

The AWS provider requires this distinction because the filter API works differently for single-condition vs multi-condition filters.

## Validation

Add validation to catch configuration mistakes early:

```hcl
variable "lifecycle_rules" {
  # ... type definition ...

  validation {
    condition = alltrue([
      for rule in var.lifecycle_rules :
      rule.id != "" && length(rule.id) <= 255
    ])
    error_message = "Each lifecycle rule must have a non-empty ID of 255 characters or less."
  }

  validation {
    condition = alltrue([
      for rule in var.lifecycle_rules :
      length(rule.transitions) > 0 || rule.expiration_days != null || rule.abort_incomplete_multipart_upload_days != null
    ])
    error_message = "Each lifecycle rule must have at least one transition, expiration, or abort incomplete multipart upload configuration."
  }
}
```

## Summary

Dynamic blocks for S3 lifecycle rules let you manage complex storage policies from variable data. You can define standard rule sets in locals, customize per environment through variables, and combine multiple rule sources with `concat`. The main gotchas are around the filter block structure - remember that prefix-only and prefix-plus-tags filters use different block shapes. For more on dynamic blocks with AWS resources, check out [how to use dynamic blocks for WAF rules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-waf-rules-in-terraform/view).
