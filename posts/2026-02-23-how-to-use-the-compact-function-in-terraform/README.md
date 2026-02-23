# How to Use the compact Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the compact function in Terraform to remove empty string elements from a list, with practical examples for cleaning up dynamic configurations.

---

When building dynamic Terraform configurations, you often end up with lists that contain empty string elements. These can come from conditional expressions, optional variables, or data transformations. The `compact` function provides a simple way to clean up these lists by removing all empty string values.

This guide walks through the `compact` function, its behavior, and real-world scenarios where it becomes essential for writing clean Terraform code.

## What is the compact Function?

The `compact` function takes a list of strings and returns a new list with all empty string elements removed. Non-empty strings are preserved in their original order.

```hcl
# Removes all empty strings from the list
compact(list)
```

It only works with lists of strings and only removes empty strings (`""`). It does not remove null values or whitespace-only strings.

## Basic Usage in Terraform Console

```hcl
# Remove empty strings from a list
> compact(["a", "", "b", "", "c"])
["a", "b", "c"]

# A list with no empty strings is unchanged
> compact(["a", "b", "c"])
["a", "b", "c"]

# A list of all empty strings becomes empty
> compact(["", "", ""])
[]

# Empty input returns empty output
> compact([])
[]

# Whitespace strings are NOT removed (only "" is removed)
> compact(["a", " ", "b"])
["a", " ", "b"]
```

## Building Dynamic CIDR Lists

One of the most practical uses of `compact` is assembling lists from conditional values. When some values are conditionally set to empty strings, `compact` cleans up the result.

```hcl
variable "enable_office_access" {
  type    = bool
  default = true
}

variable "enable_vpn_access" {
  type    = bool
  default = false
}

variable "enable_partner_access" {
  type    = bool
  default = false
}

locals {
  # Each CIDR is included only if its feature flag is true
  # Disabled features produce empty strings, which compact removes
  allowed_cidrs = compact([
    var.enable_office_access ? "203.0.113.0/24" : "",
    var.enable_vpn_access ? "10.8.0.0/16" : "",
    var.enable_partner_access ? "198.51.100.0/24" : "",
  ])
}

resource "aws_security_group_rule" "ingress" {
  count = length(local.allowed_cidrs)

  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [local.allowed_cidrs[count.index]]
  security_group_id = aws_security_group.app.id
}
```

With `enable_office_access = true` and the others `false`, `local.allowed_cidrs` evaluates to `["203.0.113.0/24"]`. Without `compact`, the list would be `["203.0.113.0/24", "", ""]`, which would cause errors in the security group rule.

## Cleaning Up Dynamic Tag Lists

Tags often come from multiple sources, and not all of them produce values.

```hcl
variable "project_tag" {
  type    = string
  default = ""
}

variable "team_tag" {
  type    = string
  default = "platform"
}

variable "extra_tag" {
  type    = string
  default = ""
}

locals {
  # Collect all non-empty tags into a clean list
  tag_values = compact([var.project_tag, var.team_tag, var.extra_tag])
}

output "active_tags" {
  value = local.tag_values
  # Output: ["platform"] when project_tag and extra_tag are empty
}
```

## Assembling DNS Names

When constructing lists of DNS names from optional components, `compact` keeps the result clean.

```hcl
variable "primary_domain" {
  type    = string
  default = "app.example.com"
}

variable "secondary_domain" {
  type    = string
  default = ""
}

variable "custom_domain" {
  type    = string
  default = ""
}

locals {
  # Build the list of all active domains
  all_domains = compact([
    var.primary_domain,
    var.secondary_domain,
    var.custom_domain,
  ])
}

resource "aws_acm_certificate" "app" {
  domain_name               = local.all_domains[0]
  subject_alternative_names = length(local.all_domains) > 1 ? slice(local.all_domains, 1, length(local.all_domains)) : []
  validation_method         = "DNS"
}
```

This creates a certificate with only the domains that are actually specified, without empty entries causing validation errors.

## Using compact with for Expressions

The `compact` function works well after `for` expressions that conditionally produce values.

```hcl
variable "services" {
  type = list(object({
    name    = string
    enabled = bool
    url     = string
  }))
  default = [
    { name = "api", enabled = true, url = "https://api.example.com" },
    { name = "web", enabled = false, url = "https://web.example.com" },
    { name = "admin", enabled = true, url = "https://admin.example.com" },
  ]
}

locals {
  # Get URLs of only enabled services
  active_urls = compact([
    for svc in var.services : svc.enabled ? svc.url : ""
  ])
}

output "active_service_urls" {
  value = local.active_urls
  # Output: ["https://api.example.com", "https://admin.example.com"]
}
```

Note that you could also use a filtered `for` expression with an `if` clause for this specific case. However, `compact` is useful when the conditional logic is embedded in the value transformation rather than a simple filter.

## compact vs Filtered for Expressions

Both `compact` and filtered `for` expressions can achieve similar results. Here is how they compare.

```hcl
variable "items" {
  type    = list(string)
  default = ["a", "", "b", "", "c"]
}

# Using compact
locals {
  clean_compact = compact(var.items)
  # Result: ["a", "b", "c"]
}

# Using a filtered for expression
locals {
  clean_for = [for item in var.items : item if item != ""]
  # Result: ["a", "b", "c"]
}
```

Both produce the same result. Use `compact` when you are specifically removing empty strings from a list of strings. Use filtered `for` expressions when you need more complex filtering logic or are working with non-string types.

## Combining compact with Other Functions

The `compact` function chains well with other list manipulation functions.

```hcl
locals {
  # Start with raw inputs from various sources
  raw_ips = ["10.0.1.1", "", "10.0.1.2", "", "10.0.1.3", "10.0.1.1"]

  # Remove empty strings and then deduplicate
  clean_unique_ips = distinct(compact(local.raw_ips))
  # Result: ["10.0.1.1", "10.0.1.2", "10.0.1.3"]

  # Join non-empty values into a comma-separated string
  ip_string = join(", ", compact(local.raw_ips))
  # Result: "10.0.1.1, 10.0.1.2, 10.0.1.3, 10.0.1.1"
}
```

## Practical Example: Lambda Environment Variables

When setting environment variables for a Lambda function, you might want to conditionally include certain values.

```hcl
variable "database_url" {
  type    = string
  default = ""
}

variable "cache_url" {
  type    = string
  default = ""
}

variable "api_key" {
  type    = string
  default = ""
}

locals {
  # Build a map of non-empty environment variables
  env_keys   = ["DATABASE_URL", "CACHE_URL", "API_KEY"]
  env_values = [var.database_url, var.cache_url, var.api_key]

  # Find which pairs have non-empty values
  active_env_keys = compact([
    for i, val in local.env_values : val != "" ? local.env_keys[i] : ""
  ])
  active_env_values = compact(local.env_values)

  env_vars = zipmap(local.active_env_keys, local.active_env_values)
}

resource "aws_lambda_function" "app" {
  function_name = "my-app"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda.arn
  filename      = "function.zip"

  environment {
    variables = local.env_vars
  }
}
```

## Edge Cases

Keep these behaviors in mind:

- **Only removes empty strings**: `compact` does not remove null values, whitespace-only strings, or zero-length strings in other types. It strictly removes `""` from a list of strings.
- **Type requirement**: The input must be a list of strings. Passing a list of numbers or booleans will cause an error.
- **Order preservation**: The relative order of non-empty elements is preserved.

```hcl
# Whitespace is preserved, not removed
> compact(["hello", "  ", "world"])
["hello", "  ", "world"]

# Must be a string list
# compact([1, 0, 2]) would cause a type error
```

## Summary

The `compact` function is a small but frequently needed tool in Terraform. It excels at cleaning up lists that are built from conditional expressions, optional variables, and dynamic data sources.

Key takeaways:

- `compact` removes empty strings from a list of strings
- It does not remove nulls, whitespace, or other falsy values
- Pairs naturally with conditional expressions that produce `""` for disabled options
- Works well alongside `distinct`, `join`, and other list functions
- Input must be a list of strings

Reach for `compact` whenever you build lists dynamically and need to filter out the blanks.
