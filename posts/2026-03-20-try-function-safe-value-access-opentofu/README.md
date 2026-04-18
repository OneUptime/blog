# How to Use try Function for Safe Value Access in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Try Function, Error Handling, HCL, Infrastructure as Code

Description: Learn how to use OpenTofu's try function to safely access values that might cause errors, providing fallbacks when expressions fail.

The `try` function evaluates a sequence of expressions and returns the value of the first one that does not produce an error. It is the primary tool in OpenTofu for writing defensive configurations that handle missing attributes, type mismatches, or absent optional values without failing the plan.

## Basic Syntax

```hcl
# try(expression1, expression2, ..., fallback)

# Returns the first expression that succeeds, or the last value as a fallback.
try(some_expression, fallback_value)
```

## Use Case 1: Safe Access to Optional Map Keys

When a map might not contain a key you expect, direct access produces an error. Use `try` to provide a default:

```hcl
variable "instance_config" {
  type = map(string)
  default = {
    instance_type = "t3.micro"
    # Note: "ami_id" is not present
  }
}

locals {
  # Safely access ami_id, falling back to a default AMI if not provided
  ami_id = try(var.instance_config["ami_id"], "ami-0c55b159cbfafe1f0")
}
```

## Use Case 2: Safe Attribute Access on Nullable Objects

Resources may return `null` for optional attributes, and indexing an empty list produces an error. Chaining attribute access on `null` or accessing `[0]` on an empty list causes an error:

```hcl
# Conditionally look up an instance; the list is empty when not requested
data "aws_instance" "existing" {
  count = var.lookup_existing ? 1 : 0
  filter {
    name   = "tag:Name"
    values = ["my-app"]
  }
}

locals {
  # Safely access the private IP, returning empty string when no lookup occurred
  private_ip = try(data.aws_instance.existing[0].private_ip, "")
}
```

Note that `try` only catches expression-evaluation errors. It does not catch provider errors from a data source that fails to find a matching resource at plan time.

## Use Case 3: Handling Type Conversion Failures

`try` gracefully handles failed type conversions:

```hcl
variable "port" {
  # Could be a string "8080" or a number 8080 depending on the caller
  type = any
}

locals {
  # Try to convert to number; fall back to 80 if conversion fails
  port_number = try(tonumber(var.port), 80)
}
```

## Use Case 4: Optional Nested Object Attributes

When working with optional nested blocks, attributes inside may not exist:

```hcl
variable "database_config" {
  type = object({
    host     = string
    port     = optional(number, 5432)
    ssl      = optional(object({
      mode = string
    }))
  })
}

locals {
  # Access nested optional attribute safely
  ssl_mode = try(var.database_config.ssl.mode, "disable")
}
```

## Use Case 5: Fallback Across Multiple Expressions

`try` accepts multiple fallback expressions, evaluating them left to right. Each expression must actually raise an error for the next to be tried — `null` is a valid value, not an error, so plain references to nullable variables will not fall through:

```hcl
variable "tags" {
  type    = any
  default = {}
}

locals {
  # Try a nested tag path first, then a broader one, then a hard-coded default.
  # Each attribute access errors if the attribute is absent, so the next is tried.
  resolved_tags = try(
    var.tags.custom,     # Preferred: object has a .custom attribute
    var.tags.default,    # Otherwise try .default
    { default = true }   # Last resort fallback
  )
}
```

## What try Does NOT Cover

`try` only catches *evaluation errors* - type errors, missing keys, null dereferences. It does not:
- Catch errors from provider API calls.
- Suppress validation errors from variable type constraints.
- Handle errors in `provisioner` or `connection` blocks.

## Comparing try vs lookup

For map key access specifically, `lookup` is often cleaner and more explicit:

```hcl
locals {
  # lookup is explicit about what it does
  value_from_lookup = lookup(var.config_map, "key", "default")

  # try is more general - works for any expression
  value_from_try = try(var.config_map["key"], "default")
}
```

Use `lookup` when you are specifically accessing a map key with a default. Use `try` for more complex expressions or when chaining multiple attribute accesses.

## Conclusion

The `try` function is OpenTofu's primary tool for writing resilient configurations that handle optional data gracefully. Use it to guard against missing map keys, null attribute access, and type conversion failures, making your configurations robust against varying input shapes.
