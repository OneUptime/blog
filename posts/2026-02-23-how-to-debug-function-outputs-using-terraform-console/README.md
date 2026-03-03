# How to Debug Function Outputs Using terraform console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Debugging, Functions, HCL, DevOps, terraform console

Description: Learn how to use terraform console to interactively test and debug Terraform function outputs, expressions, and data transformations before applying them.

---

When your Terraform function calls are not producing the results you expect, staring at `terraform plan` output is not the most efficient debugging strategy. The `terraform console` command gives you an interactive REPL where you can test expressions, experiment with functions, and inspect your configuration's data in real time. It is the fastest way to understand what your functions are actually doing.

This guide covers everything you need to know about using `terraform console` effectively for debugging function behavior.

## Getting Started with terraform console

The basic usage is simple. Navigate to a directory containing Terraform configuration and run:

```bash
# Start the interactive console
terraform console
```

You will get a prompt where you can type any Terraform expression and see the result immediately:

```text
> 1 + 2
3
> upper("hello")
"HELLO"
> length(["a", "b", "c"])
3
```

To exit, type `exit` or press Ctrl+D.

## Testing Functions in Isolation

Before using a function in your configuration, test it in the console to make sure it behaves the way you think it does:

```text
# Test string functions
> split(",", "web,api,worker")
tolist([
  "web",
  "api",
  "worker",
])

# Test trimming
> trimspace("  hello world  ")
"hello world"

# Test regex
> regex("^([a-z]+)-([0-9]+)$", "server-42")
[
  "server",
  "42",
]

# Test format
> format("arn:aws:s3:::%s/%s/*", "my-bucket", "logs")
"arn:aws:s3:::my-bucket/logs/*"
```

This is especially useful for functions where the behavior is not immediately obvious, like `regex`, `cidrsubnet`, or `templatestring`.

## Inspecting Variables and Locals

The console has access to your entire Terraform configuration, including variables, locals, data sources (if already fetched), and resources (if state exists). This means you can inspect intermediate values:

```text
# Check what a variable resolves to
> var.environment
"staging"

# Inspect a local value
> local.subnet_cidrs
[
  "10.0.1.0/24",
  "10.0.2.0/24",
  "10.0.3.0/24",
]

# Check a computed map
> local.tags
{
  "environment" = "staging"
  "managed_by"  = "terraform"
  "team"        = "platform"
}
```

If you have state, you can also inspect resource attributes:

```text
# Check an attribute from existing state
> aws_vpc.main.id
"vpc-0abc123def456"

> aws_subnet.public[0].cidr_block
"10.0.1.0/24"
```

## Debugging Complex Expressions Step by Step

When a complex function chain is not working, break it down and evaluate each step:

```text
# Suppose this full expression is giving unexpected results:
# join("-", [for s in split(".", var.hostname) : lower(s)])

# Step 1: Check the input
> var.hostname
"API.Example.COM"

# Step 2: Test the split
> split(".", var.hostname)
tolist([
  "API",
  "Example",
  "COM",
])

# Step 3: Test the for expression with lower
> [for s in split(".", var.hostname) : lower(s)]
[
  "api",
  "example",
  "com",
]

# Step 4: Test the full chain
> join("-", [for s in split(".", var.hostname) : lower(s)])
"api-example-com"
```

By evaluating each step, you can pinpoint exactly where the transformation goes wrong.

## Testing CIDR Functions

Network CIDR calculations are notoriously hard to get right by guessing. The console is invaluable here:

```text
# Test cidrsubnet calculations
> cidrsubnet("10.0.0.0/16", 8, 0)
"10.0.0.0/24"

> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"

> cidrsubnet("10.0.0.0/16", 8, 255)
"10.0.255.0/24"

# Test cidrhost - get a specific host IP in a subnet
> cidrhost("10.0.1.0/24", 10)
"10.0.1.10"

# Test cidrnetmask
> cidrnetmask("10.0.0.0/16")
"255.255.0.0"

# Check if an address is within a CIDR range
> cidrcontains("10.0.0.0/16", "10.0.5.100")
true

> cidrcontains("10.0.0.0/16", "10.1.0.1")
false
```

## Working with JSON and YAML

When you are dealing with encoded data, the console helps you see what the decoded structure looks like:

```text
# Test JSON decoding
> jsondecode("{\"name\": \"web\", \"port\": 8080}")
{
  "name" = "web"
  "port" = 8080
}

# Test YAML decoding
> yamldecode("name: web\nport: 8080\ntags:\n  - api\n  - public")
{
  "name" = "web"
  "port" = 8080
  "tags" = [
    "api",
    "public",
  ]
}

# Test encoding to see what the output format looks like
> jsonencode({ name = "web", ports = [80, 443] })
"{\"name\":\"web\",\"ports\":[80,443]}"
```

## Testing Type Conversions

Type mismatches are one of the most common Terraform errors. Use the console to understand how Terraform handles type conversions:

```text
# String to number
> tonumber("42")
42

# Number to string
> tostring(42)
"42"

# String to bool
> tobool("true")
true

# Convert a list to a set (removes duplicates)
> toset(["a", "b", "a", "c"])
toset([
  "a",
  "b",
  "c",
])

# Check what type something is
> type(42)
number

> type(["a", "b"])
tuple
```

## Using the Console with Plan Files

You can pass a saved plan file to `terraform console` to evaluate expressions against the planned state:

```bash
# First, save a plan
terraform plan -out=tfplan

# Then open the console with the plan
terraform console -plan=tfplan
```

This lets you inspect what values resources will have after the plan is applied, including computed attributes that are only available at plan time.

## Evaluating Conditional Logic

Before writing complex conditional expressions, test them:

```text
# Test conditional (ternary) expressions
> var.environment == "prod" ? 3 : 1
1

# Test coalesce - returns the first non-null, non-empty value
> coalesce("", "", "default")
"default"

> coalesce(null, null, "fallback")
"fallback"

# Test try - returns the first expression that does not error
> try(jsondecode("invalid json"), "parse failed")
"parse failed"

> try(jsondecode("{\"valid\": true}"), "parse failed")
{
  "valid" = true
}

# Test lookup with defaults
> lookup({a = 1, b = 2}, "c", 0)
0
```

## Testing for_each and count Logic

Before using expressions in `for_each` or `count`, verify they produce the right structure:

```text
# Test a for expression that will feed into for_each
> { for name, config in var.services : name => config if config.enabled }
{
  "api" = {
    "enabled" = true
    "port"    = 8080
  }
  "web" = {
    "enabled" = true
    "port"    = 80
  }
}

# Test a count expression
> length(var.availability_zones)
3

# Test a complex for_each key
> { for idx, az in var.availability_zones : "${var.environment}-${az}" => az }
{
  "staging-us-east-1a" = "us-east-1a"
  "staging-us-east-1b" = "us-east-1b"
  "staging-us-east-1c" = "us-east-1c"
}
```

## Non-Interactive Mode

You can also use `terraform console` in non-interactive mode by piping expressions to it. This is useful for scripts:

```bash
# Evaluate a single expression
echo 'local.tags' | terraform console

# Evaluate multiple expressions
echo -e 'var.environment\nlocal.vpc_cidr\nlength(var.subnets)' | terraform console

# Use it in a script to extract a value
BUCKET_NAME=$(echo 'local.state_bucket_name' | terraform console | tr -d '"')
echo "State bucket: $BUCKET_NAME"
```

## Debugging with Output Blocks

Sometimes you want to see a value during every plan, not just in the console. Temporary output blocks are a good complement:

```hcl
# Add temporary outputs for debugging
output "debug_subnet_map" {
  value = local.subnet_map
}

output "debug_container_defs" {
  value = jsondecode(local.container_definitions)
}

# Remember to remove these before merging your code
```

Run `terraform plan` and the output section will show you the values. But for quick, iterative debugging, `terraform console` is still faster since you do not need to run a full plan each time.

## Common Debugging Scenarios

Here are some typical issues and how to investigate them in the console.

**"Invalid index" error:** Check the length of your list and the index you are using:

```text
> length(var.subnets)
2
> var.subnets[2]
# Error: index 2 is out of range for list of length 2
```

**"Invalid value for input variable" error:** Check the actual type of your variable:

```text
> var.instance_config
{
  "size" = "large"
  "count" = "3"  # Oops, this is a string, not a number
}
```

**Unexpected merge behavior:** Step through the merge:

```text
> var.default_tags
{ "env" = "prod", "team" = "ops" }
> var.custom_tags
{ "team" = "dev", "app" = "web" }
> merge(var.default_tags, var.custom_tags)
{ "app" = "web", "env" = "prod", "team" = "dev" }
# The "team" key from custom_tags overwrites the default
```

## Summary

The `terraform console` is one of the most underused tools in the Terraform workflow. It lets you test functions, inspect state, debug expressions, and validate logic without running a full plan-apply cycle. Make it a habit to open the console whenever you are writing complex expressions or debugging unexpected behavior. The feedback loop is orders of magnitude faster than modifying your code, running `terraform plan`, reading the error, and repeating.

For more on function techniques, see [How to Combine Multiple Functions for Complex Transformations](https://oneuptime.com/blog/post/2026-02-23-how-to-combine-multiple-functions-for-complex-transformations/view) and [How to Choose the Right Terraform Function for Your Use Case](https://oneuptime.com/blog/post/2026-02-23-how-to-choose-the-right-terraform-function-for-your-use-case/view).
