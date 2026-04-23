# How to Use the replace Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Replace, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the replace function in OpenTofu to substitute occurrences of a substring within a string, including regex-based replacements.

---

The `replace()` function searches a string for occurrences of a substring (or regex pattern) and replaces them with another string.

---

## Syntax

```hcl
replace(string, substring, replacement)
```

If `substring` is wrapped in `/` characters (e.g., `/pattern/`), it's treated as a regular expression. All occurrences are replaced.

---

## Basic Examples

```hcl
locals {
  # Simple string replacement
  example1 = replace("hello world", "world", "OpenTofu")  # "hello OpenTofu"
  example2 = replace("a-b-c-d", "-", "_")                 # "a_b_c_d"
  example3 = replace("my.bucket.name", ".", "-")          # "my-bucket-name"

  # Replace all occurrences
  example4 = replace("aababab", "ab", "X")  # "aXXX"
}
```

---

## Normalizing Resource Names

```hcl
variable "service_name" {
  type    = string
  default = "My App Service"
}

locals {
  # Convert spaces to hyphens and lowercase for use as a resource name
  resource_name = lower(replace(var.service_name, " ", "-"))
  # "my-app-service"
}

resource "aws_s3_bucket" "app" {
  bucket = local.resource_name
}
```

---

## Converting Underscores to Hyphens (and vice versa)

```hcl
variable "env_name" {
  type    = string
  default = "us_east_production"
}

locals {
  # S3 and other AWS resources often require hyphens, not underscores
  hyphenated = replace(var.env_name, "_", "-")
  # "us-east-production"
}
```

---

## Regex-Based Replacement

Wrap the pattern in `/` to use regular expressions:

```hcl
locals {
  # Remove all digits from a string
  example1 = replace("abc123def456", "/[0-9]+/", "")  # "abcdef"

  # Replace multiple spaces with single space
  example2 = replace("too   many   spaces", "/  +/", " ")  # "too many spaces"

  # Remove all non-alphanumeric characters
  example3 = replace("hello@world!123", "/[^a-zA-Z0-9]/", "")  # "helloworld123"
}
```

---

## Template Variable Substitution

```hcl
variable "template" {
  type    = string
  default = "Hello, {name}! Your environment is {env}."
}

variable "user_name" {
  type    = string
  default = "Alice"
}

variable "environment" {
  type    = string
  default = "production"
}

locals {
  rendered = replace(
    replace(var.template, "{name}", var.user_name),
    "{env}",
    var.environment
  )
}
```

---

## Cleaning ARNs for Names

```hcl
resource "aws_iam_role" "app" {
  name = "app-role"
}

locals {
  # Create a safe identifier from the ARN by replacing ":" and "/"
  role_safe_id = replace(aws_iam_role.app.arn, "/[:/]/", "-")
  # "arn:aws:iam::123:role/app-role" → "arn-aws-iam--123-role-app-role"
}
```

---

## replace vs Other String Functions

| Function | Use Case |
|---|---|
| `replace(s, from, to)` | Replace all occurrences, supports regex |
| `trimprefix(s, prefix)` | Remove exact prefix (once) |
| `trimsuffix(s, suffix)` | Remove exact suffix (once) |
| `trim(s, chars)` | Remove character set from both ends |

---

## Summary

`replace(string, substring, replacement)` replaces all occurrences of `substring` in `string` with `replacement`. When `substring` is wrapped in `/slashes/`, it's interpreted as a regex. Use it to normalize names (spaces to hyphens, underscores to hyphens), sanitize user input, process template strings, and transform identifiers into formats required by specific AWS services.
