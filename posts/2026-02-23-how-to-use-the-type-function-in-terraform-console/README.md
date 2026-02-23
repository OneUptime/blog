# How to Use the type Function in Terraform Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Debugging

Description: Learn how to use the type function in the Terraform console to inspect value types, debug type mismatches, and understand Terraform's type system.

---

Terraform's type system can feel opaque. You write what looks like a simple map, but Terraform treats it as an object. A function returns something you expected to be a list but it is actually a tuple. Type errors in Terraform are notoriously confusing, and the `type` function in the Terraform console is your best tool for figuring out what is going on.

## What is the type Function?

The `type` function returns the type of a given value. It is only available in the Terraform console (started with `terraform console`), not in regular `.tf` files.

```hcl
> type("hello")
string

> type(42)
number

> type(true)
bool

> type(["a", "b", "c"])
tuple([
    string,
    string,
    string,
])
```

## Starting the Terraform Console

To use `type`, first start the console:

```bash
# Start the console in a directory with Terraform files
terraform console

# Or start it with a specific state file
terraform console -state=terraform.tfstate

# Or with a variable file
terraform console -var-file="production.tfvars"
```

Once inside, you can evaluate expressions including the `type` function.

## Primitive Types

```hcl
> type("hello world")
string

> type(42)
number

> type(3.14)
number

> type(true)
bool

> type(null)
dynamic  # null has no specific type
```

## Collection Types

This is where `type` gets really useful. Terraform distinguishes between several collection types:

### Lists vs Tuples

```hcl
# A literal sequence is a tuple (elements can have different types)
> type(["a", "b", "c"])
tuple([
    string,
    string,
    string,
])

# After conversion, it becomes a proper list
> type(tolist(["a", "b", "c"]))
list(string)

# Mixed types create a tuple
> type(["hello", 42, true])
tuple([
    string,
    number,
    bool,
])
```

### Maps vs Objects

```hcl
# A literal map expression is actually an object
> type({ name = "web", port = "8080" })
object({
    name: string,
    port: string,
})

# After conversion, it becomes a proper map
> type(tomap({ name = "web", port = "8080" }))
map(string)

# Mixed value types create an object, not a map
> type({ name = "web", port = 8080 })
object({
    name: string,
    port: number,
})
```

This distinction between objects and maps is one of the most confusing parts of Terraform's type system, and `type` makes it clear.

### Sets

```hcl
> type(toset(["a", "b", "c"]))
set(string)

> type(toset([1, 2, 3]))
set(number)
```

## Debugging Type Mismatches

When you get a type error, `type` helps you understand what Terraform actually sees:

```hcl
# Scenario: you get an error saying "expected map(string) but got object"
# Check what type your value actually is:

> type({ env = "prod", count = 3 })
object({
    count: number,
    env: string,
})

# The problem is clear - "count" is a number, not a string
# Fix it:
> type({ env = "prod", count = "3" })
object({
    count: string,
    env: string,
})

# Now convert to map:
> type(tomap({ env = "prod", count = "3" }))
map(string)
```

## Inspecting Variable Types

You can check the effective type of your variables:

```hcl
# Assuming you have: variable "tags" { type = map(string) }
> type(var.tags)
map(string)

# Assuming you have: variable "ports" { type = list(number) }
> type(var.ports)
list(number)

# Checking what type "any" resolves to
# variable "flexible" { type = any, default = ["a", "b"] }
> type(var.flexible)
tuple([
    string,
    string,
])
```

## Understanding Function Return Types

Use `type` to understand what functions actually return:

```hcl
# What does keys() return?
> type(keys({ a = 1, b = 2 }))
list(string)

# What does values() return?
> type(values({ a = 1, b = 2 }))
list(number)

# What does merge() return?
> type(merge({ a = "1" }, { b = "2" }))
object({
    a: string,
    b: string,
})

# What does setunion() return?
> type(setunion(["a", "b"], ["c"]))
set(string)

# What does zipmap() return?
> type(zipmap(["a", "b"], [1, 2]))
map(number)

# What does concat() return?
> type(concat(["a"], ["b"]))
tuple([
    string,
    string,
])
```

## Inspecting Complex Structures

For nested data structures, `type` shows the full type tree:

```hcl
> type({
    servers = [
      { name = "web", port = 80 },
      { name = "api", port = 8080 }
    ]
    enabled = true
  })
object({
    enabled: bool,
    servers: tuple([
        object({
            name: string,
            port: number,
        }),
        object({
            name: string,
            port: number,
        }),
    ]),
})
```

## Checking Resource and Data Source Types

In the console, you can inspect the types of existing resources:

```hcl
# Check the type of a resource attribute
> type(aws_instance.web.id)
string

> type(aws_instance.web.tags)
map(string)

# Check a for_each resource
> type(aws_s3_bucket.main)
map(object({
    # ... shows all attributes and their types
}))
```

## Practical Debugging Workflow

Here is a workflow for debugging type errors:

1. Get a type error in `terraform plan`
2. Start `terraform console`
3. Reproduce the expression and check its type
4. Identify the mismatch
5. Fix and verify

```hcl
# Step 1: Error says "expected list(string), got tuple"

# Step 2-3: In console
> type(var.my_variable)
tuple([
    string,
    string,
])

# Step 4: It is a tuple, not a list
# Step 5: Fix with tolist()
> type(tolist(var.my_variable))
list(string)
```

## Type Constraints and Conversions

Use `type` to verify that conversions work correctly:

```hcl
# Check if tonumber gives you what you expect
> type(tonumber("42"))
number

# Verify tolist conversion
> type(tolist(toset(["a", "b"])))
list(string)

# Check jsonencode output
> type(jsonencode({ a = 1 }))
string

# Check jsondecode output
> type(jsondecode("{\"a\": 1}"))
object({
    a: number,
})
```

## Understanding for Expression Types

```hcl
# for expression creating a list (tuple)
> type([for x in ["a", "b", "c"] : upper(x)])
tuple([
    string,
    string,
    string,
])

# for expression creating a map (object)
> type({ for x in ["a", "b", "c"] : x => upper(x) })
object({
    a: string,
    b: string,
    c: string,
})
```

## Checking Module Output Types

```hcl
# Inspect what a module returns
> type(module.vpc.private_subnet_ids)
list(string)

> type(module.vpc.vpc_id)
string

> type(module.vpc)
object({
    # all outputs with their types
})
```

## The Difference Between type and typeof

In HCL, `type` is the console function. There is no `typeof` function. If you try to use `type` in a `.tf` file, you will get an error:

```hcl
# This does NOT work in .tf files
# locals {
#   my_type = type(var.something)  # Error!
# }

# type is console-only
```

For runtime type checking in `.tf` files, use `can` with type conversion functions:

```hcl
locals {
  is_string = can(tostring(var.input))
  is_number = can(tonumber(var.input))
  is_list   = can(tolist(var.input))
}
```

## Tips for Using the Console

```bash
# You can pipe expressions to the console
echo 'type(["a", "b"])' | terraform console

# Use it in scripts for type checking during CI
echo 'type(var.config)' | terraform console -var-file=prod.tfvars
```

## Summary

The `type` function is an invaluable debugging tool available in the Terraform console. Use it to understand the difference between tuples and lists, objects and maps, and to diagnose type mismatch errors. It is particularly helpful when you are working with complex nested data structures, understanding function return types, or figuring out why a type conversion is failing. While it is only available in the console (not in `.tf` files), it is the fastest way to understand what is happening under the hood of Terraform's type system. For related debugging techniques, check out the [try function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-try-function-in-terraform-for-safe-access/view) and the [can function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-can-function-in-terraform-for-error-handling/view).
