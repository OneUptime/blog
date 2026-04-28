# How to Write Negative Tests for OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Negative Tests, Validation, Error Handling

Description: Learn how to write negative tests for OpenTofu modules that verify invalid inputs are properly rejected, error conditions are handled correctly, and module guards work as expected.

## Introduction

Negative tests verify that your module correctly rejects invalid configurations. They are as important as positive tests - without them, invalid inputs might silently produce incorrect infrastructure. OpenTofu's native test framework makes negative testing straightforward with `expect_failures`.

## Testing Variable Validation Rules

```hcl
# modules/database/variables.tf

variable "instance_class" {
  type        = string
  description = "RDS instance class"

  validation {
    condition     = can(regex("^db\\.", var.instance_class))
    error_message = "Instance class must start with 'db.'"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backups"

  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days"
  }
}
```

```hcl
# tests/validation_negative.tftest.hcl
mock_provider "aws" {}

# Test: invalid instance class is rejected
run "rejects_non_db_instance_class" {
  command = plan

  variables {
    instance_class        = "t3.medium"  # Missing "db." prefix
    environment           = "dev"
    backup_retention_days = 7
  }

  expect_failures = [var.instance_class]
}

# Test: invalid environment value is rejected
run "rejects_unknown_environment" {
  command = plan

  variables {
    instance_class        = "db.t3.medium"
    environment           = "production"  # Must be "prod" not "production"
    backup_retention_days = 7
  }

  expect_failures = [var.environment]
}

# Test: backup retention outside valid range
run "rejects_backup_retention_too_high" {
  command = plan

  variables {
    instance_class        = "db.t3.medium"
    environment           = "dev"
    backup_retention_days = 36  # Max is 35
  }

  expect_failures = [var.backup_retention_days]
}

# Test: backup retention too low
run "rejects_zero_backup_retention" {
  command = plan

  variables {
    instance_class        = "db.t3.medium"
    environment           = "prod"
    backup_retention_days = 0  # Min is 1
  }

  expect_failures = [var.backup_retention_days]
}
```

## Testing Check Blocks (Postconditions)

```hcl
# modules/alb/main.tf
resource "aws_lb" "main" {
  name               = var.name
  internal           = var.internal
  load_balancer_type = "application"
  subnets            = var.subnet_ids

  lifecycle {
    postcondition {
      condition     = length(var.subnet_ids) >= 2
      error_message = "ALB requires at least 2 subnets in different AZs"
    }
  }
}
```

```hcl
# tests/alb_negative.tftest.hcl
mock_provider "aws" {}

run "rejects_single_subnet_alb" {
  command = plan

  variables {
    name       = "test-alb"
    internal   = false
    subnet_ids = ["subnet-12345"]  # Only 1 subnet - should fail postcondition
  }

  expect_failures = [aws_lb.main]
}
```

## Testing Mutually Exclusive Variables

```hcl
# variables.tf - using preconditions
variable "ami_id" {
  type    = string
  default = null
}

variable "ami_filter_name" {
  type    = string
  default = null
}

# In resource:
resource "aws_instance" "main" {
  # ...

  lifecycle {
    precondition {
      condition = (
        (var.ami_id != null && var.ami_filter_name == null) ||
        (var.ami_id == null && var.ami_filter_name != null)
      )
      error_message = "Exactly one of ami_id or ami_filter_name must be specified, not both"
    }
  }
}
```

```hcl
# tests/mutual_exclusion_negative.tftest.hcl
mock_provider "aws" {}

run "rejects_both_ami_options_specified" {
  command = plan

  variables {
    ami_id           = "ami-12345"
    ami_filter_name  = "ubuntu-22.04-*"
  }

  expect_failures = [aws_instance.main]
}

run "rejects_neither_ami_option_specified" {
  command = plan

  variables {
    ami_id          = null
    ami_filter_name = null
  }

  expect_failures = [aws_instance.main]
}
```

## Conclusion

Negative tests with `expect_failures` document your module's invariants and guard against regression when validation rules are accidentally removed or weakened. Write at least one negative test for every `validation` block, `precondition`, and `postcondition` in your modules. A module without negative tests is incomplete - it only documents what valid input looks like, not what the module protects against.
