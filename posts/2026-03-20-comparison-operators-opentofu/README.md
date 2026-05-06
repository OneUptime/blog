# How to Use Comparison Operators in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Comparison Operator, Expression, Infrastructure as Code, DevOps

Description: A guide to using comparison operators in OpenTofu HCL expressions to compare values and make conditional decisions.

## Introduction

Comparison operators in OpenTofu evaluate to `true` or `false` based on the relationship between two values. They are most commonly used in conditional expressions, validation blocks, and lifecycle conditions. OpenTofu supports equality, inequality, and ordering operators.

## Comparison Operators

```hcl
# ==  Equal to

# !=  Not equal to
# <   Less than
# <=  Less than or equal to
# >   Greater than
# >=  Greater than or equal to

variable "instance_count" {
  type    = number
  default = 3
}

locals {
  is_single    = var.instance_count == 1        # false
  is_multiple  = var.instance_count != 1        # true
  is_small     = var.instance_count < 5         # true
  is_at_most   = var.instance_count <= 3        # true
  is_large     = var.instance_count > 10        # false
  is_at_least  = var.instance_count >= 3        # true
}
```

## Equality Comparisons

```hcl
variable "environment" {
  type = string
}

variable "region" {
  type = string
}

locals {
  is_prod         = var.environment == "prod"
  is_not_prod     = var.environment != "prod"
  is_us_east      = var.region == "us-east-1"
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = local.is_prod ? "t3.large" : "t3.micro"

  # Pin non-production to a specific AZ
  availability_zone = local.is_prod ? null : "us-east-1a"
}
```

## Numeric Comparisons

```hcl
variable "storage_gb" {
  type    = number
  default = 100
}

resource "aws_db_instance" "main" {
  allocated_storage = var.storage_gb
  # Enable storage autoscaling for larger databases
  max_allocated_storage = var.storage_gb > 100 ? var.storage_gb * 2 : null

  # Provisioned IOPS for high-performance storage
  storage_type = var.storage_gb >= 500 ? "io2" : "gp3"
  iops         = var.storage_gb >= 500 ? var.storage_gb * 5 : null
}
```

## String Comparisons

```hcl
variable "log_level" {
  type    = string
  default = "info"
}

locals {
  # String equality comparison
  is_debug   = var.log_level == "debug"
  is_verbose = var.log_level == "debug" || var.log_level == "trace"

  # Use lower() for case-insensitive comparison
  normalized_env = lower(var.environment)
  is_prod        = lower(var.environment) == "production" || lower(var.environment) == "prod"
}
```

## Comparisons in Validation Rules

```hcl
variable "instance_count" {
  type = number
  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 100
    error_message = "Instance count must be between 1 and 100. Got: ${var.instance_count}"
  }
}

variable "port" {
  type = number
  validation {
    condition     = var.port >= 1024 && var.port <= 65535
    error_message = "Port must be between 1024 and 65535. Got: ${var.port}"
  }
}

variable "environment" {
  type = string
  validation {
    condition     = var.environment != ""
    error_message = "Environment cannot be empty."
  }
}
```

## Comparisons in Lifecycle Conditions

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    precondition {
      condition     = var.instance_count >= 2
      error_message = "At least 2 instances required for high availability. Got: ${var.instance_count}"
    }

    postcondition {
      condition     = self.instance_state == "running"
      error_message = "Instance must be running after creation."
    }
  }
}
```

## Comparison with null

```hcl
variable "custom_kms_key" {
  type    = string
  default = null
}

locals {
  # Compare with null
  has_custom_key = var.custom_kms_key != null
  use_default    = var.custom_kms_key == null
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = local.has_custom_key ? "aws:kms" : "AES256"
      kms_master_key_id = var.custom_kms_key  # null is fine here
    }
  }
}
```

## Chaining Comparisons

```hcl
variable "cpu_threshold" {
  type    = number
  default = 80
}

locals {
  # Use logical operators with comparison operators
  is_low_threshold    = var.cpu_threshold < 50
  is_medium_threshold = var.cpu_threshold >= 50 && var.cpu_threshold < 80
  is_high_threshold   = var.cpu_threshold >= 80

  alarm_period = var.cpu_threshold >= 90 ? 60 : 300
}
```

## Conclusion

Comparison operators are essential for writing conditional logic in OpenTofu configurations. They enable environment-based resource sizing, threshold-based feature toggles, input validation, and lifecycle condition checks. Use `==` and `!=` for equality checks (including null comparisons), and `<`, `<=`, `>`, `>=` for numeric ordering. For case-insensitive string comparisons, normalize with `lower()` or `upper()` before comparing. Comparison operators are most powerful when combined with conditional expressions, logical operators, and validation blocks.
