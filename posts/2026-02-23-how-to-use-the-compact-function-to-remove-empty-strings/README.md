# How to Use the compact Function to Remove Empty Strings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Compact Function, Lists, HCL, Infrastructure as Code, String Functions

Description: Learn how to use the compact function in Terraform to remove empty string elements from lists and build cleaner configurations with conditional values.

---

Building lists in Terraform often involves conditional logic. You might want to include a certain tag only in production, or add an extra security group only when a feature flag is enabled. The `compact` function gives you an elegant way to handle these situations by stripping out empty strings from a list.

## What Is the compact Function?

The `compact` function takes a list of strings and returns a new list with all empty string elements removed. Non-empty strings pass through unchanged. Here is the basic syntax:

```hcl
# compact(list_of_strings)
# Removes all "" elements from the list
compact(["a", "", "b", "", "c"])
# Returns: ["a", "b", "c"]
```

It is simple, but its applications in real Terraform configurations are surprisingly broad.

## Trying It Out in terraform console

Let's get a feel for how `compact` behaves:

```hcl
# Launch with: terraform console

# Basic usage - removes empty strings
> compact(["hello", "", "world"])
[
  "hello",
  "world",
]

# All empty strings - returns an empty list
> compact(["", "", ""])
[]

# No empty strings - returns the original list
> compact(["a", "b", "c"])
[
  "a",
  "b",
  "c",
]

# Single element
> compact([""])
[]

> compact(["only"])
[
  "only",
]

# Note: compact only removes empty strings, not null
# This would cause a type error if you pass null elements
# Use coalesce or try to handle nulls first
```

## Building Conditional Lists

The most common use case for `compact` is building lists where some elements are conditionally included. Instead of complex conditional expressions, you can use a ternary that returns either the value or an empty string:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "enable_monitoring" {
  type    = bool
  default = true
}

variable "extra_policy_arn" {
  type    = string
  default = ""
}

locals {
  # Build a list of IAM policy ARNs conditionally
  policy_arns = compact([
    # Always include the base policy
    "arn:aws:iam::123456789012:policy/BaseAccess",

    # Only include monitoring policy if monitoring is enabled
    var.enable_monitoring ? "arn:aws:iam::123456789012:policy/MonitoringAccess" : "",

    # Only include production policy in prod
    var.environment == "production" ? "arn:aws:iam::123456789012:policy/ProductionAccess" : "",

    # Include extra policy if provided
    var.extra_policy_arn,
  ])
}

resource "aws_iam_role_policy_attachment" "policies" {
  for_each   = toset(local.policy_arns)
  role       = aws_iam_role.app.name
  policy_arn = each.value
}
```

When `enable_monitoring` is `false`, the ternary returns `""`, and `compact` strips it out. When `extra_policy_arn` is left as its default empty string, it also gets removed. This gives you clean, dynamic lists without nested conditionals.

## Conditional Security Groups

Here is another practical example with security groups:

```hcl
variable "enable_ssh" {
  type    = bool
  default = false
}

variable "enable_monitoring" {
  type    = bool
  default = true
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  # Build security group list based on feature flags
  vpc_security_group_ids = compact([
    aws_security_group.base.id,
    var.enable_ssh ? aws_security_group.ssh.id : "",
    var.enable_monitoring ? aws_security_group.monitoring.id : "",
  ])

  tags = {
    Name = "app-server"
  }
}
```

This is much cleaner than building the list with multiple conditional blocks or using `concat` with conditional lists.

## Constructing DNS Records

When building DNS records or other string-based configurations, `compact` helps you avoid empty entries:

```hcl
variable "domain" {
  type    = string
  default = "example.com"
}

variable "enable_spf" {
  type    = bool
  default = true
}

variable "enable_dkim" {
  type    = bool
  default = true
}

variable "enable_dmarc" {
  type    = bool
  default = false
}

locals {
  # Build a list of TXT record values
  txt_records = compact([
    var.enable_spf   ? "v=spf1 include:_spf.google.com ~all" : "",
    var.enable_dkim  ? "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4..." : "",
    var.enable_dmarc ? "v=DMARC1; p=reject; rua=mailto:dmarc@${var.domain}" : "",
  ])
}

resource "aws_route53_record" "txt" {
  count   = length(local.txt_records) > 0 ? 1 : 0
  zone_id = var.zone_id
  name    = var.domain
  type    = "TXT"
  ttl     = 300
  records = local.txt_records
}
```

## Combining compact with join

A frequent pattern is using `compact` together with `join` to build strings from optional parts:

```hcl
variable "first_name" {
  type    = string
  default = "Jane"
}

variable "middle_name" {
  type    = string
  default = ""  # Optional
}

variable "last_name" {
  type    = string
  default = "Doe"
}

locals {
  # Build a full name, skipping the middle name if not provided
  full_name = join(" ", compact([
    var.first_name,
    var.middle_name,
    var.last_name,
  ]))
}

# Result: "Jane Doe" (without extra space from empty middle name)
output "full_name" {
  value = local.full_name
}
```

Without `compact`, you would get "Jane  Doe" with a double space when the middle name is empty.

## Building Tags Conditionally

Tags are another area where `compact` shines, though you typically combine it with other techniques:

```hcl
variable "cost_center" {
  type    = string
  default = ""
}

variable "project" {
  type    = string
  default = "infrastructure"
}

locals {
  # Build a list of optional tag keys, then create the tag map
  optional_tag_keys = compact([
    var.cost_center != "" ? "CostCenter" : "",
    var.project != ""     ? "Project" : "",
  ])

  optional_tags = {
    for key in local.optional_tag_keys : key => (
      key == "CostCenter" ? var.cost_center :
      key == "Project"    ? var.project : ""
    )
  }

  # Merge with required tags
  all_tags = merge(
    {
      ManagedBy   = "terraform"
      Environment = var.environment
    },
    local.optional_tags
  )
}
```

## Filtering Configuration Lines

When generating configuration files, `compact` helps remove blank lines from optional sections:

```hcl
locals {
  # Build a nginx configuration with optional blocks
  nginx_upstream_servers = compact([
    "server 10.0.1.10:8080;",
    "server 10.0.1.11:8080;",
    var.enable_backup_server ? "server 10.0.1.12:8080 backup;" : "",
  ])

  nginx_config = join("\n", concat(
    ["upstream backend {"],
    [for s in local.nginx_upstream_servers : "    ${s}"],
    ["}"],
  ))
}

output "nginx_config" {
  value = local.nginx_config
}
```

## What compact Does NOT Do

It is worth noting what `compact` does not handle:

```hcl
# compact only removes empty strings ("")
# It does NOT remove:

# Whitespace-only strings
> compact(["hello", "  ", "world"])
[
  "hello",
  "  ",
  "world",
]

# The strings "null" or "false"
> compact(["value", "null", "false"])
[
  "value",
  "null",
  "false",
]
```

If you need to remove whitespace-only strings, you will need to combine `compact` with `trimspace`:

```hcl
locals {
  raw_values = ["hello", "  ", "", "world", " "]

  # First trim whitespace, then compact
  cleaned = compact([for v in local.raw_values : trimspace(v)])
  # Result: ["hello", "world"]
}
```

## Using compact in Module Interfaces

When designing module interfaces, `compact` helps create flexible input handling:

```hcl
# modules/ecs-service/variables.tf
variable "additional_container_definitions" {
  type    = list(string)
  default = []
  description = "Additional container definitions as JSON strings"
}

# modules/ecs-service/main.tf
locals {
  # Combine the main container with any additional containers
  # compact ensures empty strings from conditional inputs are removed
  all_container_defs = compact(concat(
    [local.main_container_json],
    var.additional_container_definitions,
  ))

  task_definition_json = "[${join(",", local.all_container_defs)}]"
}
```

## Performance Considerations

The `compact` function operates in linear time - it scans the list once and removes empty strings. For typical Terraform configurations with lists of a few dozen elements, performance is never a concern. Even with lists of thousands of elements (uncommon in Terraform), `compact` performs well because it is a simple filter operation.

## Summary

The `compact` function is a small utility that solves a very specific problem - removing empty strings from lists - but it enables a clean pattern for building conditional lists in Terraform. Instead of wrestling with nested `concat` calls and conditional blocks, you can lay out all possible values in a flat list, use ternary expressions to conditionally include them, and let `compact` clean up the empties. It is one of those functions that, once you start using it, you will find yourself reaching for constantly.

For more on list manipulation in Terraform, check out our guides on the [concat function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-concat-function-to-merge-lists-in-terraform/view) and the [distinct function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-distinct-function-to-deduplicate-lists/view).
