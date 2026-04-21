# How to Use the tofu console for Interactive Expression Testing (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu console, Debugging, HCL, Infrastructure as Code, DevOps

Description: A guide to using the OpenTofu interactive console to test expressions, functions, and inspect state values.

## Introduction

`tofu console` opens an interactive REPL (Read-Eval-Print Loop) that lets you evaluate HCL expressions against your current state and configuration. It's invaluable for testing complex expressions before putting them in your configuration, and for inspecting state values during development.

## Opening the Console

```bash
# Navigate to your project directory

cd /path/to/your/project

# Open the console (reads current state)
tofu console

# Expected prompt:
# > _
```

## Testing Basic Expressions

```hcl
# In the console:

# String joining
> join("", ["Hello, ", "OpenTofu!"])
"Hello, OpenTofu!"

# String interpolation
> "Version: ${1 + 2}"
"Version: 3"

# Arithmetic
> 10 * 3 + 5
35

# Boolean logic
> true && false
false

> true || false
true

# Conditional
> 5 > 3 ? "yes" : "no"
"yes"
```

## Testing Built-in Functions

```hcl
# String functions
> upper("hello world")
"HELLO WORLD"

> lower("HELLO")
"hello"

> length("opentofu")
8

> substr("opentofu", 0, 4)
"open"

> split(",", "a,b,c")
[
  "a",
  "b",
  "c",
]

> join("-", ["a", "b", "c"])
"a-b-c"

> trimspace("  hello  ")
"hello"

> replace("hello world", "world", "OpenTofu")
"hello OpenTofu"
```

## Testing Collection Functions

```hcl
# List operations
> length(["a", "b", "c"])
3

> contains(["a", "b", "c"], "b")
true

> index(["a", "b", "c"], "b")
1

> concat(["a", "b"], ["c", "d"])
["a", "b", "c", "d"]

> flatten([["a", "b"], ["c"]])
["a", "b", "c"]

> distinct(["a", "b", "a", "c"])
["a", "b", "c"]

# Map operations
> keys({a = 1, b = 2})
["a", "b"]

> values({a = 1, b = 2})
[1, 2]

> merge({a = 1}, {b = 2})
{
  "a" = 1
  "b" = 2
}
```

## Testing Encoding Functions

```hcl
# Base64 encoding
> base64encode("hello")
"aGVsbG8="

> base64decode("aGVsbG8=")
"hello"

# JSON encoding
> jsonencode({name = "opentofu", version = "1.9"})
"{\"name\":\"opentofu\",\"version\":\"1.9\"}"

> jsondecode("{\"key\":\"value\"}")
{
  "key" = "value"
}
```

## Inspecting Variables

```hcl
# If your config has variables, reference them in console
> var.environment
"development"

> var.instance_count
3

# Test expressions using variable values
> var.environment == "production" ? "use-prod-config" : "use-dev-config"
"use-dev-config"
```

## Inspecting State Values

```hcl
# After applying, inspect resource attributes
> aws_vpc.main.id
"vpc-0abc123"

> aws_vpc.main.cidr_block
"10.0.0.0/16"

# Inspect complex attributes
> aws_instance.web.tags
{
  "Environment" = "dev"
  "Name"        = "web-server"
}
```

## Testing For Expressions

```hcl
# Test for expressions before adding to config
> [for i in [1, 2, 3] : i * 2]
[2, 4, 6]

> {for k, v in {a = 1, b = 2} : k => v * 10}
{
  "a" = 10
  "b" = 20
}

# With filtering
> [for x in [1, 2, 3, 4, 5] : x if x > 2]
[3, 4, 5]
```

## Testing Type Conversion Functions

```hcl
> tostring(42)
"42"

> tonumber("42")
42

> tobool("true")
true

> tolist(["a", "b", "c"])
["a", "b", "c"]

> toset(["a", "b", "a"])
["a", "b"]
```

## Piping Input to the Console

```bash
# Evaluate an expression from stdin (not recommended for scripts)
echo 'upper("hello")' | tofu console

# Read expressions from a file through stdin
cat expressions.txt | tofu console
```

## Exiting the Console

```bash
# Exit by typing:
> exit

# Or press Ctrl+C or Ctrl+D
```

## Conclusion

The `tofu console` is an indispensable tool for developing and debugging OpenTofu configurations. Testing complex expressions interactively before embedding them in configuration files saves significant time and prevents subtle bugs. It's also invaluable for inspecting state values during troubleshooting sessions.
