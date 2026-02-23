# How to Use Ternary Conditional Expressions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Conditionals, Expressions

Description: Learn how to use ternary conditional expressions in Terraform to dynamically choose values based on conditions for flexible infrastructure configuration.

---

The ternary conditional expression is probably the most-used expression in Terraform after basic variable references. It lets you choose between two values based on a condition, all in a single line. If you have ever written `condition ? true_value : false_value` in any programming language, you already know the syntax.

But Terraform's ternary has some specific behaviors and patterns that are worth understanding deeply, especially around type handling and how it interacts with resource arguments.

## Basic Syntax

```hcl
# condition ? value_if_true : value_if_false

locals {
  instance_type = var.environment == "production" ? "t3.large" : "t3.micro"
}
```

The condition must evaluate to a boolean (`true` or `false`). The two result values must be of the same type, or Terraform must be able to convert them to a common type.

## Common Patterns

### Environment-Based Configuration

The most frequent use case - different settings per environment:

```hcl
variable "environment" {
  type = string
}

locals {
  # Instance sizing
  instance_type = var.environment == "production" ? "t3.large" : "t3.micro"

  # Storage
  volume_size = var.environment == "production" ? 100 : 20

  # Replication
  multi_az = var.environment == "production" ? true : false

  # Actually, for bools you can simplify
  multi_az_clean = var.environment == "production"

  # Retention
  backup_retention = var.environment == "production" ? 30 : 7
}

resource "aws_db_instance" "main" {
  engine               = "postgres"
  instance_class       = var.environment == "production" ? "db.r5.large" : "db.t3.micro"
  allocated_storage    = local.volume_size
  multi_az             = local.multi_az_clean
  backup_retention_period = local.backup_retention
  skip_final_snapshot  = var.environment != "production"
}
```

### Conditional Resource Creation

Using the ternary with `count` to conditionally create resources:

```hcl
variable "create_monitoring" {
  type    = bool
  default = true
}

# Create the alarm only if monitoring is enabled
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = var.create_monitoring ? 1 : 0

  alarm_name          = "high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
}
```

### Choosing Between Resources

```hcl
variable "use_existing_vpc" {
  type    = bool
  default = false
}

variable "existing_vpc_id" {
  type    = string
  default = ""
}

# Create a new VPC or use an existing one
resource "aws_vpc" "new" {
  count = var.use_existing_vpc ? 0 : 1

  cidr_block = var.vpc_cidr
  tags = {
    Name = "${var.project}-vpc"
  }
}

data "aws_vpc" "existing" {
  count = var.use_existing_vpc ? 1 : 0
  id    = var.existing_vpc_id
}

locals {
  # Resolve to whichever VPC we are using
  vpc_id = var.use_existing_vpc ? data.aws_vpc.existing[0].id : aws_vpc.new[0].id
}
```

### Selecting from Multiple Options

For more than two options, chain ternaries (though this gets hard to read quickly):

```hcl
variable "size" {
  type = string  # "small", "medium", "large"
}

locals {
  instance_type = (
    var.size == "large" ? "t3.xlarge" :
    var.size == "medium" ? "t3.large" :
    "t3.micro"  # default for "small" or anything else
  )
}
```

For more than three options, consider using a map lookup instead:

```hcl
locals {
  size_map = {
    small  = "t3.micro"
    medium = "t3.large"
    large  = "t3.xlarge"
    xlarge = "t3.2xlarge"
  }

  instance_type = local.size_map[var.size]
}
```

## Type Handling

Both branches of a ternary must return compatible types:

```hcl
# Works - both sides are strings
name = var.custom_name != null ? var.custom_name : "default"

# Works - both sides are numbers
count = var.enabled ? 1 : 0

# Works - both sides are lists of the same type
subnets = var.use_private ? var.private_subnet_ids : var.public_subnet_ids

# Works - Terraform converts number to string
label = var.use_port ? tostring(var.port) : "none"

# Error - incompatible types without explicit conversion
# value = var.flag ? "hello" : 42
# Fix:
value = var.flag ? "hello" : tostring(42)
```

### Ternary with Complex Types

```hcl
locals {
  # Map values
  tags = var.environment == "production" ? {
    Environment = "production"
    Critical    = "true"
    OnCall      = "platform-team"
  } : {
    Environment = var.environment
    Critical    = "false"
    OnCall      = "dev-team"
  }

  # List values
  availability_zones = var.multi_az ? [
    "us-east-1a",
    "us-east-1b",
    "us-east-1c",
  ] : [
    "us-east-1a",
  ]
}
```

## Ternary with null

Using `null` in ternary expressions is a powerful pattern for optional arguments:

```hcl
variable "ssh_key" {
  type    = string
  default = null
}

variable "iam_role" {
  type    = string
  default = null
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Only set key_name if an SSH key is provided
  key_name = var.ssh_key != null ? var.ssh_key : null

  # Simplify: since we are checking for null, just use the variable directly
  key_name = var.ssh_key  # Same effect - null means "don't set this"

  # But the ternary is useful when you want to transform the value
  iam_instance_profile = var.iam_role != null ? "profile-${var.iam_role}" : null
}
```

## Ternary in String Interpolation

You can embed ternary expressions inside string interpolation:

```hcl
locals {
  # Badge in the name
  server_name = "web-${var.environment == "production" ? "prod" : "dev"}-01"

  # Conditional protocol
  url = "${var.enable_ssl ? "https" : "http"}://${var.domain}"

  # Conditional port in URL
  full_url = "${var.enable_ssl ? "https" : "http"}://${var.domain}${var.port != 443 && var.port != 80 ? ":${var.port}" : ""}"
}
```

## Ternary in for_each

```hcl
variable "create_dns_records" {
  type    = bool
  default = true
}

variable "dns_records" {
  type = map(object({
    type  = string
    value = string
  }))
}

# Conditionally create all DNS records or none
resource "aws_route53_record" "this" {
  for_each = var.create_dns_records ? var.dns_records : {}

  zone_id = var.zone_id
  name    = each.key
  type    = each.value.type
  ttl     = 300
  records = [each.value.value]
}
```

## Best Practices

### Keep Ternaries Simple

```hcl
# Good - simple and readable
instance_type = var.environment == "production" ? "t3.large" : "t3.micro"

# Bad - too much logic in one expression
instance_type = var.environment == "production" && var.high_performance ? (var.gpu_enabled ? "p3.2xlarge" : "c5.4xlarge") : (var.environment == "staging" ? "t3.medium" : "t3.micro")

# Better - break it down with locals
locals {
  is_production    = var.environment == "production"
  needs_gpu        = local.is_production && var.gpu_enabled
  needs_compute    = local.is_production && var.high_performance && !var.gpu_enabled
  is_staging       = var.environment == "staging"

  instance_type = (
    local.needs_gpu ? "p3.2xlarge" :
    local.needs_compute ? "c5.4xlarge" :
    local.is_staging ? "t3.medium" :
    "t3.micro"
  )
}
```

### Use Maps for Multiple Options

When you have more than 2-3 options, a map is cleaner:

```hcl
# Instead of nested ternaries
locals {
  config = {
    dev = {
      instance_type = "t3.micro"
      count         = 1
      multi_az      = false
    }
    staging = {
      instance_type = "t3.small"
      count         = 2
      multi_az      = false
    }
    production = {
      instance_type = "t3.large"
      count         = 3
      multi_az      = true
    }
  }

  current = local.config[var.environment]
}
```

### Document Complex Conditions

```hcl
locals {
  # Create a NAT Gateway only in production and staging.
  # Dev environments use a NAT instance to save costs.
  # Test environments have no NAT (isolated network).
  create_nat_gateway = (
    var.environment == "production" || var.environment == "staging"
  )
}
```

## Gotchas

### Both Branches Are Evaluated

Terraform evaluates both branches of a ternary, even though only one is returned. This can cause issues if one branch references something that does not exist:

```hcl
# This can fail if aws_vpc.new is not created (count = 0)
# because Terraform still evaluates both branches
vpc_id = var.use_existing ? data.aws_vpc.existing[0].id : aws_vpc.new[0].id

# Safer - use try() or one()
vpc_id = var.use_existing ? data.aws_vpc.existing[0].id : one(aws_vpc.new[*].id)
```

### Ternary Is Not a Statement

You cannot use a ternary to conditionally execute an action. It only chooses between values:

```hcl
# This does not work - ternary must produce a value
# var.debug ? print("debug mode") : null

# Use it for choosing values only
log_level = var.debug ? "DEBUG" : "INFO"
```

## Summary

The ternary conditional (`condition ? true_value : false_value`) is Terraform's primary tool for inline decision-making. Use it for environment-based configuration, conditional resource creation with `count`, and optional argument handling with `null`. Keep ternaries simple and readable - when you find yourself nesting them deeply, switch to map lookups or break the logic into named locals. Both branches must return compatible types, and both are evaluated even though only one result is used.
