# How to Use the substr Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Substr, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the substr function in OpenTofu to extract a portion of a string by specifying a start offset and length.

---

The `substr()` function extracts a substring from a string given a starting offset and a length.

---

## Syntax

```hcl
substr(string, offset, length)
```

- `offset` - starting character position (0-indexed); negative values count from the end
- `length` - number of characters to extract; `-1` extracts to the end of the string

---

## Basic Examples

```hcl
locals {
  example1 = substr("hello world", 0, 5)     # "hello"
  example2 = substr("hello world", 6, 5)     # "world"
  example3 = substr("hello world", 6, -1)    # "world" (to end)

  # Negative offset counts from the end
  example4 = substr("hello world", -5, -1)   # "world" (last 5 chars)
  example5 = substr("hello world", -5, 3)    # "wor" (3 chars starting 5 from end)
}
```

---

## Truncating Long Names

AWS resources have name length limits. Use `substr()` to enforce them:

```hcl
variable "cluster_name" {
  type = string
}

locals {
  # EKS cluster names max 100 chars, but keep it shorter for readability
  safe_cluster_name = substr(var.cluster_name, 0, 63)
}

resource "aws_eks_cluster" "main" {
  name = local.safe_cluster_name
}
```

---

## Extracting Prefixes for Categorization

```hcl
variable "resource_ids" {
  type = list(string)
  default = ["sg-abc123", "vpc-def456", "subnet-789ghi"]
}

locals {
  # Extract the resource type prefix (2-6 chars before the hyphen)
  resource_types = [
    for id in var.resource_ids :
    substr(id, 0, index(split("", id), "-"))
  ]
  # Simpler: use split instead
  types_via_split = [for id in var.resource_ids : split("-", id)[0]]
  # ["sg", "vpc", "subnet"]
}
```

---

## Environment Detection from Workspace Name

```hcl
variable "workspace" {
  type    = string
  default = "prod-us-east-1"
}

locals {
  # Get the first 4 characters to detect environment
  env_prefix = substr(var.workspace, 0, 4)
  is_prod    = local.env_prefix == "prod"
}
```

---

## Generating Short IDs

```hcl
resource "random_id" "suffix" {
  byte_length = 8
}

locals {
  # Use only the first 8 hex characters as a short suffix
  short_id = substr(random_id.suffix.hex, 0, 8)
}

resource "aws_s3_bucket" "app" {
  bucket = "myapp-${local.short_id}"
  # e.g., "myapp-a1b2c3d4"
}
```

---

## Building a Safe S3 Key Prefix

```hcl
variable "long_identifier" {
  type = string
}

locals {
  # S3 key prefixes have length limits in some contexts
  # Take first 200 chars to stay safe
  safe_prefix = substr(var.long_identifier, 0, min(200, length(var.long_identifier)))
}
```

---

## substr vs Other String Extraction

| Need | Function |
|---|---|
| Extract by position and length | `substr(s, offset, length)` |
| Remove leading chars | `trimprefix(s, prefix)` |
| Split on delimiter | `split(sep, s)` |
| Find position of a character | `index(split("", s), char)` |

---

## Summary

`substr(string, offset, length)` extracts a portion of a string starting at `offset` for `length` characters. Use `-1` for length to extract to the end. Negative offsets count from the end of the string. Common uses include truncating names to fit AWS length limits, extracting prefixes for categorization, generating short identifiers, and slicing configuration strings. For delimiter-based splitting, `split()` is usually cleaner.
