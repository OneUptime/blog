# How to Use the format Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the format function in Terraform to produce formatted strings using printf-style verbs, with practical examples for resource naming and more.

---

String interpolation in Terraform is great for simple cases, but when you need precise control over formatting - padding numbers, controlling decimal places, or building complex strings - the `format` function is the right tool. It works similarly to `printf` in C or `fmt.Sprintf` in Go.

## What Does format Do?

The `format` function produces a string by formatting a number of values according to a specification string. It uses formatting verbs (placeholders) that get replaced with the provided values.

```hcl
# Basic syntax
format(spec, values...)
```

The specification string contains literal text mixed with formatting verbs like `%s` for strings, `%d` for integers, and `%f` for floating-point numbers.

## Basic Formatting Verbs

Here are the most commonly used verbs.

```hcl
# %s - String
> format("Hello, %s!", "World")
"Hello, World!"

# %d - Integer (decimal)
> format("There are %d servers", 5)
"There are 5 servers"

# %f - Floating point
> format("CPU usage: %f%%", 85.5)
"CPU usage: 85.500000%"

# %t - Boolean
> format("Feature enabled: %t", true)
"Feature enabled: true"

# %v - Default formatting (works with any type)
> format("Value: %v", 42)
"Value: 42"

# %q - Quoted string
> format("Name: %q", "my-server")
"Name: \"my-server\""
```

Note the `%%` to produce a literal percent sign in the output.

## Controlling Width and Padding

You can specify minimum width for your formatted values.

```hcl
# Pad a number to 3 digits with leading zeros
> format("%03d", 5)
"005"

# Right-align a string in a 20-character field
> format("%20s", "hello")
"               hello"

# Left-align with a minus flag
> format("%-20s", "hello")
"hello               "

# Pad integer to 4 digits
> format("server-%04d", 42)
"server-0042"
```

This is incredibly useful for generating sequential resource names with consistent formatting.

## Floating-Point Precision

Control decimal places with precision specifiers.

```hcl
# Two decimal places
> format("%.2f", 3.14159)
"3.14"

# No decimal places
> format("%.0f", 3.14159)
"3"

# Width and precision combined (total width 10, 2 decimal places)
> format("%10.2f", 3.14159)
"      3.14"
```

## Resource Naming Conventions

One of the most common uses of `format` is building standardized resource names.

```hcl
variable "project" {
  default = "myapp"
}

variable "environment" {
  default = "prod"
}

variable "region" {
  default = "us-east-1"
}

locals {
  # Consistent naming pattern: project-environment-region-resource
  name_prefix = format("%s-%s-%s", var.project, var.environment, var.region)
}

resource "aws_s3_bucket" "data" {
  bucket = format("%s-data", local.name_prefix)
  # Result: "myapp-prod-us-east-1-data"
}

resource "aws_s3_bucket" "logs" {
  bucket = format("%s-logs", local.name_prefix)
  # Result: "myapp-prod-us-east-1-logs"
}
```

## Building ARNs and Resource Identifiers

The `format` function is perfect for constructing AWS ARNs and other structured identifiers.

```hcl
variable "account_id" {
  default = "123456789012"
}

variable "region" {
  default = "us-east-1"
}

locals {
  # Build an S3 bucket ARN
  bucket_arn = format(
    "arn:aws:s3:::%s-%s-data",
    var.account_id,
    var.region
  )

  # Build an IAM role ARN
  role_arn = format(
    "arn:aws:iam::%s:role/%s-role",
    var.account_id,
    "deployment"
  )

  # Build a Lambda function ARN
  lambda_arn = format(
    "arn:aws:lambda:%s:%s:function:%s",
    var.region,
    var.account_id,
    "my-function"
  )
}
```

## Generating Sequential Names

When creating numbered resources, `format` with zero-padding keeps things tidy.

```hcl
resource "aws_instance" "worker" {
  count = 5

  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    # Produces: worker-001, worker-002, ..., worker-005
    Name = format("worker-%03d", count.index + 1)
  }
}

# Using for_each with a generated map
locals {
  worker_names = {
    for i in range(5) :
    format("worker-%03d", i + 1) => {
      index = i
      name  = format("worker-%03d", i + 1)
    }
  }
}
```

## Multiple Values in One Call

You can include as many formatting verbs and values as you need.

```hcl
locals {
  # Format a connection string
  db_connection = format(
    "postgresql://%s:%s@%s:%d/%s",
    "admin",           # username
    "secretpass",      # password
    "db.example.com",  # host
    5432,              # port
    "mydb"             # database
  )

  # Format a log message
  log_entry = format(
    "[%s] %s - %s (code: %d)",
    "2026-02-23",
    "ERROR",
    "Connection timeout",
    504
  )
}
```

## format vs String Interpolation

You might wonder when to use `format` versus Terraform's built-in string interpolation (`"${var.name}"`). Here is a comparison.

```hcl
variable "name" {
  default = "myapp"
}

variable "count_val" {
  default = 7
}

locals {
  # String interpolation - simple and readable for basic cases
  simple_name = "${var.name}-server"

  # format - needed when you want padding, precision, or special formatting
  padded_name = format("%s-server-%03d", var.name, var.count_val)
  # Result: "myapp-server-007"

  # You cannot do zero-padding with interpolation alone
  # This would not work: "${var.name}-server-${var.count_val}"
  # Result would be: "myapp-server-7" (no padding)
}
```

Use string interpolation for simple concatenation. Use `format` when you need formatting control.

## Conditional Formatting

Combine `format` with conditional expressions for dynamic string building.

```hcl
variable "environment" {
  default = "prod"
}

variable "enable_high_availability" {
  default = true
}

locals {
  instance_name = format(
    "%s-%s-%s",
    "myapp",
    var.environment,
    var.enable_high_availability ? "ha" : "standard"
  )
  # Result: "myapp-prod-ha"
}
```

## Working with IP Addresses

The `format` function handles building IP addresses and CIDR blocks cleanly.

```hcl
variable "vpc_second_octet" {
  default = 10
}

locals {
  # Build CIDR blocks for subnets
  vpc_cidr = format("10.%d.0.0/16", var.vpc_second_octet)

  subnet_cidrs = [
    for i in range(4) :
    format("10.%d.%d.0/24", var.vpc_second_octet, i)
  ]
  # Result: ["10.10.0.0/24", "10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
}

resource "aws_vpc" "main" {
  cidr_block = local.vpc_cidr
}
```

## Error Messages with format

Build informative error messages in validation blocks.

```hcl
variable "instance_type" {
  type    = string
  default = "t3.micro"

  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = format(
      "Invalid instance type: %q. Must be one of: t3.micro, t3.small, t3.medium.",
      var.instance_type
    )
  }
}
```

## Summary

The `format` function gives you fine-grained control over string construction in Terraform. It excels at building padded numbers for sequential naming, constructing structured identifiers like ARNs, and any scenario where simple string interpolation falls short. For formatting entire lists of values at once, check out the related [formatlist function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-formatlist-function-in-terraform/view).
