# How to Use the any Type Constraint in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Types, Variables

Description: Learn when and how to use the any type constraint in Terraform variables, how it interacts with type inference, and when you should avoid it in favor of explicit types.

---

Terraform's type system is normally strict - you declare a variable as `string`, and Terraform rejects anything that is not a string. But sometimes you need flexibility. The `any` type constraint tells Terraform to accept whatever value is passed in and figure out the type at runtime.

Sounds convenient, but it comes with trade-offs. Let's look at how `any` actually works, where it is genuinely useful, and where it causes more problems than it solves.

## What any Actually Does

The `any` keyword is not a type. It is a placeholder that tells Terraform "determine the type from the value that is passed in." When Terraform encounters an `any` constraint, it inspects the actual value and infers the most specific type possible.

```hcl
variable "config" {
  type = any
}
```

With this definition:

```hcl
# Passing a string - Terraform infers type as string
config = "hello"

# Passing a number - Terraform infers type as number
config = 42

# Passing a list - Terraform infers type as list(string)
config = ["a", "b", "c"]

# Passing a map - Terraform infers type as map(string)
config = {
  key1 = "value1"
  key2 = "value2"
}

# Passing a complex structure - Terraform infers the full structure
config = {
  name = "web"
  port = 8080
  tags = ["api", "v2"]
}
# Inferred type: object({ name = string, port = number, tags = list(string) })
```

Once Terraform infers the type, it enforces it throughout the rest of the configuration. You cannot use a string-inferred value as a number without explicit conversion.

## any in Collection Types

The most common use of `any` is inside collection type constructors:

```hcl
# Accept a map where values can be anything
variable "tags" {
  type = map(any)
}

# Accept a list of anything
variable "items" {
  type = list(any)
}
```

There is an important nuance here: `map(any)` does not mean "a map where each value can be a different type." It means "a map where all values are the same type, but that type is inferred from the actual values."

```hcl
# This works - all values are strings
tags = {
  Name        = "web-server"
  Environment = "production"
}
# Inferred type: map(string)

# This also works - all values are numbers
ports = {
  http  = 80
  https = 443
}
# Inferred type: map(number)

# This does NOT work with map(any)
mixed = {
  name = "web"    # string
  port = 8080     # number
}
# Error: all values must be the same type
# Terraform tries to convert them all to one type
# In this case, it would convert 8080 to "8080" (all strings)
```

Wait, actually Terraform will try to find a common type. If it can convert all values to a single type, it will. Numbers convert to strings, so `map(any)` with mixed strings and numbers would result in `map(string)` with numbers converted to their string representation.

```hcl
variable "metadata" {
  type = map(any)
}

# Passing mixed types
metadata = {
  name  = "web"     # string
  port  = 8080      # number -> converts to "8080"
  debug = true      # bool -> converts to "true"
}
# All values become strings: map(string)
```

## When to Use any

### 1. Passing Through Configuration

When your module receives configuration that it passes directly to another module or resource without inspecting it:

```hcl
# A wrapper module that passes tags through
variable "extra_tags" {
  type        = map(any)
  default     = {}
  description = "Additional tags to apply to all resources"
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = merge(
    {
      Name      = var.name
      ManagedBy = "terraform"
    },
    var.extra_tags
  )
}
```

### 2. Generic Utility Modules

When building a module that works with different types of data:

```hcl
# A module that writes any configuration to SSM Parameter Store
variable "parameters" {
  type        = map(any)
  description = "Map of parameter names to values"
}

resource "aws_ssm_parameter" "params" {
  for_each = var.parameters

  name  = "/${var.prefix}/${each.key}"
  type  = "String"
  value = tostring(each.value)  # Convert any type to string
}
```

### 3. JSON and YAML Processing

When working with decoded JSON or YAML that has an unpredictable structure:

```hcl
variable "config_json" {
  type        = string
  description = "JSON configuration string"
}

locals {
  # jsondecode returns a value with unknown structure
  # Using any would be appropriate if this were a variable type
  config = jsondecode(var.config_json)
}
```

### 4. Terraform Module Outputs

Module outputs sometimes use `any` when the output type depends on input:

```hcl
output "config" {
  value       = local.computed_config
  description = "The computed configuration"
  # No explicit type needed for outputs, but the value can be any type
}
```

## When NOT to Use any

### 1. When You Know the Structure

If you know what the data looks like, define it explicitly:

```hcl
# BAD - loses all type safety
variable "server_config" {
  type = any
}

# GOOD - Terraform validates the structure
variable "server_config" {
  type = object({
    name          = string
    instance_type = string
    port          = number
    monitoring    = bool
  })
}
```

### 2. Module Public Interfaces

When other teams consume your module, explicit types serve as documentation and validation:

```hcl
# BAD - users have no idea what to pass
variable "database_settings" {
  type        = any
  description = "Database configuration"
}

# GOOD - self-documenting interface
variable "database_settings" {
  type = object({
    engine            = string
    instance_class    = string
    allocated_storage = number
    multi_az          = optional(bool, false)
  })
  description = "Database configuration"
}
```

### 3. When Type Errors Should Be Caught Early

With `any`, type mismatches are discovered at apply time rather than plan time. Explicit types catch them during validation:

```hcl
# With 'any', this typo would not be caught until apply
# variable "port" { type = any }
# port = "eighty"  # No error at plan time

# With 'number', the error is caught immediately
variable "port" {
  type = number
}
# port = "eighty"  # Error: a number is required
```

## any vs. Specific Types: A Comparison

```hcl
# 1. Fully typed - maximum safety, full validation
variable "server" {
  type = object({
    name = string
    port = number
  })
}

# 2. Partially typed with any - collection with flexible values
variable "settings" {
  type = map(any)
  # All values must be the same type, but that type is flexible
}

# 3. Fully any - no type checking at all
variable "config" {
  type = any
  # Accepts literally anything
}
```

The trade-off is always between flexibility and safety. Move toward explicit types when you can, use `any` when you genuinely need flexibility.

## any with Default Values

You can combine `any` with default values. Terraform infers the type from the default:

```hcl
variable "settings" {
  type = any
  default = {
    timeout     = 30
    retries     = 3
    debug       = false
  }
  # Inferred type from default: object({ timeout = number, retries = number, debug = bool })
}
```

But here is the catch: if someone overrides this variable with a value of a different structure, Terraform accepts it because the constraint is `any`. The default's type does not constrain overrides.

## Practical Example: Dynamic Resource Tags

Here is a real-world pattern where `any` (specifically `map(any)`) is the right choice:

```hcl
variable "base_tags" {
  type = map(any)
  default = {
    ManagedBy = "terraform"
    Project   = "myapp"
  }
}

variable "environment_tags" {
  type    = map(any)
  default = {}
}

locals {
  # Merge base tags with environment-specific tags
  # Both are map(any) because tag values might be strings or numbers
  all_tags = merge(var.base_tags, var.environment_tags)
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  tags          = local.all_tags
}
```

## How any Interacts with Type Conversion

When `any` infers a type, Terraform still applies its normal type conversion rules:

```hcl
variable "mixed_list" {
  type = list(any)
}

# Passing a list with mixed types
# Terraform finds a common type
mixed_list = [1, 2, "3", 4]
# Terraform converts all to strings: ["1", "2", "3", "4"]

# If no common type exists, you get an error
# mixed_list = [1, "hello", true, [1,2]]  # Error: no common type
```

## Summary

The `any` type constraint tells Terraform to infer the type from the actual value rather than enforcing a specific type. Use it in `map(any)` and `list(any)` for pass-through configuration and generic modules. Avoid it for module interfaces and anywhere you know the expected structure. When in doubt, use explicit types - they catch errors earlier, serve as documentation, and make your code more maintainable. Reserve `any` for the cases where flexibility is genuinely more important than validation.
