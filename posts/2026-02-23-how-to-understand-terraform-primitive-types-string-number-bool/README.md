# How to Understand Terraform Primitive Types (string number bool)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Types, Variables

Description: Learn about Terraform's three primitive types - string, number, and bool - including how they work, when to use each, and how Terraform handles automatic type conversions.

---

Terraform has three primitive types: `string`, `number`, and `bool`. Every value in Terraform is ultimately composed of these three building blocks (plus `null`, which we will touch on briefly). Understanding how they work, how they convert between each other, and where they can trip you up will save you from some confusing errors.

## The Three Primitive Types

### string

A string is a sequence of characters. It is the most common type in Terraform because most infrastructure configuration values - names, IDs, ARNs, URLs - are strings.

```hcl
variable "instance_name" {
  type    = string
  default = "web-server"
}

variable "ami_id" {
  type    = string
  default = "ami-0c55b159cbfafe1f0"
}

# Strings are enclosed in double quotes
locals {
  greeting     = "Hello, World"
  empty_string = ""
  with_escape  = "Line one\nLine two"  # \n is a newline
  with_tab     = "Column1\tColumn2"    # \t is a tab
  with_quote   = "She said \"hello\""  # \" is an escaped quote
  with_dollar  = "Cost: $$100"         # $$ is a literal dollar sign
}
```

String interpolation lets you embed expressions:

```hcl
locals {
  full_name = "${var.project}-${var.environment}-${var.instance_name}"
}
```

### number

A number can be an integer or a decimal (floating point). Terraform uses 64-bit floating point internally for all numbers.

```hcl
variable "instance_count" {
  type    = number
  default = 3
}

variable "cpu_threshold" {
  type    = number
  default = 80.5
}

locals {
  # Integers
  port       = 8080
  count      = 5
  zero       = 0
  negative   = -1

  # Decimals
  percentage = 0.75
  threshold  = 99.9

  # Scientific notation is not supported in HCL
  # But you can use arithmetic
  million = 1000000
}
```

Numbers are used for things like port numbers, counts, thresholds, sizes, and timeouts:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  count         = var.instance_count  # number type

  root_block_device {
    volume_size = 50  # number: GB
  }
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2      # number: count of periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300    # number: seconds
  statistic           = "Average"
  threshold           = 80.0   # number: percentage
}
```

### bool

A boolean is either `true` or `false`. No quotes around them - they are not strings.

```hcl
variable "enable_monitoring" {
  type    = bool
  default = true
}

variable "is_production" {
  type    = bool
  default = false
}

locals {
  # Boolean values - no quotes
  yes = true
  no  = false
}
```

Booleans are commonly used with `count` for conditional resource creation and for feature flags:

```hcl
# Create resource only if monitoring is enabled
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name = "high-cpu"
  # ... rest of config
}

# Toggle features
resource "aws_s3_bucket" "logs" {
  bucket = "my-logs-bucket"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}
```

## Automatic Type Conversion

Terraform automatically converts between primitive types in many situations. This is called implicit type conversion or type coercion.

### String to Number

```hcl
variable "port" {
  type    = string
  default = "8080"
}

# Terraform converts "8080" to 8080 when a number is expected
resource "aws_security_group_rule" "app" {
  type              = "ingress"
  from_port         = var.port  # String "8080" converts to number 8080
  to_port           = var.port
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
}
```

### Number to String

```hcl
variable "port" {
  type    = number
  default = 8080
}

locals {
  # Number 8080 converts to string "8080" in interpolation
  connection = "http://localhost:${var.port}/api"
}
```

### Bool to String

```hcl
variable "debug" {
  type    = bool
  default = true
}

locals {
  # true converts to "true", false converts to "false"
  debug_flag = "Debug mode: ${var.debug}"
  # Result: "Debug mode: true"
}
```

### String to Bool

```hcl
# These string values convert to bool:
# "true"  -> true
# "false" -> false
# Other strings cause an error

variable "enable" {
  type = bool
  # If someone passes "true" as a string, Terraform converts it
}
```

## Type Conversion Functions

When automatic conversion is not enough, use explicit conversion functions:

```hcl
locals {
  # Convert to string
  port_str = tostring(8080)          # "8080"
  bool_str = tostring(true)          # "true"

  # Convert to number
  port_num  = tonumber("8080")       # 8080
  float_num = tonumber("3.14")       # 3.14

  # Convert to bool
  enabled = tobool("true")           # true
}
```

These functions are useful when you need to be explicit about types, especially when passing values between modules:

```hcl
module "app" {
  source = "./modules/app"

  # Ensure the port is definitely a number
  port = tonumber(var.port)

  # Ensure the flag is definitely a bool
  enable_logging = tobool(var.enable_logging)
}
```

## Type Checking and Validation

You can validate that variables receive the right kind of value:

```hcl
variable "instance_count" {
  type        = number
  description = "Number of instances to create"

  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "enable_backup" {
  type        = bool
  description = "Whether to enable automated backups"
  # Bool variables do not usually need validation
  # since they can only be true or false
}
```

## Common Gotchas

### Strings That Look Like Numbers

```hcl
# This is a string, not a number
variable "port" {
  type    = string
  default = "8080"
}

# Arithmetic on strings fails
locals {
  # ERROR: this does not work
  # next_port = var.port + 1

  # Convert first, then do arithmetic
  next_port = tonumber(var.port) + 1
}
```

### Strings That Look Like Bools

```hcl
# This is a string, not a bool
variable "enabled" {
  type    = string
  default = "true"
}

# Conditional on a string "true" does not work as expected
locals {
  # ERROR: "true" is a non-empty string, not the bool true
  # This would be a type error if used where bool is expected
  # status = var.enabled ? "on" : "off"

  # Convert first
  status = tobool(var.enabled) ? "on" : "off"
}
```

### Comparing Different Types

```hcl
locals {
  # This works - Terraform converts "5" to 5 for comparison
  compare1 = "5" == 5  # true

  # This also works
  compare2 = "true" == true  # This is actually false!
  # "true" is a string, true is a bool - different types
}
```

Wait, that last one might surprise you. In Terraform, comparing a string to a bool with `==` does not do automatic conversion. The string `"true"` is not equal to the bool `true`. They are different types. If you need to compare them, convert one:

```hcl
locals {
  # Convert the string to bool first
  compare = tobool("true") == true  # true
}
```

### Null

While not technically a primitive type, `null` represents the absence of a value. It works with any type:

```hcl
variable "optional_name" {
  type    = string
  default = null  # No default value
}

locals {
  # Check for null with == or !=
  has_name = var.optional_name != null

  # Use null to skip optional arguments
  name = var.optional_name != null ? var.optional_name : "default-name"
}
```

## Primitive Types in Practice

Here is a complete example showing all three primitive types working together:

```hcl
# Variables using all three primitive types
variable "project_name" {
  type        = string
  description = "Name of the project"
  default     = "myapp"
}

variable "replica_count" {
  type        = number
  description = "Number of application replicas"
  default     = 3

  validation {
    condition     = var.replica_count >= 1 && var.replica_count <= 20
    error_message = "Replica count must be between 1 and 20."
  }
}

variable "enable_autoscaling" {
  type        = bool
  description = "Enable horizontal pod autoscaling"
  default     = false
}

# Using the variables
locals {
  # String operations
  full_name = "${var.project_name}-${terraform.workspace}"

  # Number operations
  max_replicas = var.replica_count * 3
  min_replicas = var.replica_count > 1 ? var.replica_count - 1 : 1

  # Bool operations
  autoscaler_count = var.enable_autoscaling ? 1 : 0

  # Mixing types in a map
  config = {
    name     = local.full_name           # string
    replicas = var.replica_count          # number
    scaling  = var.enable_autoscaling     # bool
  }
}

# Outputs
output "deployment_info" {
  value = {
    name         = local.full_name
    replicas     = var.replica_count
    max_replicas = local.max_replicas
    autoscaling  = var.enable_autoscaling
    summary      = "${local.full_name}: ${var.replica_count} replicas, autoscaling ${var.enable_autoscaling ? "enabled" : "disabled"}"
  }
}
```

## Summary

Terraform's three primitive types - `string`, `number`, and `bool` - are straightforward individually but have nuances when it comes to conversion and comparison. Terraform handles many conversions automatically (string to number, number to string), but some require explicit conversion functions (`tostring`, `tonumber`, `tobool`). Always declare types on your variables to catch errors early, and use validation blocks to enforce acceptable ranges and values. Understanding these primitives well sets the foundation for working with Terraform's more complex collection types.
