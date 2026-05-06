# How to Use coalesce for Fallback Values in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, COALESCE, HCL, Fallback Values, Infrastructure as Code

Description: Learn how to use OpenTofu's coalesce and coalescelist functions to implement clean fallback value chains in your configurations.

`coalesce` returns the first non-null, non-empty-string value from a list of arguments. It is the most concise way to express "use this value, unless it's null or an empty string, in which case use the next one." This pattern appears everywhere in reusable module design.

## coalesce Basics

```hcl
# Returns the first value that isn't null or an empty string

coalesce(value1, value2, ..., fallback)
```

```hcl
variable "custom_name" {
  type    = string
  default = null
}

locals {
  # Use custom_name if provided, otherwise derive from workspace
  resource_name = coalesce(var.custom_name, "app-${terraform.workspace}")
}
```

## Use Case 1: Module Input with Override

Modules often accept optional overrides with a sensible default:

```hcl
variable "log_group_name" {
  type        = string
  default     = null
  description = "Custom CloudWatch log group name. Defaults to /app/<app_name>"
}

variable "app_name" {
  type = string
}

locals {
  # Caller can override, otherwise use computed default
  log_group = coalesce(var.log_group_name, "/app/${var.app_name}")
}

resource "aws_cloudwatch_log_group" "app" {
  name              = local.log_group
  retention_in_days = 30
}
```

## Use Case 2: Input Variable Fallback Chain

Build a priority chain: most-specific first, broadest default last:

```hcl
variable "prod_instance_type" {
  type    = string
  default = null
}

variable "global_instance_type" {
  type    = string
  default = null
}

locals {
  # Priority: production-specific > global setting > hardcoded default
  instance_type = coalesce(
    var.prod_instance_type,
    var.global_instance_type,
    "t3.micro"
  )
}
```

## Use Case 3: coalescelist for Lists

`coalescelist` returns the first non-empty list:

```hcl
variable "custom_dns_servers" {
  type    = list(string)
  default = []
}

variable "default_dns_servers" {
  type    = list(string)
  default = ["8.8.8.8", "8.8.4.4"]
}

locals {
  # Use custom DNS servers if provided, otherwise use defaults
  dns_servers = coalescelist(var.custom_dns_servers, var.default_dns_servers)
}
```

## Use Case 4: Combining coalesce with try

For values that might cause errors when accessed, combine `try` with `coalesce`:

```hcl
variable "config" {
  type    = map(string)
  default = {}
}

locals {
  # Try to get from the config map, then fall back to a hardcoded default
  db_host = coalesce(
    try(var.config["db_host"], null),
    "localhost"
  )
}
```

## Use Case 5: Tag Value Fallbacks

Build tag values with fallback chains for optional metadata:

```hcl
variable "owner_email" {
  type    = string
  default = null
}

variable "team_email" {
  type    = string
  default = null
}

locals {
  tags = {
    Owner       = coalesce(var.owner_email, var.team_email, "platform-team@company.com")
    Environment = coalesce(terraform.workspace, "unknown")
    ManagedBy   = "opentofu"
  }
}
```

## coalesce vs lookup vs try

| Function | Use When |
|---|---|
| `coalesce(a, b, c)` | Multiple possible values, return first non-null/non-empty-string |
| `lookup(map, key, default)` | Single map key with a default |
| `try(expr, default)` | Expression might error (not just be null) |
| `a != null ? a : b` | Simple null check with a single fallback |

## Important: coalesce Ignores Empty Strings

`coalesce` treats empty strings the same as `null`:

```hcl
locals {
  # Returns "default" because "" is treated as absent
  value = coalesce("", "default")  # Returns "default"

  # To treat "" as a valid value, use a ternary instead
  value2 = var.input != null ? var.input : "default"
}
```

## Conclusion

`coalesce` is the cleanest way to express multi-level fallback chains in OpenTofu. Use it in module variables to provide layered defaults, in tag value construction, and whenever you have a priority-ordered list of potential values. Combine it with `try` when any value in the chain might error rather than simply be null.
