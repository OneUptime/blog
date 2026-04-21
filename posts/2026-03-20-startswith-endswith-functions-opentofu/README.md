# How to Use the startswith and endswith Functions in OpenTofu - Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Startswith, Endswith, String Function, HCL, Infrastructure as Code

Description: Learn how to use the startswith and endswith functions in OpenTofu to check whether strings begin or end with specific substrings.

---

`startswith()` returns `true` if a string begins with a given prefix, and `endswith()` returns `true` if a string ends with a given suffix. Both are case-sensitive.

---

## Syntax

```hcl
startswith(string, prefix)
endswith(string, suffix)
```

---

## Basic Examples

```hcl
locals {
  # startswith
  example1 = startswith("https://api.example.com", "https://")  # true
  example2 = startswith("prod-database", "prod-")               # true
  example3 = startswith("staging-db", "prod-")                  # false

  # endswith
  example4 = endswith("report.csv", ".csv")      # true
  example5 = endswith("config.json", ".yaml")    # false
  example6 = endswith("my-app", "-app")          # true
}
```

---

## Validating Variable Formats

```hcl
variable "ami_id" {
  type = string

  validation {
    condition     = startswith(var.ami_id, "ami-")
    error_message = "ami_id must start with 'ami-' (e.g., ami-0abcdef1234567890)."
  }
}

variable "vpc_id" {
  type = string

  validation {
    condition     = startswith(var.vpc_id, "vpc-")
    error_message = "vpc_id must start with 'vpc-'."
  }
}

variable "config_file" {
  type = string

  validation {
    condition     = endswith(var.config_file, ".json") || endswith(var.config_file, ".yaml")
    error_message = "config_file must be a .json or .yaml file."
  }
}
```

---

## Filtering Resources by Name Pattern

```hcl
variable "security_groups" {
  type = map(object({
    name        = string
    description = string
  }))
}

locals {
  # Find all internal security groups
  internal_sgs = {
    for name, sg in var.security_groups :
    name => sg
    if startswith(sg.name, "internal-")
  }

  # Find all security groups for the web tier
  web_sgs = {
    for name, sg in var.security_groups :
    name => sg
    if endswith(sg.name, "-web")
  }
}
```

---

## Route53 Zone Name Normalization

DNS zone names are often represented as fully qualified names with a trailing dot:

```hcl
variable "zone_name" {
  type    = string
  default = "example.com"
}

locals {
  # Ensure zone name ends with a dot when you want the fully qualified form
  normalized_zone = endswith(var.zone_name, ".") ? var.zone_name : "${var.zone_name}."
  # "example.com" → "example.com."
}

data "aws_route53_zone" "main" {
  name = local.normalized_zone
}
```

---

## Protocol Detection

```hcl
variable "endpoint_url" {
  type = string
}

locals {
  is_https  = startswith(var.endpoint_url, "https://")
  is_http   = startswith(var.endpoint_url, "http://")
  is_grpc   = startswith(var.endpoint_url, "grpc://")
  is_secure = local.is_https || local.is_grpc
}

resource "aws_lb_listener" "app" {
  port     = local.is_https ? 443 : 80
  protocol = local.is_https ? "HTTPS" : "HTTP"
  # ...
}
```

---

## startswith/endswith vs Other Methods

```hcl
locals {
  name = "prod-webapp-backend"

  # These are equivalent:
  starts_with_prod_1 = startswith(local.name, "prod-")
  starts_with_prod_2 = substr(local.name, 0, 5) == "prod-"
  starts_with_prod_3 = can(regex("^prod-", local.name))

  # startswith() is the most readable and efficient
}
```

---

## Summary

`startswith(string, prefix)` and `endswith(string, suffix)` check whether a string begins or ends with a specific sequence of characters. Both are case-sensitive and return a boolean. Use them in variable validation rules to enforce naming conventions, in for expressions to filter resources by name pattern, and in conditional expressions to detect protocols, file types, or environments from string identifiers.
