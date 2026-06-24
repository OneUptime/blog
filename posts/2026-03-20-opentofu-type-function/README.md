# How to Use the type Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the type function in OpenTofu to determine the type of a value for debugging and type-aware configuration logic.

## Introduction

The `type` function in OpenTofu displays OpenTofu's evaluation of a given value's type. It is a special function which is **only available in the `tofu console` command** and cannot be used in regular configuration files (such as `output`, `locals`, or `variable` blocks). It is intended purely as a debugging and introspection tool.

## Syntax

```hcl
type(value)
```

- Displays a representation of the value's type
- Only available inside `tofu console`
- Should not be used in more complex expressions

## Basic Examples

Because `type` is console-only, all examples are run inside `tofu console`:

```bash
tofu console

> type("hello")
string

> type(42)
number

> type(true)
bool

> type(["a", "b"])
tuple([
  string,
  string,
])

> type({a = 1})
object({
  a: number,
})

> type(null)
dynamic
```

## Practical Use Cases

### Debugging Variable Types

The `type` function is used interactively in `tofu console`:

```bash
tofu console

> type(var.my_variable)
string

> type(local.computed_value)
list of string

> type(aws_instance.app.tags)
map of string
```

### Understanding Expression Results

Given the following configuration:

```hcl
locals {
  my_list = [1, 2, 3]
  my_set  = toset([1, 2, 3])
}
```

You can inspect the inferred types in `tofu console`:

```bash
> type(local.my_list)
tuple([
  number,
  number,
  number,
])
> type(local.my_set)
set of number
```

### Inspecting a Flexible Input

For a variable typed as `any`, you can inspect what concrete type was supplied:

```hcl
variable "flexible_input" {
  type = any
}
```

Then in `tofu console`:

```bash
> type(var.flexible_input)
object({
  name: string,
  count: number,
})
```

## Type Names Reference

| Value | Reported Type |
|-------|---------------|
| `"hello"` | `string` |
| `42` | `number` |
| `true` | `bool` |
| `null` | `dynamic` |
| `["a", "b"]` | `tuple([string, string])` |
| `tolist(["a"])` | `list of string` |
| `{a = 1}` | `object({ a: number })` |
| `tomap({a = "x"})` | `map of string` |
| `toset(["a"])` | `set of string` |

## Step-by-Step Usage

The most effective use of `type` is in `tofu console` during development:

```bash
# Start the interactive console
tofu console

# Check types of various expressions
> type(var.instance_type)
string
> type(var.subnet_ids)
list of string
> type(local.config)
object({
  region: string,
  size: number,
})
```

## Limitations

The `type` function is only available inside `tofu console`. It cannot be referenced from `output`, `locals`, `variable`, or any other regular configuration block, and it cannot be used to drive conditional logic. Use it only for debugging and documentation purposes during development.

## Conclusion

The `type` function in OpenTofu is a console-only debugging aid for understanding what types your expressions and variables produce. Use it in `tofu console` during development to diagnose type mismatches and understand the structure of complex computed values. It cannot be used in regular configuration and is not intended for runtime conditional logic.
