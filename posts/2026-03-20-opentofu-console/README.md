# How to Use tofu console for Expression Evaluation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu console to interactively evaluate OpenTofu expressions, test functions, and inspect state values.

## Introduction

`tofu console` opens an interactive REPL (Read-Eval-Print Loop) for evaluating OpenTofu expressions. It loads the current configuration and state, allowing you to test functions, inspect resource attributes, and experiment with expressions before using them in your configuration files.

## Starting the Console

```bash
tofu console

# Output:

# >
```

Type expressions at the `>` prompt and press Enter to evaluate them. Type `exit` or press Ctrl+D to quit.

## Evaluating Functions

```bash
> upper("hello world")
"HELLO WORLD"

> join(", ", ["one", "two", "three"])
"one, two, three"

> length(["a", "b", "c"])
3

> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"
```

## Inspecting State Values

```bash
# Access resource attributes from state
> aws_s3_bucket.data.bucket
"acme-data-production"

> aws_eks_cluster.main.endpoint
"https://ABCDEF.gr7.us-east-1.eks.amazonaws.com"

> aws_instance.web.private_ip
"10.0.1.42"
```

## Testing Complex Expressions

```bash
# Test expressions before putting them in configuration
> { for k, v in var.tags : k => upper(v) }
{
  "env" = "PRODUCTION"
  "team" = "PLATFORM"
}

> [for i in range(3) : "subnet-${i}"]
[
  "subnet-0",
  "subnet-1",
  "subnet-2",
]
```

## Working with Variables

```bash
> var.environment
"production"

> var.instance_count
3

> local.config
{
  "instance_type" = "t3.large"
  "min_capacity" = 3
}
```

## Testing Conditionals and Lookups

```bash
# Test ternary expressions
> var.environment == "production" ? "t3.large" : "t3.micro"
"t3.large"

# Test lookup with defaults
> lookup({"a" = 1, "b" = 2}, "c", 0)
0

# Test try() for error handling
> try(1 / 0, "division failed")
"division failed"
```

## Non-Interactive Mode

```bash
# Evaluate a single expression and exit
echo 'upper("hello")' | tofu console
# "HELLO"

# Useful in scripts
CIDR=$(echo 'cidrsubnet("10.0.0.0/16", 8, 5)' | tofu console | tr -d '"')
echo "Subnet CIDR: $CIDR"
```

## Testing JSON and YAML Functions

```bash
> jsonencode({"key" = "value", "count" = 3})
"{\"count\":3,\"key\":\"value\"}"

> yamldecode("name: acme\ncount: 5")
{
  "count" = 5
  "name" = "acme"
}
```

## Inspecting Data Sources

```bash
> data.aws_ami.ubuntu.id
"ami-0c02fb55956c7d316"

> data.aws_vpc.main.cidr_block
"10.0.0.0/16"
```

## Practical Use Cases

```bash
# Verify a complex CIDR calculation before applying
> cidrsubnets("10.0.0.0/16", 4, 4, 4, 4)
[
  "10.0.0.0/20",
  "10.0.16.0/20",
  "10.0.32.0/20",
  "10.0.48.0/20",
]

# Check resource count calculation
> length(var.availability_zones) * var.subnet_count
6
```

## Conclusion

`tofu console` is an invaluable tool for developing and debugging OpenTofu configurations. Use it to verify function behavior, test complex expressions, and inspect state values without writing a full plan. The non-interactive mode (piping expressions via stdin) is useful in scripts for extracting calculated values or testing expressions programmatically.
