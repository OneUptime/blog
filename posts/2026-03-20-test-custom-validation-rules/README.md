# How to Test Custom Validation Rules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Validation, Testing, HCL, Infrastructure as Code

Description: Learn how to write and test custom validation rules for OpenTofu variables and outputs to enforce infrastructure policies and catch misconfigurations early.

## Introduction

OpenTofu supports custom validation rules in variable definitions. Testing these rules ensures your validation logic works correctly and catches misconfigurations before they reach production.

## Defining Custom Validation Rules

Variables can include `validation` blocks:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "cidr_block" {
  type        = string
  description = "VPC CIDR block"

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "instance_count" {
  type        = number

  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 100
    error_message = "Instance count must be between 1 and 100."
  }
}
```

## Writing Tests with tofu test

Create a test file `tests/validation.tftest.hcl`:

```hcl
# Test valid environment values

run "valid_environment_dev" {
  variables {
    environment    = "dev"
    cidr_block     = "10.0.0.0/16"
    instance_count = 3
  }
  command = plan
}

run "valid_environment_prod" {
  variables {
    environment    = "prod"
    cidr_block     = "10.1.0.0/16"
    instance_count = 10
  }
  command = plan
}
```

## Testing That Invalid Values Are Rejected

```hcl
run "invalid_environment" {
  command = plan

  variables {
    environment    = "production"  # should fail
    cidr_block     = "10.0.0.0/16"
    instance_count = 3
  }

  expect_failures = [
    var.environment,
  ]
}

run "invalid_cidr" {
  command = plan

  variables {
    environment    = "dev"
    cidr_block     = "not-a-cidr"  # should fail
    instance_count = 3
  }

  expect_failures = [
    var.cidr_block,
  ]
}

run "invalid_instance_count_zero" {
  command = plan

  variables {
    environment    = "dev"
    cidr_block     = "10.0.0.0/16"
    instance_count = 0  # should fail
  }

  expect_failures = [
    var.instance_count,
  ]
}
```

## Running the Tests

```bash
tofu test
tofu test -filter=tests/validation.tftest.hcl
```

## Complex Validation Examples

```hcl
variable "tags" {
  type = map(string)

  validation {
    condition     = contains(keys(var.tags), "Environment") && contains(keys(var.tags), "Team")
    error_message = "Tags must include 'Environment' and 'Team' keys."
  }
}
```

## Conclusion

Custom validation rules combined with `tofu test` provide a lightweight way to enforce infrastructure policies at the variable level. Testing both valid and invalid inputs - using `expect_failures` - ensures your validation logic correctly accepts good values and rejects bad ones.
