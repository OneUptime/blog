# How to Use Conditional Expressions (Ternary) in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Conditional Expression, Ternary, Expression, Infrastructure as Code, DevOps

Description: A guide to using conditional expressions in OpenTofu HCL to select values based on boolean conditions.

## Introduction

The conditional expression in OpenTofu, often called a ternary operator, evaluates a condition and returns one of two values based on whether the condition is true or false. The syntax is `condition ? true_value : false_value`. It is one of the most commonly used expressions in OpenTofu for environment-specific configurations.

## Basic Conditional Expression

```hcl
variable "environment" {
  type = string
}

# Syntax: condition ? value_if_true : value_if_false

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.environment == "prod" ? "t3.large" : "t3.micro"
}
```

Resource Sizing by Environment

```hcl
variable "environment" {
  type = string
}

locals {
  is_prod = var.environment == "prod"

  # Conditional resource sizing
  instance_type     = local.is_prod ? "t3.large"    : "t3.micro"
  db_instance_class = local.is_prod ? "db.r5.large" : "db.t3.micro"
  db_storage        = local.is_prod ? 500           : 20
  min_capacity      = local.is_prod ? 3             : 1
  max_capacity      = local.is_prod ? 20            : 3
}

resource "aws_db_instance" "main" {
  instance_class    = local.db_instance_class
  allocated_storage = local.db_storage
}

resource "aws_autoscaling_group" "app" {
  min_size = local.min_capacity
  max_size = local.max_capacity
}
```

## Conditional Resource Creation

```hcl
variable "create_nat_gateway" {
  type    = bool
  default = false
}

# count = 1 to create, count = 0 to skip
resource "aws_nat_gateway" "main" {
  count = var.create_nat_gateway ? 1 : 0

  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
}
```

## Conditional Attribute Values

```hcl
variable "custom_kms_key_arn" {
  type    = string
  default = null
}

variable "multi_az" {
  type    = bool
  default = true
}

resource "aws_db_instance" "main" {
  identifier        = "myapp-db"
  engine            = "postgres"
  instance_class    = var.db_instance_class
  allocated_storage = 100

  # Conditional encryption
  kms_key_id        = var.custom_kms_key_arn != null ? var.custom_kms_key_arn : null
  storage_encrypted = var.custom_kms_key_arn != null ? true : false

  # Conditional Multi-AZ
  multi_az = var.multi_az

  # Conditional final snapshot
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.app_name}-final-snapshot" : null
}
```

## Nested Conditional Expressions

```hcl
variable "tier" {
  type = string
  # Options: "free", "standard", "premium"
}

locals {
  # Nested ternary for multi-value switch
  max_users = var.tier == "premium" ? 10000 : (
    var.tier == "standard" ? 1000 : 100
  )
}

# Better alternative: use a map lookup
locals {
  tier_limits = {
    free     = 100
    standard = 1000
    premium  = 10000
  }
  max_users_map = lookup(local.tier_limits, var.tier, 100)
}
```

## Conditional Module Arguments

```hcl
variable "enable_cdn" {
  type    = bool
  default = false
}

module "cdn" {
  count  = var.enable_cdn ? 1 : 0
  source = "./modules/cloudfront"

  origin_domain = aws_lb.app.dns_name
  price_class   = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
}

output "cdn_domain" {
  value = var.enable_cdn ? module.cdn[0].domain_name : aws_lb.app.dns_name
}
```

## Conditional in Tags

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.app_name}-${var.environment}"
      Environment = var.environment
    },
    # Conditionally add tag
    var.environment == "prod" ? {
      Critical = "true"
    } : {}
  )
}
```

## Conditional Output Values

```hcl
variable "create_public_ip" {
  type    = bool
  default = false
}

resource "aws_eip" "app" {
  count = var.create_public_ip ? 1 : 0
}

output "app_ip" {
  value = var.create_public_ip ? aws_eip.app[0].public_ip : aws_instance.app.private_ip
  description = "The IP address to reach the application"
}
```

## Conditional with null

```hcl
variable "log_retention_days" {
  type    = number
  default = null
}

resource "aws_cloudwatch_log_group" "app" {
  name = "/myapp/logs"

  # Default to 90 days when no value is provided
  retention_in_days = var.log_retention_days != null ? var.log_retention_days : 90
}
```

## Conclusion

The conditional expression is the primary way to make value selection dynamic in OpenTofu. It is used constantly for environment-specific sizing, feature flags, optional resources (via `count`), and null handling. For more than two choices, prefer a `lookup` on a map rather than deeply nested ternary expressions. When the condition is complex, extract it to a local value first for readability. OpenTofu must be able to determine a consistent result type for both branches, so the true and false values should use compatible types even though only one result is selected.
