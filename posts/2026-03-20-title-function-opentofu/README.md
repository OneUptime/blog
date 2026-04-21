# How to Use the title Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Title, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the title function in OpenTofu to convert strings to title case, capitalizing the first letter of each word.

---

The `title()` function converts a string to title case - the first letter of each word is capitalized, and the remaining letters are left unchanged.

---

## Syntax

```hcl
title(string)
```

Returns the string with the first character of each word converted to uppercase.

---

## Basic Examples

```hcl
locals {
  example1 = title("hello world")           # "Hello World"
  example2 = title("infrastructure as code") # "Infrastructure As Code"
  example3 = title("my-app-name")           # "My-App-Name"
  example4 = title("ALREADY UPPER")         # "ALREADY UPPER"
}
```

---

## Common Use Case: Display Names from IDs

```hcl
variable "environment" {
  type    = string
  default = "production"
}

locals {
  # Create a human-readable display name
  display_name = title(replace(var.environment, "-", " "))
  # "production" → "Production"
  # "us-east-region" → "Us East Region"
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "App-${title(var.environment)}"
  # "App-Production"
}
```

---

## Tag Values with title

```hcl
variable "team_name" {
  type    = string
  default = "platform engineering"
}

resource "aws_s3_bucket" "app" {
  bucket = "myapp-data"

  tags = {
    Team        = title(var.team_name)   # "Platform Engineering"
    Environment = title(var.environment) # "Production"
  }
}
```

---

## Combining with Other String Functions

```hcl
variable "raw_name" {
  type    = string
  default = "my_application_service"
}

locals {
  # Replace underscores with spaces, then title case
  display = title(replace(var.raw_name, "_", " "))
  # "My Application Service"
}
```

---

## Note on Word Boundaries

`title()` treats the start of the string and many separator characters, such as spaces and hyphens, as word boundaries:

```hcl
locals {
  hyphenated = title("web-app-backend")   # "Web-App-Backend"
  underscored = title("web_app_backend")  # "Web_app_backend"
  # Note: underscores are NOT treated as word separators
}
```

---

## Summary

`title()` converts strings to title case by capitalizing the first letter at each word boundary without lowercasing the rest of the string. Use it to create human-readable display names from lowercase identifiers, format tag values, and build resource names that need proper capitalization. For identifiers with hyphens, title case works naturally; for underscores, use `replace()` first to convert them to spaces.
