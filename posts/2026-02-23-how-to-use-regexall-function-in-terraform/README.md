# How to Use the regexall Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps, Regular Expressions

Description: Learn how to use the regexall function in Terraform to find all matches of a regular expression in a string, with practical examples for parsing and counting patterns.

---

While the `regex` function stops at the first match, `regexall` keeps going and returns every match in the string. This makes it perfect for counting occurrences, extracting all instances of a pattern, validating that certain patterns appear the right number of times, and more.

## What Does regexall Do?

The `regexall` function applies a regular expression to a string and returns a list of all matches, not just the first one. If there are no matches, it returns an empty list instead of throwing an error.

```hcl
# Basic syntax
regexall(pattern, string)
```

This is a key difference from `regex` - you do not need to wrap `regexall` in `can()` or `try()` because it always returns a list (empty if no matches).

## Basic Examples

```hcl
# Find all numbers in a string
> regexall("[0-9]+", "server-01-rack-42-unit-7")
["01", "42", "7"]

# Find all words
> regexall("[a-z]+", "hello-world-foo")
["hello", "world", "foo"]

# No matches returns an empty list (no error!)
> regexall("[0-9]+", "no numbers here")
[]

# With capture groups, each match returns its captures
> regexall("([a-z]+)-([0-9]+)", "web-01 api-02 db-03")
[["web", "01"], ["api", "02"], ["db", "03"]]

# Named capture groups return a list of maps
> regexall("(?P<name>[a-z]+)-(?P<num>[0-9]+)", "web-01 api-02")
[{"name" = "web", "num" = "01"}, {"name" = "api", "num" = "02"}]
```

## Counting Pattern Occurrences

Since `regexall` returns a list, you can use `length` to count matches.

```hcl
locals {
  text = "error: disk full, error: timeout, warning: high cpu, error: oom"

  # Count errors
  error_count   = length(regexall("error:", local.text))
  # Result: 3

  # Count warnings
  warning_count = length(regexall("warning:", local.text))
  # Result: 1

  # Check if any errors exist
  has_errors = length(regexall("error:", local.text)) > 0
  # Result: true
}
```

## Validation Without Errors

Unlike `regex`, `regexall` never throws an error on no match. This makes it ideal for validation conditions.

```hcl
variable "password" {
  description = "Application password"
  type        = string
  sensitive   = true

  # Must contain at least one uppercase letter
  validation {
    condition     = length(regexall("[A-Z]", var.password)) > 0
    error_message = "Password must contain at least one uppercase letter."
  }

  # Must contain at least one digit
  validation {
    condition     = length(regexall("[0-9]", var.password)) > 0
    error_message = "Password must contain at least one digit."
  }

  # Must contain at least one special character
  validation {
    condition     = length(regexall("[!@#$%^&*]", var.password)) > 0
    error_message = "Password must contain at least one special character (!@#$%^&*)."
  }

  # Must be at least 12 characters
  validation {
    condition     = length(var.password) >= 12
    error_message = "Password must be at least 12 characters long."
  }
}
```

## Extracting All IP Addresses

Find every IP address in a configuration string.

```hcl
locals {
  config_text = <<-EOT
    upstream backend {
      server 10.0.1.10:8080;
      server 10.0.1.11:8080;
      server 10.0.1.12:8080;
    }
    allow 192.168.1.0/24;
  EOT

  # Extract all IP addresses
  ip_addresses = regexall("[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+", local.config_text)
  # Result: ["10.0.1.10", "10.0.1.11", "10.0.1.12", "192.168.1.0"]
}
```

## Parsing Key-Value Pairs

Extract all key-value pairs from a structured string.

```hcl
locals {
  tag_string = "env=prod team=platform region=us-east-1 tier=standard"

  # Extract all key=value pairs using named groups
  pairs = regexall("(?P<key>[a-z-]+)=(?P<value>[a-z0-9-]+)", local.tag_string)
  # Result: [
  #   { "key" = "env",    "value" = "prod" },
  #   { "key" = "team",   "value" = "platform" },
  #   { "key" = "region", "value" = "us-east-1" },
  #   { "key" = "tier",   "value" = "standard" }
  # ]

  # Convert to a map
  tags = {
    for pair in local.pairs :
    pair["key"] => pair["value"]
  }
  # Result: { "env" = "prod", "team" = "platform", ... }
}
```

## Validating CIDR Blocks

Check that a string contains valid CIDR notation.

```hcl
variable "cidr_blocks" {
  description = "Space-separated CIDR blocks"
  type        = string
  default     = "10.0.0.0/16 172.16.0.0/12 192.168.0.0/24"
}

locals {
  # Extract all CIDR blocks
  cidrs = regexall("[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+/[0-9]+", var.cidr_blocks)
  # Result: ["10.0.0.0/16", "172.16.0.0/12", "192.168.0.0/24"]
}

resource "aws_security_group_rule" "allow" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = local.cidrs
  security_group_id = aws_security_group.app.id
}
```

## Counting Specific Characters

Use `regexall` to count occurrences of specific characters or patterns.

```hcl
locals {
  path = "a/b/c/d/e"

  # Count the depth of a path by counting slashes
  depth = length(regexall("/", local.path))
  # Result: 4

  # Count dots in a domain name
  domain     = "sub.domain.example.com"
  dot_count  = length(regexall("\\.", local.domain))
  # Result: 3

  # Validate that a version has exactly 2 dots (major.minor.patch)
  version       = "1.2.3"
  is_valid_semver = length(regexall("\\.", local.version)) == 2
  # Result: true
}
```

## Extracting Email Addresses

Find all email addresses embedded in text.

```hcl
variable "contact_info" {
  default = "Contact: admin@example.com or support@example.com. CC: ops@internal.example.com"
}

locals {
  emails = regexall("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", var.contact_info)
  # Result: ["admin@example.com", "support@example.com", "ops@internal.example.com"]
}
```

## Finding Resource References

Parse Terraform-style resource references from strings.

```hcl
locals {
  policy_doc = <<-EOT
    Allow access to aws_s3_bucket.data and aws_s3_bucket.logs.
    Also allow aws_dynamodb_table.users read access.
  EOT

  # Find all resource references
  resource_refs = regexall("aws_[a-z_]+\\.[a-z_]+", local.policy_doc)
  # Result: ["aws_s3_bucket.data", "aws_s3_bucket.logs", "aws_dynamodb_table.users"]
}
```

## Using regexall for Boolean Checks

Since an empty list is falsy in many contexts, you can use `regexall` for pattern existence checks.

```hcl
variable "instance_name" {
  type    = string
  default = "prod-web-server-01"
}

locals {
  # Check if the name contains a number
  has_number = length(regexall("[0-9]", var.instance_name)) > 0

  # Check if it looks like a production resource
  is_prod = length(regexall("^prod-", var.instance_name)) > 0

  # Check if it contains no special characters beyond hyphens
  has_special_chars = length(regexall("[^a-zA-Z0-9-]", var.instance_name)) > 0
}
```

## Extracting All Ports from Configuration

```hcl
locals {
  nginx_config = <<-EOT
    listen 80;
    listen 443 ssl;
    proxy_pass http://backend:8080;
    upstream_port 9090;
  EOT

  # Extract all port numbers (1-5 digits after specific keywords or colons)
  ports = regexall("[0-9]{2,5}", local.nginx_config)
  # Result: ["80", "443", "8080", "9090"]

  # Convert to numbers
  port_numbers = [for p in local.ports : tonumber(p)]
  # Result: [80, 443, 8080, 9090]
}
```

## regexall vs regex

Here is the key difference:

```hcl
locals {
  text = "abc 123 def 456 ghi 789"

  # regex: first match only, errors on no match
  first_number = regex("[0-9]+", local.text)
  # "123"

  # regexall: all matches, empty list on no match
  all_numbers = regexall("[0-9]+", local.text)
  # ["123", "456", "789"]
}
```

Use `regex` when you need exactly one match and want an error if it is missing. Use `regexall` when you need all matches or want safe no-match handling.

For more on `regex`, see [how to use the regex function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-regex-function-in-terraform/view).

## Summary

The `regexall` function is the safer, more versatile cousin of `regex`. It returns all matches as a list and never throws an error on no match. This makes it ideal for counting patterns, extracting multiple values, validating inputs, and any situation where you do not know in advance how many matches exist. Combined with `length()`, it provides clean boolean checks for pattern existence without needing `can()` or `try()`.
