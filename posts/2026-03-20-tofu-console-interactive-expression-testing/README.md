# How to Use the tofu console for Interactive Expression Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu console, HCL, Debugging, DevOps, Infrastructure as Code

Description: Learn how to use tofu console as an interactive REPL to test HCL expressions, explore state values, and debug your OpenTofu configurations.

---

`tofu console` opens an interactive REPL (Read-Eval-Print Loop) where you can evaluate HCL expressions against your current state and variables. It's invaluable for debugging complex expressions, testing functions, and exploring what values are available before using them in your configuration.

---

## Opening the Console

```bash
# Start the interactive console

tofu console

# The console prompt appears
# Type expressions and press Enter to evaluate them
>
```

---

## Basic Expression Testing

```hcl
# Test string operations
> "hello ${upper("world")}"
"hello WORLD"

# Test arithmetic
> 10 * 5 + 2
52

# Test conditionals (ternary)
> true ? "yes" : "no"
"yes"

# Test type conversions
> tostring(42)
"42"

> tonumber("3.14")
3.14
```

---

## Testing Built-in Functions

The console is the fastest way to experiment with OpenTofu's built-in functions:

```hcl
# String functions
> split(",", "a,b,c")
tolist(["a", "b", "c"])

> join("-", ["us", "east", "1"])
"us-east-1"

> format("Hello, %s! You are %d years old.", "Alice", 30)
"Hello, Alice! You are 30 years old."

> trimspace("  hello  ")
"hello"

> length("opentofu")
8

# Collection functions
> concat(["a", "b"], ["c", "d"])
tolist(["a", "b", "c", "d"])

> merge({a = 1}, {b = 2})
{
  "a" = 1
  "b" = 2
}

> keys({name = "Alice", age = 30})
tolist(["age", "name"])
```

---

## Exploring State Values

When run in a directory with existing state, the console can access resource attributes:

```hcl
# Access resource attributes
> aws_instance.web.public_ip
"54.23.45.67"

> aws_s3_bucket.data.bucket
"my-data-bucket"

# Access module outputs
> module.networking.vpc_id
"vpc-0abc123def456789"

# Use state values in expressions
> "https://${aws_lb.main.dns_name}/api"
"https://my-alb-123456789.us-east-1.elb.amazonaws.com/api"
```

---

## Testing Complex Expressions

```hcl
# Test for expressions
> [for i in range(5) : i * 2]
tolist([0, 2, 4, 6, 8])

# Test map transformations
> {for k, v in {a = 1, b = 2} : k => v * 10}
{
  "a" = 10
  "b" = 20
}

# Test conditional collection filtering
> [for x in [1, 2, 3, 4, 5] : x if x > 2]
tolist([3, 4, 5])
```

---

## Test Variables from Your Configuration

```hcl
# Access variable values
> var.region
"us-east-1"

> var.instance_count
3

# Test expressions using variables
> "instance-${var.environment}-${var.region}"
"instance-prod-us-east-1"
```

---

## Exit the Console

```bash
# Press Ctrl+C or Ctrl+D to exit
# Or type:
> exit
```

---

## Summary

`tofu console` is your sandbox for HCL expression development. Use it to test string interpolations before embedding them in resources, validate built-in function behavior, explore current state values, and debug complex `for` expressions. Opening the console in a directory with existing state gives you access to the resource attribute values currently saved in state.
