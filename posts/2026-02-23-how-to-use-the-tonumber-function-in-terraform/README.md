# How to Use the tonumber Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Type Conversion

Description: Learn how to use the tonumber function in Terraform to convert string values into numbers for arithmetic operations, resource sizing, and dynamic configurations.

---

Terraform variables, outputs, and data sources often pass values around as strings, even when the underlying data is numeric. Port numbers might come from a data source as strings, environment variables are always strings, and map values stored as strings sometimes need to be used as numbers. The `tonumber` function handles these conversions.

## What is tonumber?

The `tonumber` function converts a string representation of a number into an actual number type.

```hcl
# Convert string to number
> tonumber("42")
42

> tonumber("3.14")
3.14

> tonumber("0")
0
```

The syntax:

```hcl
tonumber(value)
```

## When Do You Need tonumber?

Here are the common scenarios:

1. **Values from environment variables** (always strings in Terraform)
2. **Map lookups** where all values are strings but some represent numbers
3. **Data source outputs** that return strings
4. **String interpolation results** that need to be used in numeric contexts

## Converting Environment Variables

Environment variables in Terraform are always strings:

```hcl
variable "port" {
  type    = string
  default = "8080"
  description = "Application port (often set via TF_VAR_port environment variable)"
}

resource "aws_security_group_rule" "app" {
  type              = "ingress"
  from_port         = tonumber(var.port)
  to_port           = tonumber(var.port)
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.main.id
}
```

## Map Lookups with Numeric Values

When you store configuration in a map of strings (a common pattern), you need `tonumber` to extract numeric values:

```hcl
variable "env_config" {
  type = map(string)
  default = {
    instance_count = "3"
    port           = "8080"
    cpu            = "256"
    memory         = "512"
    timeout        = "30"
  }
}

resource "aws_ecs_task_definition" "app" {
  family = "app"
  cpu    = tonumber(var.env_config["cpu"])
  memory = tonumber(var.env_config["memory"])

  container_definitions = jsonencode([{
    name      = "app"
    image     = "myapp:latest"
    cpu       = tonumber(var.env_config["cpu"])
    memory    = tonumber(var.env_config["memory"])
    essential = true
    portMappings = [{
      containerPort = tonumber(var.env_config["port"])
      hostPort      = tonumber(var.env_config["port"])
    }]
  }])
}
```

## Arithmetic with Converted Values

Once converted, you can use the numbers in calculations:

```hcl
variable "base_disk_size" {
  type    = string
  default = "50"
}

variable "multiplier" {
  type    = string
  default = "4"
}

locals {
  # Convert and calculate
  disk_size = tonumber(var.base_disk_size) * tonumber(var.multiplier)
  # Result: 200
}

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = local.disk_size

  tags = {
    Name = "data-volume"
  }
}
```

## Using tonumber with for Expressions

```hcl
variable "port_strings" {
  type    = list(string)
  default = ["80", "443", "8080", "8443"]
}

locals {
  # Convert all port strings to numbers
  ports = [for p in var.port_strings : tonumber(p)]
  # Result: [80, 443, 8080, 8443]

  # Find the highest port
  max_port = max(local.ports...)
  # Result: 8443
}
```

## Handling Data Source Outputs

Some data sources return everything as strings:

```hcl
data "aws_ssm_parameter" "instance_count" {
  name = "/app/instance-count"
}

# SSM parameter values are always strings
resource "aws_autoscaling_group" "app" {
  min_size         = tonumber(data.aws_ssm_parameter.instance_count.value)
  max_size         = tonumber(data.aws_ssm_parameter.instance_count.value) * 3
  desired_capacity = tonumber(data.aws_ssm_parameter.instance_count.value)

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## tonumber with Conditional Logic

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "replica_counts" {
  type = map(string)
  default = {
    development = "1"
    staging     = "2"
    production  = "3"
  }
}

locals {
  replicas = tonumber(lookup(var.replica_counts, var.environment, "1"))
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "mydb"
  engine             = "aurora-postgresql"

  # Use the converted number
  count = local.replicas
}
```

## Converting and Validating

You can combine `tonumber` with `can` for safe conversion:

```hcl
variable "user_port" {
  type    = string
  default = "8080"

  validation {
    condition     = can(tonumber(var.user_port))
    error_message = "The port must be a valid number."
  }

  validation {
    condition     = can(tonumber(var.user_port)) && tonumber(var.user_port) > 0 && tonumber(var.user_port) <= 65535
    error_message = "The port must be between 1 and 65535."
  }
}
```

## Integer vs Float

`tonumber` handles both integers and floating-point numbers:

```hcl
> tonumber("42")
42

> tonumber("3.14")
3.14

> tonumber("-17")
-17

> tonumber("0.001")
0.001
```

## What tonumber Cannot Convert

```hcl
# Not a number - will error
# tonumber("hello")    # Error!
# tonumber("12abc")    # Error!
# tonumber("")         # Error!
# tonumber("true")     # Error!

# Boolean conversion is separate
# Use tobool for booleans
```

## tonumber with try for Safe Defaults

```hcl
variable "optional_count" {
  type    = string
  default = ""
}

locals {
  # Use try to provide a default if conversion fails
  count_value = try(tonumber(var.optional_count), 1)
}
```

## Practical Pattern: Dynamic Scaling Configuration

```hcl
# Configuration stored as a flat map of strings (common in parameter stores)
variable "scaling_config" {
  type = map(string)
  default = {
    "web.min"      = "2"
    "web.max"      = "10"
    "web.desired"  = "4"
    "api.min"      = "3"
    "api.max"      = "15"
    "api.desired"  = "6"
  }
}

resource "aws_autoscaling_group" "web" {
  name             = "web-asg"
  min_size         = tonumber(var.scaling_config["web.min"])
  max_size         = tonumber(var.scaling_config["web.max"])
  desired_capacity = tonumber(var.scaling_config["web.desired"])

  launch_template {
    id = aws_launch_template.web.id
  }
}

resource "aws_autoscaling_group" "api" {
  name             = "api-asg"
  min_size         = tonumber(var.scaling_config["api.min"])
  max_size         = tonumber(var.scaling_config["api.max"])
  desired_capacity = tonumber(var.scaling_config["api.desired"])

  launch_template {
    id = aws_launch_template.api.id
  }
}
```

## tonumber in Outputs

When you want to output a numeric value that was derived from strings:

```hcl
output "total_capacity" {
  value       = sum([for v in values(var.scaling_config) : tonumber(v) if can(regex("desired$", v))])
  description = "Total desired capacity across all ASGs"
}
```

## Edge Cases

```hcl
# Already a number - returns as-is
> tonumber(42)
42

# Scientific notation
> tonumber("1e3")
1000

> tonumber("1.5e2")
150

# Leading/trailing whitespace may cause issues
# tonumber(" 42 ")  # May error depending on version
```

## Summary

The `tonumber` function is the standard way to convert string values to numbers in Terraform. You will use it frequently when working with map lookups, environment variables, data source outputs, and any situation where numeric data arrives as a string. Combine it with `can` and `try` for safe conversions with fallback values. For the reverse operation, see the [tostring function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tostring-function-in-terraform/view), and for boolean conversions, check out the [tobool function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tobool-function-in-terraform/view).
