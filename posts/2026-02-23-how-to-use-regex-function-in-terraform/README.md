# How to Use the regex Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps, Regular Expressions

Description: Learn how to use the regex function in Terraform to extract values from strings using regular expressions, with practical examples for parsing and validation.

---

Sometimes the simpler string functions are not enough. When you need to extract structured data from strings, validate complex patterns, or parse identifiers, the `regex` function in Terraform gives you the power of regular expressions. It applies a regex pattern to a string and returns the matching portion.

## What Does regex Do?

The `regex` function applies a regular expression pattern to a string and returns the first match. If the pattern contains capture groups, it returns the captured values. If there is no match, it throws an error.

```hcl
# Basic syntax
regex(pattern, string)
```

Terraform uses the RE2 regular expression syntax, which is the same engine used by Go.

## Basic Examples

```hcl
# Simple pattern match - returns the entire match
> regex("[a-z]+", "hello123")
"hello"

# Match digits
> regex("[0-9]+", "server42")
"42"

# Match with a capture group - returns the captured part
> regex("server-([0-9]+)", "server-42")
"42"

# Multiple capture groups return a list
> regex("([a-z]+)-([0-9]+)", "web-001")
["web", "001"]

# Named capture groups return a map
> regex("(?P<name>[a-z]+)-(?P<num>[0-9]+)", "web-001")
{ "name" = "web", "num" = "001" }
```

## Parsing AWS Resource IDs

Use regex to extract components from AWS resource identifiers.

```hcl
locals {
  arn = "arn:aws:s3:::my-bucket-prod/data/file.txt"

  # Extract the bucket name
  bucket_name = regex("arn:aws:s3:::([^/]+)", local.arn)
  # Result: "my-bucket-prod"

  # Parse a full ARN into components
  arn_parts = regex(
    "arn:aws:([^:]+):([^:]*):([^:]*):(.+)",
    "arn:aws:lambda:us-east-1:123456789012:function:my-func"
  )
  # Result: ["lambda", "us-east-1", "123456789012", "function:my-func"]
}
```

## Named Capture Groups

Named groups make the extracted values much more readable.

```hcl
locals {
  connection_string = "postgresql://admin:secret@db.example.com:5432/mydb"

  # Parse the connection string into named components
  db_parts = regex(
    "(?P<protocol>[a-z]+)://(?P<user>[^:]+):(?P<pass>[^@]+)@(?P<host>[^:]+):(?P<port>[0-9]+)/(?P<db>.+)",
    local.connection_string
  )
  # Result: {
  #   "protocol" = "postgresql"
  #   "user"     = "admin"
  #   "pass"     = "secret"
  #   "host"     = "db.example.com"
  #   "port"     = "5432"
  #   "db"       = "mydb"
  # }

  db_host = local.db_parts["host"]
  db_port = local.db_parts["port"]
}
```

## Variable Validation

One of the most practical uses of `regex` is validating variable inputs.

```hcl
variable "email" {
  description = "Contact email address"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.email))
    error_message = "Must be a valid email address."
  }
}

variable "semver" {
  description = "Semantic version number"
  type        = string

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.semver))
    error_message = "Must be a valid semantic version (e.g., 1.2.3)."
  }
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "AWS account ID must be exactly 12 digits."
  }
}
```

The `can` function wraps the `regex` call so that a non-match returns `false` instead of throwing an error.

## Extracting Version Numbers

Parse version strings into their components.

```hcl
variable "runtime_version" {
  description = "Runtime version string"
  type        = string
  default     = "python3.11"
}

locals {
  # Extract the version number from a runtime string
  version_parts = regex(
    "(?P<lang>[a-z]+)(?P<major>[0-9]+)\\.(?P<minor>[0-9]+)",
    var.runtime_version
  )
  # Result: { "lang" = "python", "major" = "3", "minor" = "11" }

  language      = local.version_parts["lang"]
  major_version = tonumber(local.version_parts["major"])
  minor_version = tonumber(local.version_parts["minor"])
}
```

## Parsing CIDR Blocks

Extract network and mask information from CIDR notation.

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  cidr_parts = regex(
    "(?P<octet1>[0-9]+)\\.(?P<octet2>[0-9]+)\\.(?P<octet3>[0-9]+)\\.(?P<octet4>[0-9]+)/(?P<mask>[0-9]+)",
    var.vpc_cidr
  )

  network_prefix = "${local.cidr_parts["octet1"]}.${local.cidr_parts["octet2"]}"
  subnet_mask    = tonumber(local.cidr_parts["mask"])
}
```

## Safe regex with can()

Since `regex` throws an error when there is no match, always wrap it with `can()` for conditional logic.

```hcl
locals {
  test_string = "hello-world-42"

  # Safe check: does it match?
  has_number = can(regex("[0-9]+", local.test_string))
  # true

  # Safe extraction with a default
  number = can(regex("[0-9]+", local.test_string)) ? regex("[0-9]+", local.test_string) : "0"
  # "42"

  # Or use try()
  number_v2 = try(regex("[0-9]+", local.test_string), "0")
  # "42"
}
```

## Parsing S3 URIs

Break down S3 URIs into bucket and key components.

```hcl
variable "s3_uri" {
  description = "S3 URI"
  type        = string
  default     = "s3://my-data-bucket/path/to/data/file.parquet"
}

locals {
  s3_parts = regex("s3://(?P<bucket>[^/]+)/(?P<key>.+)", var.s3_uri)

  s3_bucket = local.s3_parts["bucket"]
  s3_key    = local.s3_parts["key"]
}

# s3_bucket = "my-data-bucket"
# s3_key    = "path/to/data/file.parquet"
```

## Extracting Tags from Strings

Parse structured tag strings into usable values.

```hcl
locals {
  tag_string = "env:production,team:platform,cost-center:eng-42"

  # Split into individual tags first
  tag_pairs = split(",", local.tag_string)

  # Parse each tag into key-value pairs using regex
  tags = {
    for pair in local.tag_pairs :
    regex("^([^:]+)", pair)[0] => regex(":(.+)$", pair)[0]
  }
  # Result: {
  #   "env"         = "production"
  #   "team"        = "platform"
  #   "cost-center" = "eng-42"
  # }
}
```

## Common Regex Patterns for Infrastructure

Here are some patterns you will use frequently.

```hcl
locals {
  # IP address validation
  is_valid_ip = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}$", "192.168.1.1"))

  # AWS region format
  is_valid_region = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", "us-east-1"))

  # S3 bucket name rules
  is_valid_bucket = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", "my-bucket"))

  # Kubernetes namespace format
  is_valid_ns = can(regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$", "my-namespace"))

  # Semantic version
  is_valid_semver = can(regex("^v?[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9.]+)?$", "v1.2.3-beta.1"))
}
```

## regex vs regexall

The `regex` function returns only the first match. If you need all matches in a string, use `regexall` instead.

```hcl
> regex("[0-9]+", "abc 123 def 456")
"123"

# regexall returns all matches
# See our post on regexall for details
```

For finding all matches, see [how to use regexall](https://oneuptime.com/blog/post/2026-02-23-how-to-use-regexall-function-in-terraform/view).

## Summary

The `regex` function brings the power of regular expressions to Terraform. Use it to parse structured strings like ARNs, connection strings, and version numbers. Use named capture groups for readable code. Always wrap `regex` calls with `can()` or `try()` when the match might fail. And for input validation, combine `can(regex(...))` with variable validation blocks to catch bad input before Terraform even starts planning.
