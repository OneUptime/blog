# How to Test Variable Validation Rules in OpenTofu - Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Testing, Variable Validation, Infrastructure as Code, Tofu test

Description: Learn how to write tests that verify variable validation rules in OpenTofu reject invalid inputs and accept valid ones using the native tofu test framework.

## Introduction

OpenTofu's built-in `tofu test` command supports `expect_failures` lists inside `run` blocks that let you test that variables with validation rules correctly reject invalid values. This ensures your validation logic works as intended and doesn't accidentally allow bad configurations.

## Defining Variables with Validation

```hcl
# variables.tf

variable "instance_type" {
  type        = string
  description = "EC2 instance type"

  validation {
    condition     = can(regex("^(t3|m5|c5)\\.(micro|small|medium|large|xlarge|2xlarge)$", var.instance_type))
    error_message = "Instance type must be a valid t3, m5, or c5 type."
  }
}

variable "vpc_cidr" {
  type = string

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "retention_days" {
  type = number

  validation {
    condition     = var.retention_days >= 1 && var.retention_days <= 365
    error_message = "Retention days must be between 1 and 365."
  }
}
```

## Writing Validation Tests

```hcl
# tests/validation.tftest.hcl

# Test that valid values pass
run "valid_instance_type_t3_micro" {
  command = plan
  variables {
    instance_type  = "t3.micro"
    vpc_cidr       = "10.0.0.0/16"
    retention_days = 30
  }
}

run "valid_instance_type_m5_large" {
  command = plan
  variables {
    instance_type  = "m5.large"
    vpc_cidr       = "10.1.0.0/16"
    retention_days = 90
  }
}
```

## Testing That Invalid Values Are Rejected

```hcl
# Invalid instance type
run "reject_invalid_instance_type" {
  command = plan
  variables {
    instance_type  = "t4g.micro"  # not in allowed list
    vpc_cidr       = "10.0.0.0/16"
    retention_days = 30
  }

  expect_failures = [
    var.instance_type,
  ]
}

# Invalid CIDR
run "reject_invalid_cidr" {
  command = plan
  variables {
    instance_type  = "t3.micro"
    vpc_cidr       = "not-a-cidr"
    retention_days = 30
  }

  expect_failures = [
    var.vpc_cidr,
  ]
}

# Out of range retention
run "reject_zero_retention" {
  command = plan
  variables {
    instance_type  = "t3.micro"
    vpc_cidr       = "10.0.0.0/16"
    retention_days = 0
  }

  expect_failures = [
    var.retention_days,
  ]
}
```

## Running Validation Tests

```bash
tofu test
tofu test -test-directory=tests -verbose
```

## Combining Multiple expect_failures

```hcl
run "multiple_invalid_inputs" {
  command = plan
  variables {
    instance_type  = "invalid"
    vpc_cidr       = "bad-cidr"
    retention_days = 999
  }

  expect_failures = [
    var.instance_type,
    var.vpc_cidr,
    var.retention_days,
  ]
}
```

## Conclusion

Using `expect_failures` in `tofu test` files gives you precise control over validating that your variable validation rules work correctly. Testing both happy paths and rejection cases ensures your modules are robust and catch misconfigurations early in the development cycle.
