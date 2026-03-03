# How to Use the terraform console for Interactive Experimentation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, terraform console, REPL, Debugging, DevOps, Infrastructure as Code

Description: Learn how to use the terraform console interactive REPL to test expressions, debug variables, explore state, and experiment with Terraform functions.

---

When you are writing Terraform configurations, sometimes you need to test an expression before committing it to your code. Does that `join()` function work the way you think? What value does that complex conditional produce? What attributes does a resource actually have in the state?

`terraform console` is an interactive REPL (Read-Eval-Print Loop) that lets you evaluate Terraform expressions in real time against your current configuration and state. It is like having a scratchpad where you can experiment without modifying any files or infrastructure.

## Starting the Console

```bash
# Start the interactive console
terraform console
```

You see a `>` prompt where you can type expressions. Terraform evaluates each expression and prints the result:

```text
> 1 + 1
2
> "hello, world"
"hello, world"
>
```

Type `exit` or press Ctrl+D to leave the console.

## Prerequisites

Before using the console, initialize your project:

```bash
# Initialize the project
terraform init

# Start the console
terraform console
```

The console needs providers initialized to resolve resource types and data sources. If you have an existing state file, the console can also read resource attributes from it.

## Testing Functions

The console is perfect for learning and testing Terraform's built-in functions.

### String Functions

```text
> upper("hello")
"HELLO"

> lower("TERRAFORM")
"terraform"

> replace("hello-world", "-", "_")
"hello_world"

> substr("terraform", 0, 5)
"terra"

> join(", ", ["apple", "banana", "cherry"])
"apple, banana, cherry"

> split(",", "a,b,c")
tolist([
  "a",
  "b",
  "c",
])

> trimspace("  hello  ")
"hello"

> format("Instance %s has %d CPUs", "web-1", 4)
"Instance web-1 has 4 CPUs"

> regex("([a-z]+)-([0-9]+)", "server-42")
[
  "server",
  "42",
]
```

### Numeric Functions

```text
> min(5, 3, 8, 1)
1

> max(5, 3, 8, 1)
8

> ceil(4.3)
5

> floor(4.7)
4

> abs(-42)
42

> pow(2, 10)
1024
```

### Collection Functions

```text
> length(["a", "b", "c"])
3

> contains(["a", "b", "c"], "b")
true

> distinct(["a", "b", "a", "c", "b"])
tolist([
  "a",
  "b",
  "c",
])

> flatten([["a", "b"], ["c", "d"]])
[
  "a",
  "b",
  "c",
  "d",
]

> merge({a = 1, b = 2}, {c = 3, d = 4})
{
  "a" = 1
  "b" = 2
  "c" = 3
  "d" = 4
}

> keys({name = "web", type = "server"})
[
  "name",
  "type",
]

> values({name = "web", type = "server"})
[
  "web",
  "server",
]

> lookup({a = 1, b = 2}, "c", "default")
"default"

> element(["a", "b", "c"], 1)
"b"

> slice(["a", "b", "c", "d", "e"], 1, 3)
[
  "b",
  "c",
]

> sort(["banana", "apple", "cherry"])
tolist([
  "apple",
  "banana",
  "cherry",
])

> reverse(["a", "b", "c"])
[
  "c",
  "b",
  "a",
]
```

### Type Conversion Functions

```text
> tostring(42)
"42"

> tonumber("42")
42

> tobool("true")
true

> tolist(toset(["a", "b", "a"]))
[
  "a",
  "b",
]

> tomap({name = "web"})
{
  "name" = "web"
}
```

### Encoding Functions

```text
> base64encode("hello")
"aGVsbG8="

> base64decode("aGVsbG8=")
"hello"

> jsonencode({name = "web", port = 8080})
"{\"name\":\"web\",\"port\":8080}"

> jsondecode("{\"name\":\"web\",\"port\":8080}")
{
  "name" = "web"
  "port" = 8080
}

> yamlencode({name = "web", replicas = 3})
"\"name\": \"web\"\n\"replicas\": 3\n"

> urlencode("hello world")
"hello+world"
```

### IP Network Functions

```text
> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"

> cidrsubnet("10.0.0.0/16", 8, 2)
"10.0.2.0/24"

> cidrhost("10.0.1.0/24", 5)
"10.0.1.5"

> cidrnetmask("10.0.0.0/16")
"255.255.0.0"
```

The `cidrsubnet` function is one of the most commonly tested in the console because getting subnet math right on the first try is hard.

## Exploring Variables

If your configuration defines variables with defaults, you can access them in the console:

```hcl
# variables.tf
variable "environment" {
  default = "production"
}

variable "instance_types" {
  default = {
    small  = "t3.micro"
    medium = "t3.medium"
    large  = "t3.large"
  }
}
```

```text
> var.environment
"production"

> var.instance_types
{
  "large"  = "t3.large"
  "medium" = "t3.medium"
  "small"  = "t3.micro"
}

> var.instance_types["medium"]
"t3.medium"

> lookup(var.instance_types, "small")
"t3.micro"
```

### Passing Variable Values

You can pass variables to the console just like with plan and apply:

```bash
# Start console with specific variable values
terraform console -var="environment=staging"

# Or use a var file
terraform console -var-file="staging.tfvars"
```

## Exploring State

If you have an existing state file (from a previous apply), the console lets you inspect resource attributes:

```text
> aws_instance.web.id
"i-abc123def456"

> aws_instance.web.public_ip
"54.123.45.67"

> aws_instance.web.tags
{
  "Name" = "web-server"
}

> aws_s3_bucket.data.arn
"arn:aws:s3:::my-data-bucket"
```

This is invaluable for debugging. Instead of guessing what value a resource attribute has, you can query it directly.

## Testing Complex Expressions

The console is where you test the tricky expressions before putting them in your configuration.

### Conditional Expressions

```text
> var.environment == "production" ? "t3.large" : "t3.micro"
"t3.large"

> var.environment != "production" ? 0 : 1
1
```

### For Expressions

```text
> [for s in ["hello", "world"] : upper(s)]
[
  "HELLO",
  "WORLD",
]

> {for k, v in {a = 1, b = 2, c = 3} : k => v * 2}
{
  "a" = 2
  "b" = 4
  "c" = 6
}

> [for i in range(5) : "subnet-${i}"]
[
  "subnet-0",
  "subnet-1",
  "subnet-2",
  "subnet-3",
  "subnet-4",
]
```

### Splat Expressions

If you have multiple resources:

```text
> aws_instance.web[*].id
[
  "i-abc123",
  "i-def456",
  "i-ghi789",
]
```

### Complex Transformations

```text
> { for az in ["us-east-1a", "us-east-1b", "us-east-1c"] :
    az => cidrsubnet("10.0.0.0/16", 8, index(["us-east-1a", "us-east-1b", "us-east-1c"], az))
  }
{
  "us-east-1a" = "10.0.0.0/24"
  "us-east-1b" = "10.0.1.0/24"
  "us-east-1c" = "10.0.2.0/24"
}
```

## Non-Interactive Mode

You can pipe expressions to the console for scripting:

```bash
# Evaluate a single expression
echo 'var.environment' | terraform console

# Evaluate a function
echo 'cidrsubnet("10.0.0.0/16", 8, 3)' | terraform console

# Use in a script
SUBNET=$(echo 'cidrsubnet("10.0.0.0/16", 8, 5)' | terraform console)
echo "The subnet is: $SUBNET"
```

This is useful for integrating Terraform expressions into shell scripts.

## Using the Console for Debugging

### Debugging Interpolation Issues

When an expression in your configuration produces unexpected results, copy it into the console:

```text
> format("arn:aws:s3:::%s/*", var.bucket_name)
"arn:aws:s3:::my-bucket/*"
```

### Debugging for_each Keys

```text
> toset(["web", "api", "worker"])
toset([
  "api",
  "web",
  "worker",
])
```

### Checking Type Conversions

```text
> type(42)  # Not a real function, but you can test conversions
> tostring(42)
"42"
> tonumber("42")
42
```

## Limitations

- The console does not support multi-line input. Each expression must be on a single line.
- You cannot define new variables or resources in the console. It only evaluates expressions against existing configuration and state.
- Some expressions that work in `.tf` files (like `count.index`) do not work in the console because they require a resource context.
- The console evaluates against the state as it exists, not against planned changes.

## Practical Use Cases

1. **Learning Terraform functions** - Try functions you have not used before
2. **Debugging expressions** - Test complex expressions from your configuration
3. **Exploring state** - Inspect resource attributes after apply
4. **Subnet calculations** - Get CIDR math right before writing it in code
5. **Testing transformations** - Verify for expressions and splat operations
6. **Quick lookups** - Check output values or variable defaults

## Conclusion

`terraform console` is an underused tool that can save you a lot of trial-and-error cycles. Instead of writing an expression in your `.tf` file, running `terraform plan`, seeing an error, fixing it, and planning again, you can test the expression interactively in seconds. Keep it in mind whenever you are working with complex expressions, unfamiliar functions, or subnet calculations.
