# How to Use the trim Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the trim function in Terraform to remove specific characters from both ends of a string, with practical examples and real-world patterns.

---

The `trim` function in Terraform removes specific characters from the beginning and end of a string. Unlike `trimspace` which only removes whitespace, `trim` lets you specify exactly which characters to strip. This gives you fine-grained control over cleaning up string values in your configurations.

## What Does trim Do?

The `trim` function takes two arguments: a string and a set of characters to remove. It strips any of those characters from both the beginning and end of the string.

```hcl
# Basic syntax
trim(string, characters_to_remove)
```

The second argument is a string where each character is treated individually - it is not looking for the full string as a sequence, but rather any of the characters it contains.

## Basic Examples

```hcl
# Remove hyphens from both ends
> trim("---hello---", "-")
"hello"

# Remove slashes
> trim("/path/to/resource/", "/")
"path/to/resource"

# Remove multiple character types
> trim("...hello!!!", ".!")
"hello"

# Characters in the middle are not affected
> trim("--hello--world--", "-")
"hello--world"

# Nothing to trim
> trim("hello", "-")
"hello"

# Remove quotes
> trim("\"quoted\"", "\"")
"quoted"
```

The key thing to understand is that the second argument is a character set, not a substring. `trim("abcba", "ab")` removes `a` and `b` from both ends, resulting in `"c"`.

```hcl
# Character set, not substring
> trim("abcba", "ab")
"c"

# Removes 'a' and 'b' individually from both ends
> trim("banana", "ab")
"nana"
```

## Cleaning Up Path Strings

One of the most common uses is normalizing paths by removing leading and trailing slashes.

```hcl
variable "s3_prefix" {
  description = "S3 key prefix for data storage"
  type        = string
  default     = "/data/raw/"
}

resource "aws_s3_object" "data" {
  bucket = aws_s3_bucket.main.id
  # Remove leading/trailing slashes for clean S3 keys
  key    = "${trim(var.s3_prefix, "/")}/file.csv"
  source = "local/file.csv"
  # Result: "data/raw/file.csv" instead of "/data/raw//file.csv"
}
```

## Normalizing Domain Names

Strip dots and trailing periods from domain inputs.

```hcl
variable "domain" {
  description = "Domain name"
  type        = string
  default     = ".example.com."
}

locals {
  # Remove leading and trailing dots
  clean_domain = trim(var.domain, ".")
  # Result: "example.com"
}

resource "aws_route53_zone" "main" {
  name = local.clean_domain
}
```

DNS records sometimes include trailing dots (the root zone marker). Cleaning them up prevents inconsistencies.

## Stripping Wrapper Characters

Remove enclosing brackets, braces, or parentheses from strings.

```hcl
locals {
  raw_values = [
    "[value1]",
    "(value2)",
    "{value3}",
    "<value4>"
  ]

  # Strip different wrapper characters
  clean_values = [
    trim(local.raw_values[0], "[]"),   # "value1"
    trim(local.raw_values[1], "()"),   # "value2"
    trim(local.raw_values[2], "{}"),   # "value3"
    trim(local.raw_values[3], "<>"),   # "value4"
  ]
}
```

## Cleaning Up User Input

When accepting user input through variables, `trim` helps normalize values.

```hcl
variable "project_name" {
  description = "Project name"
  type        = string
}

locals {
  # Remove common accidental characters from project names
  clean_project = trim(
    trim(var.project_name, " "),  # Remove spaces first
    "-_"                          # Then remove leading/trailing hyphens and underscores
  )
}

resource "aws_s3_bucket" "project" {
  bucket = "${lower(local.clean_project)}-data"
}
```

## Working with CSV Values

When parsing CSV-like data, individual values might have extra whitespace or quotes.

```hcl
variable "allowed_ips_csv" {
  description = "Comma-separated list of allowed IPs"
  type        = string
  default     = " 10.0.1.1 , 10.0.2.1 , 10.0.3.1 "
}

locals {
  # Split and clean each IP
  allowed_ips = [
    for ip in split(",", var.allowed_ips_csv) :
    trim(ip, " ")
  ]
  # Result: ["10.0.1.1", "10.0.2.1", "10.0.3.1"]
}
```

## Removing Protocol Prefixes and Suffixes

While `trimprefix` and `trimsuffix` are better for this, `trim` can handle cases where you want to strip characters from both ends.

```hcl
locals {
  # Remove hash characters from a color code input
  raw_color = "#FF5733#"
  color     = trim(local.raw_color, "#")
  # Result: "FF5733"
}
```

For removing specific prefixes or suffixes (not individual characters), use [trimprefix](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trimprefix-function-in-terraform/view) or [trimsuffix](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trimsuffix-function-in-terraform/view) instead.

## Variable Validation with trim

Validate that variable values do not have certain leading/trailing characters.

```hcl
variable "resource_name" {
  description = "Name for the resource"
  type        = string

  validation {
    condition     = var.resource_name == trim(var.resource_name, "-_.")
    error_message = "Resource name must not start or end with hyphens, underscores, or periods."
  }

  validation {
    condition     = var.resource_name == trim(var.resource_name, " ")
    error_message = "Resource name must not have leading or trailing spaces."
  }
}
```

## Combining trim with Other Functions

Build processing pipelines for string cleanup.

```hcl
locals {
  raw_input = "  //my-app-name//  "

  # Step-by-step cleanup
  step1 = trimspace(local.raw_input)    # "//my-app-name//"
  step2 = trim(local.step1, "/")        # "my-app-name"
  step3 = lower(local.step2)            # "my-app-name" (already lowercase)

  # Or as a single nested expression
  clean = lower(trim(trimspace(local.raw_input), "/"))
  # Result: "my-app-name"
}
```

## Processing Map Values

Clean up all values in a map using `trim`.

```hcl
variable "config" {
  type = map(string)
  default = {
    host    = "  db.example.com  "
    port    = " 5432 "
    dbname  = " mydb "
    sslmode = " require "
  }
}

locals {
  # Clean all config values
  clean_config = {
    for key, value in var.config :
    key => trim(value, " ")
  }
  # {
  #   host    = "db.example.com"
  #   port    = "5432"
  #   dbname  = "mydb"
  #   sslmode = "require"
  # }
}
```

## trim vs trimspace vs trimprefix vs trimsuffix

Here is when to use each function:

```hcl
locals {
  test = "  --hello--  "

  # trim: remove specific characters from both ends
  trimmed = trim(local.test, " -")
  # "hello"

  # trimspace: remove all whitespace from both ends
  trimspaced = trimspace(local.test)
  # "--hello--"

  # trimprefix: remove a specific prefix string
  # (not applicable here since it removes a substring, not characters)

  # trimsuffix: remove a specific suffix string
  # (not applicable here since it removes a substring, not characters)
}
```

Use `trim` when you want to remove specific characters. Use `trimspace` when you only need to remove whitespace. Use `trimprefix`/`trimsuffix` when you want to remove a specific substring from one end.

## Summary

The `trim` function gives you precise control over stripping characters from the edges of strings. It is especially useful for normalizing paths, cleaning user input, removing wrapper characters, and preparing strings for use in resource configurations. Remember that the second argument is a character set, not a substring - each character is removed individually from both ends of the string.
