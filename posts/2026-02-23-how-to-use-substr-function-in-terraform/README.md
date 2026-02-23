# How to Use the substr Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the substr function in Terraform to extract substrings by position and length, with practical examples for parsing identifiers, truncating names, and more.

---

When you need to extract a specific portion of a string by position rather than by pattern, the `substr` function is what you reach for. It pulls out a substring starting at a given offset for a specified number of characters. This is essential for working with fixed-format identifiers, truncating names to meet length constraints, and parsing positional data.

## What Does substr Do?

The `substr` function extracts a portion of a string based on a starting offset and a length.

```hcl
# Basic syntax
substr(string, offset, length)
```

The offset is zero-based (the first character is at position 0). If the length extends beyond the end of the string, it returns characters up to the end without error.

## Basic Examples

```hcl
# Extract starting from position 0, length 5
> substr("hello world", 0, 5)
"hello"

# Extract from position 6, length 5
> substr("hello world", 6, 5)
"world"

# Extract a single character
> substr("hello", 1, 1)
"e"

# Length exceeds string - returns to end
> substr("hello", 2, 100)
"llo"

# Negative offset counts from the end
> substr("hello world", -5, 5)
"world"

# Start from the beginning, take everything
> substr("hello", 0, -1)
"hello"
```

A length of `-1` means "take everything from the offset to the end of the string."

## Truncating Resource Names

Many cloud resources have name length limits. S3 buckets allow 63 characters, IAM role names allow 64, and so on.

```hcl
variable "project_name" {
  default = "very-long-project-name-that-exceeds-limits"
}

variable "environment" {
  default = "production"
}

locals {
  # S3 bucket names: max 63 characters
  max_bucket_length = 63
  raw_bucket_name   = "${var.project_name}-${var.environment}-data"

  bucket_name = (
    length(local.raw_bucket_name) > local.max_bucket_length
    ? substr(local.raw_bucket_name, 0, local.max_bucket_length)
    : local.raw_bucket_name
  )
}

resource "aws_s3_bucket" "data" {
  bucket = local.bucket_name
}
```

## Extracting Date Components

When working with date strings in fixed formats.

```hcl
locals {
  timestamp = "2026-02-23T14:30:00Z"

  # Extract date components
  year  = substr(local.timestamp, 0, 4)   # "2026"
  month = substr(local.timestamp, 5, 2)   # "02"
  day   = substr(local.timestamp, 8, 2)   # "23"
  hour  = substr(local.timestamp, 11, 2)  # "14"

  # Build a date-only string
  date_only = substr(local.timestamp, 0, 10)  # "2026-02-23"
}
```

## Parsing Fixed-Width Identifiers

AWS resource IDs often have fixed-width formats.

```hcl
locals {
  instance_id = "i-0abc123def456789a"

  # Extract the prefix
  id_prefix = substr(local.instance_id, 0, 2)
  # Result: "i-"

  # Extract the hex identifier
  id_hex = substr(local.instance_id, 2, -1)
  # Result: "0abc123def456789a"

  # Create a short identifier (first 8 hex chars)
  short_id = substr(local.instance_id, 2, 8)
  # Result: "0abc123d"
}
```

## Creating Short Unique Identifiers

Generate short identifiers from longer hashes or UUIDs.

```hcl
locals {
  # Suppose you have a hash
  full_hash = "a3f5b2c8d1e9f0ab"

  # Take just the first 8 characters for a short identifier
  short_hash = substr(local.full_hash, 0, 8)
  # Result: "a3f5b2c8"

  # Build a resource name with the short hash
  resource_name = "myapp-${local.short_hash}"
  # Result: "myapp-a3f5b2c8"
}
```

## Masking Sensitive Values

Show only a portion of sensitive values for logging or display.

```hcl
variable "api_key" {
  type      = string
  sensitive = true
  default   = "sk-1234567890abcdef1234567890abcdef"
}

locals {
  # Show only the first 5 and last 4 characters
  key_prefix = substr(var.api_key, 0, 5)
  key_suffix = substr(var.api_key, length(var.api_key) - 4, 4)
  masked_key = "${local.key_prefix}..${local.key_suffix}"
  # Result: "sk-12..cdef"
}

output "api_key_hint" {
  value = local.masked_key
}
```

## Extracting Region from Availability Zone

AWS availability zones append a letter to the region name.

```hcl
variable "availability_zone" {
  default = "us-east-1a"
}

locals {
  # Region is everything except the last character
  region = substr(var.availability_zone, 0, length(var.availability_zone) - 1)
  # Result: "us-east-1"

  # AZ letter is just the last character
  az_letter = substr(var.availability_zone, length(var.availability_zone) - 1, 1)
  # Result: "a"
}
```

## Building Fixed-Width Columns

Format output with fixed-width columns using `substr` and padding.

```hcl
locals {
  services = {
    "web-server"    = "running"
    "api-gateway"   = "stopped"
    "database"      = "running"
    "cache"         = "degraded"
  }

  # Create padded output
  status_lines = [
    for name, status in local.services :
    "${substr("${name}                    ", 0, 20)}${status}"
  ]
  # Result:
  # "web-server          running"
  # "api-gateway         stopped"
  # "database            running"
  # "cache               degraded"
}
```

## Validating String Length Ranges

Use `substr` in validations to check specific positions.

```hcl
variable "account_id" {
  description = "AWS Account ID"
  type        = string

  validation {
    condition     = length(var.account_id) == 12
    error_message = "AWS Account ID must be exactly 12 characters."
  }
}

variable "project_code" {
  description = "Project code (format: XX-NNNN)"
  type        = string

  validation {
    condition = (
      length(var.project_code) == 7 &&
      substr(var.project_code, 2, 1) == "-"
    )
    error_message = "Project code must be in format XX-NNNN (e.g., AB-1234)."
  }
}
```

## Extracting from Connection Strings

Parse components from structured connection strings.

```hcl
locals {
  # Redis connection string
  redis_url = "redis://cache.internal:6379/0"

  # Remove the protocol prefix (7 chars for "redis://")
  without_protocol = substr(local.redis_url, 8, -1)
  # Result: "cache.internal:6379/0"
}
```

For more complex parsing, consider using [regex](https://oneuptime.com/blog/post/2026-02-23-how-to-use-regex-function-in-terraform/view) or [split](https://oneuptime.com/blog/post/2026-02-23-how-to-use-split-function-in-terraform/view) instead.

## Combining substr with length

A common pattern is using `length` to calculate dynamic offsets.

```hcl
locals {
  full_string = "prefix-important-part-suffix"
  prefix_len  = length("prefix-")
  suffix_len  = length("-suffix")

  # Extract the middle part
  important = substr(
    local.full_string,
    local.prefix_len,
    length(local.full_string) - local.prefix_len - local.suffix_len
  )
  # Result: "important-part"
}
```

## Handling Edge Cases

```hcl
# Empty string
> substr("", 0, 5)
""

# Offset at end of string
> substr("hello", 5, 5)
""

# Length of 0
> substr("hello", 0, 0)
""

# The -1 length shortcut
> substr("hello world", 6, -1)
"world"
```

## Summary

The `substr` function is your tool for positional string extraction in Terraform. It handles truncation for name length limits, parsing fixed-format identifiers, extracting date components, and masking sensitive values. Remember that offsets are zero-based, negative offsets count from the end, and a length of -1 means "to the end." For pattern-based extraction rather than positional, use `regex` or `split` instead.
