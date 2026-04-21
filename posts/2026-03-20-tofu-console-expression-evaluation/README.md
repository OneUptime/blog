# How to Use tofu console for Expression Evaluation - Tofu Expression Evaluation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the tofu console interactive REPL to evaluate OpenTofu expressions, debug configurations, and explore state values.

## Introduction

`tofu console` opens an interactive REPL (Read-Eval-Print Loop) for evaluating OpenTofu expressions. It's invaluable for debugging complex expressions, exploring state values, testing functions, and understanding how your configuration evaluates before running a plan.

## Opening the Console

```bash
# Open the interactive console

tofu console

# Output:
# > (prompt appears - type expressions and press Enter)
```

Press `Ctrl+D` or `Ctrl+C` to exit.

## Basic Expression Evaluation

```bash
# Evaluate string interpolation
> "hello ${terraform.workspace}"
"hello default"

# Evaluate arithmetic
> 2 + 2
4

# Evaluate conditionals
> terraform.workspace == "production" ? "prod" : "non-prod"
"non-prod"
```

## Exploring State Values

```bash
# Access a resource attribute from state
> aws_vpc.main.id
"vpc-0a1b2c3d4e5f"

# Access a list resource
> aws_subnet.public[0].id
"subnet-0a1b2c3d"

# Explore all subnets
> aws_subnet.public[*].id
[
  "subnet-0a1b2c3d",
  "subnet-0e1f2a3b",
]

# Access output values
> module.networking.vpc_id
"vpc-0a1b2c3d4e5f"
```

## Testing Functions

```bash
# String functions
> upper("hello world")
"HELLO WORLD"

> replace("hello-world", "-", "_")
"hello_world"

> join(", ", ["a", "b", "c"])
"a, b, c"

> split(",", "a,b,c")
tolist([
  "a",
  "b",
  "c",
])

# Number functions
> max(1, 5, 3, 9, 2)
9

> ceil(1.5)
2

# Type conversion
> tostring(42)
"42"

> tonumber("42")
42

# Collection functions
> length(["a", "b", "c"])
3

> contains(["a", "b", "c"], "b")
true

> keys({a = 1, b = 2})
[
  "a",
  "b",
]
```

## Debugging Complex Expressions

```bash
# Test a complex expression before putting it in configuration
> {
  for idx, subnet in ["subnet-a", "subnet-b", "subnet-c"] :
  idx => subnet
}
{
  "0" = "subnet-a"
  "1" = "subnet-b"
  "2" = "subnet-c"
}

# Test a conditional lookup
> lookup({"prod": "large", "dev": "small"}, "prod", "medium")
"large"

# Test a complex CIDR calculation
> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"
```

## Using Variables in Console

Variables are available in the console if they have default values or are supplied with variable assignment options such as `-var` or `-var-file`:

```hcl
# variables.tf
variable "environment" {
  type    = string
  default = "development"
}
```

```bash
tofu console

> var.environment
"development"

> "app-${var.environment}"
"app-development"
```

## Exploring Local Values

```hcl
# locals.tf
locals {
  tags = {
    Environment = terraform.workspace
    ManagedBy   = "OpenTofu"
  }
}
```

```bash
> local.tags
{
  "Environment" = "default"
  "ManagedBy" = "OpenTofu"
}

> jsonencode(local.tags)
"{\"Environment\":\"default\",\"ManagedBy\":\"OpenTofu\"}"
```

## Non-Interactive Mode

```bash
# Evaluate a single expression without entering the REPL
echo 'cidrsubnet("10.0.0.0/8", 8, 3)' | tofu console
# "10.0.3.0/16"

# Pipe multiple expressions
cat << 'EOF' | tofu console
upper("hello")
length([1, 2, 3])
EOF
# "HELLO"
# 3
```

## Useful console Patterns

```bash
# Debug a for expression
> [for s in aws_subnet.private : s.id]

# Understand a complex merge
> merge({"a": 1}, {"b": 2, "a": 3})
{
  "a" = 3
  "b" = 2
}

# Test regex
> can(regex("^[a-z]+$", "hello"))
true

> can(regex("^[a-z]+$", "Hello123"))
false

# Test try()
> try(tonumber("not-a-number"), "default-value")
"default-value"
```

## Conclusion

`tofu console` is an underutilized but powerful debugging tool. Use it to test function calls before writing them into configurations, explore current state values, validate complex expressions like `for`, `lookup`, and `merge`, and understand how your configuration evaluates. The non-interactive mode (`echo 'expr' | tofu console`) is useful for quick one-off expression evaluation from a shell, but the OpenTofu docs warn that `tofu console` is not designed for scripts.
