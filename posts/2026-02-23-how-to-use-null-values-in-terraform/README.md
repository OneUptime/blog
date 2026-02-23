# How to Use Null Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Types, Configuration

Description: Learn how null values work in Terraform, how to use them for optional arguments, conditional resource configuration, and variable defaults with practical examples.

---

Null is one of those Terraform features that looks simple but solves a surprisingly common problem: how do you tell Terraform "I do not want to set this value"? Not an empty string, not zero, not false - actually nothing. That is what `null` does, and it behaves differently from what you might expect coming from other programming languages.

## What null Means in Terraform

In Terraform, `null` represents the absence of a value. When you assign `null` to a resource argument, Terraform treats it as if you never set that argument at all. The resource uses its default behavior for that argument.

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Setting key_name to null is the same as omitting it entirely
  # The instance will be created without an SSH key
  key_name = null
}
```

This is different from an empty string:

```hcl
# null = argument not set, uses provider default behavior
key_name = null

# empty string = argument IS set to an empty value
# This might cause an error depending on the resource
key_name = ""
```

## null as a Variable Default

One of the most common uses of `null` is making variables truly optional:

```hcl
variable "ssh_key_name" {
  type        = string
  default     = null
  description = "SSH key pair name. If not provided, no key is attached."
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # If var.ssh_key_name is null, Terraform omits this argument
  key_name = var.ssh_key_name
}
```

Without `null`, you would need an awkward workaround:

```hcl
# Without null, you might do this (ugly)
variable "ssh_key_name" {
  type    = string
  default = ""  # Empty string is not the same as "no value"
}

# Then you need a conditional
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.ssh_key_name != "" ? var.ssh_key_name : null
}
```

## Conditional Arguments with null

The most powerful use of `null` is conditionally setting resource arguments:

```hcl
variable "environment" {
  type = string
}

variable "kms_key_arn" {
  type    = string
  default = null
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_configuration {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      # Only set kms_master_key_id when using KMS
      kms_master_key_id = var.kms_key_arn
    }
  }
}
```

When `var.kms_key_arn` is `null`, the `kms_master_key_id` argument is effectively omitted. AWS uses AES256 encryption instead.

### Conditional Blocks with null Trick

You can use null with the ternary operator to conditionally set multiple arguments:

```hcl
variable "enable_logging" {
  type    = bool
  default = false
}

variable "log_bucket" {
  type    = string
  default = null
}

resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

resource "aws_s3_bucket_logging" "data" {
  count = var.enable_logging ? 1 : 0

  bucket        = aws_s3_bucket.data.id
  target_bucket = var.log_bucket
  target_prefix = "logs/"
}
```

## Checking for null

Use `==` and `!=` to check if a value is null:

```hcl
variable "custom_domain" {
  type    = string
  default = null
}

locals {
  # Check if a value is null
  has_custom_domain = var.custom_domain != null

  # Use the check in a conditional
  domain = var.custom_domain != null ? var.custom_domain : "${var.app_name}.default.example.com"
}

# Create a DNS record only if a custom domain is provided
resource "aws_route53_record" "app" {
  count = var.custom_domain != null ? 1 : 0

  zone_id = var.zone_id
  name    = var.custom_domain
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

## null with coalesce()

The `coalesce` function returns the first non-null, non-empty-string argument. It is perfect for implementing fallback chains:

```hcl
variable "custom_ami" {
  type    = string
  default = null
}

variable "default_ami" {
  type    = string
  default = null
}

locals {
  # Use custom_ami if provided, otherwise default_ami,
  # otherwise fall back to a hardcoded value
  ami_id = coalesce(var.custom_ami, var.default_ami, "ami-0c55b159cbfafe1f0")
}
```

Note: `coalesce` skips both `null` and `""` (empty string). If you only want to skip `null` but keep empty strings, use the ternary operator:

```hcl
locals {
  # Only skips null, keeps empty strings
  value = var.input != null ? var.input : "default"
}
```

## null in Object Types

When defining object types with optional attributes, unset optional attributes default to `null`:

```hcl
variable "config" {
  type = object({
    name     = string
    key_name = optional(string)      # Defaults to null
    port     = optional(number, 80)  # Defaults to 80
  })
}

# Calling with minimal config
# config = { name = "web" }
# config.key_name is null
# config.port is 80
```

You can use this to conditionally configure resources:

```hcl
variable "server" {
  type = object({
    name          = string
    instance_type = string
    key_name      = optional(string)
    iam_role      = optional(string)
    user_data     = optional(string)
  })
}

resource "aws_instance" "this" {
  ami           = var.ami_id
  instance_type = var.server.instance_type

  # These are only set if provided (non-null)
  key_name             = var.server.key_name
  iam_instance_profile = var.server.iam_role
  user_data            = var.server.user_data

  tags = {
    Name = var.server.name
  }
}
```

## null in Loops and Conditionals

### Filtering with null

```hcl
variable "users" {
  type = list(object({
    name  = string
    email = optional(string)
  }))
  default = [
    { name = "alice", email = "alice@example.com" },
    { name = "bob" },
    { name = "charlie", email = "charlie@example.com" },
  ]
}

locals {
  # Filter to only users with email addresses
  users_with_email = [
    for user in var.users : user
    if user.email != null
  ]
  # Result: alice and charlie only
}
```

### Conditional Map Entries

```hcl
variable "enable_monitoring" {
  type    = bool
  default = false
}

locals {
  # Build a map of tags, conditionally including some
  base_tags = {
    Name      = var.name
    ManagedBy = "terraform"
  }

  monitoring_tags = var.enable_monitoring ? {
    MonitoringEnabled = "true"
    AlertEmail        = var.alert_email
  } : {}

  all_tags = merge(local.base_tags, local.monitoring_tags)
}
```

## null vs. Empty Values

This distinction trips people up regularly. Here is a reference:

```hcl
locals {
  # null - absence of value, argument is omitted
  null_value = null

  # Empty string - value exists but is empty
  empty_string = ""

  # Zero - value exists and is zero
  zero = 0

  # False - value exists and is false
  false_val = false

  # Empty list - value exists but has no elements
  empty_list = []

  # Empty map - value exists but has no keys
  empty_map = {}
}
```

In conditionals:

```hcl
locals {
  # null checks
  is_null         = null == null          # true
  empty_is_null   = "" == null            # false - empty string is not null
  zero_is_null    = 0 == null             # false - zero is not null
  false_is_null   = false == null         # false - false is not null

  # Practical implications
  # These behave differently:
  key_name_null  = null   # Argument omitted entirely
  key_name_empty = ""     # Argument set to empty string (likely an error)
}
```

## null in Dynamic Blocks

Combine `null` with dynamic blocks for conditional nested configuration:

```hcl
variable "health_check" {
  type = object({
    enabled  = bool
    path     = optional(string, "/health")
    interval = optional(number, 30)
  })
  default = {
    enabled = false
  }
}

resource "aws_lb_target_group" "app" {
  name     = "app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  dynamic "health_check" {
    for_each = var.health_check.enabled ? [var.health_check] : []
    content {
      path     = health_check.value.path
      interval = health_check.value.interval
    }
  }
}
```

## Common Patterns

### Optional Module Arguments

```hcl
# Module definition
variable "alarm_sns_topic" {
  type        = string
  default     = null
  description = "SNS topic ARN for alarms. If null, no alarms are created."
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.alarm_sns_topic != null ? 1 : 0

  alarm_name          = "${var.name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [var.alarm_sns_topic]
}
```

### Cascading Defaults

```hcl
variable "region" {
  type    = string
  default = null
}

variable "default_region" {
  type    = string
  default = null
}

locals {
  # Try variable, then default variable, then hardcoded fallback
  region = coalesce(var.region, var.default_region, "us-east-1")
}
```

## Summary

Null in Terraform means "no value" - not empty, not zero, not false. When assigned to a resource argument, it tells Terraform to omit that argument and use the provider's default behavior. The most common patterns are using `null` as a variable default for optional arguments, using null checks with conditionals to optionally create resources, and using `coalesce()` for fallback chains. The key thing to remember is that `null` is fundamentally different from `""`, `0`, `false`, `[]`, and `{}` - those are all actual values, while `null` is the absence of one.
