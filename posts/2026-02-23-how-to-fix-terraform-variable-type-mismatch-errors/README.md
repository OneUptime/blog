# How to Fix Terraform Variable Type Mismatch Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Variables

Description: Fix Terraform variable type mismatch errors by understanding type constraints, conversion rules, and common pitfalls with complex types.

---

Terraform is a statically-typed language when it comes to variables. Every variable has a type, and when you pass a value that does not match the expected type, Terraform refuses to proceed. These type mismatch errors are among the most frequent issues people run into, especially when working with complex types like maps, objects, and lists.

## The Error

Here is what a typical type mismatch error looks like:

```text
Error: Invalid value for variable

  on main.tf line 5, in module "web":
   5:   instance_type = var.instance_config

The given value is not valid for variable "instance_type": a string is
required.
```

Or with complex types:

```text
Error: Invalid value for variable

  on main.tf line 10, in module "network":
  10:   subnets = var.subnet_config

The given value is not valid for variable "subnets": element "cidr": string
required.
```

## Understanding Terraform Types

Before diving into fixes, here is a quick refresher on the type system:

**Primitive types:**
- `string` - text like `"hello"`
- `number` - numeric values like `42` or `3.14`
- `bool` - `true` or `false`

**Collection types:**
- `list(type)` - ordered sequence like `["a", "b", "c"]`
- `map(type)` - key-value pairs like `{ key = "value" }`
- `set(type)` - unordered unique values

**Structural types:**
- `object({...})` - a fixed structure with named attributes
- `tuple([...])` - a fixed-length sequence with typed elements

## Fix 1: String vs Number Confusion

This is the most basic mismatch. Terraform does some automatic type conversion, but not always.

```hcl
variable "port" {
  type = number
}

# In terraform.tfvars
port = "8080"  # This is a string, but Terraform will auto-convert it

# However, this fails in some contexts
port = "not-a-number"  # Cannot convert to number
```

Terraform automatically converts strings to numbers when possible. But if you are passing values through environment variables, everything comes in as a string:

```bash
# Environment variables are always strings
export TF_VAR_port=8080
# Terraform handles this conversion for simple types
```

The problem gets worse with booleans:

```hcl
variable "enable_logging" {
  type = bool
}

# These work
enable_logging = true
enable_logging = "true"

# This does NOT work
enable_logging = "yes"  # Terraform does not convert "yes" to true
```

## Fix 2: List vs Single Value

A common mistake is passing a single value where a list is expected, or vice versa:

```hcl
variable "security_group_ids" {
  type = list(string)
}

# Wrong - passing a single string
security_group_ids = "sg-12345"

# Right - wrap it in a list
security_group_ids = ["sg-12345"]
```

Going the other direction:

```hcl
variable "ami_id" {
  type = string
}

# Wrong - passing a list
ami_id = ["ami-12345"]

# Right - just the string
ami_id = "ami-12345"

# Or if you are getting it from a list, index into it
ami_id = var.ami_list[0]
```

## Fix 3: Map vs Object Type Mismatch

This trips people up constantly. Maps and objects look similar but behave differently.

```hcl
# A map requires all values to be the same type
variable "tags" {
  type = map(string)
}

# This works - all values are strings
tags = {
  Name        = "web-server"
  Environment = "production"
}

# This FAILS - mixed types
tags = {
  Name  = "web-server"
  Count = 3  # number, not string
}
```

If you need mixed types, use an object:

```hcl
variable "config" {
  type = object({
    name  = string
    count = number
  })
}

config = {
  name  = "web-server"
  count = 3
}
```

## Fix 4: Object Type Missing or Extra Attributes

When using object types, every attribute in the type definition must be provided unless it has a default:

```hcl
variable "server_config" {
  type = object({
    name          = string
    instance_type = string
    ami           = string
  })
}

# This FAILS - missing "ami" attribute
server_config = {
  name          = "web"
  instance_type = "t3.micro"
}
```

Fix by providing all required attributes, or use `optional()` for attributes that might not always be present:

```hcl
variable "server_config" {
  type = object({
    name          = string
    instance_type = string
    ami           = optional(string, "ami-0c55b159cbfafe1f0")
  })
}

# Now this works - ami gets the default value
server_config = {
  name          = "web"
  instance_type = "t3.micro"
}
```

Extra attributes that are not in the type definition are silently dropped by default. If you want to be strict about it, that is just how Terraform handles it.

## Fix 5: Nested Type Mismatches

Complex nested types are where things get really tricky:

```hcl
variable "subnets" {
  type = list(object({
    cidr = string
    az   = string
    tags = map(string)
  }))
}

# This fails because tags has a number value
subnets = [
  {
    cidr = "10.0.1.0/24"
    az   = "us-east-1a"
    tags = {
      Name  = "subnet-1"
      Index = 1  # Should be "1" (string)
    }
  }
]
```

Fix nested issues one level at a time. Read the error message carefully because Terraform usually tells you exactly which nested attribute has the wrong type.

## Fix 6: Type Conversion Functions

Sometimes you need to explicitly convert types. Terraform provides several functions for this:

```hcl
# Convert number to string
resource "aws_instance" "web" {
  tags = {
    Port = tostring(var.port)
  }
}

# Convert string to number
locals {
  port_number = tonumber(var.port_string)
}

# Convert to list
locals {
  id_list = tolist(var.id_set)
}

# Convert to set
locals {
  unique_ids = toset(var.id_list)
}

# Convert to map
locals {
  tag_map = tomap(var.tags)
}
```

The `try()` function is also useful when dealing with potentially mismatched types:

```hcl
locals {
  port = try(tonumber(var.port), 8080)
  # Falls back to 8080 if conversion fails
}
```

## Fix 7: tfvars File Type Issues

Your `.tfvars` files must match the variable type definitions. Common issues:

```hcl
# variables.tf
variable "allowed_cidrs" {
  type = list(string)
}

# terraform.tfvars - Wrong
allowed_cidrs = "10.0.0.0/16"

# terraform.tfvars - Right
allowed_cidrs = ["10.0.0.0/16"]
```

When using `-var` on the command line, complex types need careful quoting:

```bash
# Simple string
terraform plan -var="name=web-server"

# List - use HCL syntax
terraform plan -var='allowed_cidrs=["10.0.0.0/16","172.16.0.0/12"]'

# Map
terraform plan -var='tags={"Name":"web","Env":"prod"}'
```

## Fix 8: any Type and Its Limitations

Using `type = any` skips type checking, but it does not mean "accepts anything" in all contexts:

```hcl
variable "config" {
  type = any
}

# This accepts any type, but downstream usage might still fail
resource "aws_instance" "web" {
  instance_type = var.config  # Fails if config is a list
}
```

Avoid `any` when possible. It just moves the type error from variable assignment to resource usage, making it harder to debug.

## Debugging Type Mismatches

Use `terraform console` to inspect types interactively:

```bash
terraform console

> type(var.subnets)
list(object({
  az   = string
  cidr = string
}))

> var.subnets[0].cidr
"10.0.1.0/24"
```

You can also use the `type()` function in locals for debugging:

```hcl
output "debug_type" {
  value = type(var.config)
}
```

## Best Practices

1. **Always define explicit types** - Never leave the `type` argument off a variable declaration. It catches errors early.

2. **Use optional() for flexible objects** - This avoids forcing callers to provide every attribute.

3. **Validate with validation blocks** - Add custom validation to catch errors with better messages:

```hcl
variable "instance_type" {
  type = string
  validation {
    condition     = can(regex("^t[23]\\.", var.instance_type))
    error_message = "Instance type must be a t2 or t3 type."
  }
}
```

4. **Document expected types** - Use the `description` argument to explain what format the variable expects.

5. **Use type conversion early** - Convert types at the point of input rather than scattering `tostring()` calls throughout your code.

## Conclusion

Type mismatch errors in Terraform boil down to a disconnect between what a variable expects and what it receives. The fix is always the same pattern: check the type definition, check what you are passing, and either change the value to match the type or change the type to match the value. For complex types, work through the error message carefully because Terraform tells you exactly which attribute at which nesting level is wrong.
