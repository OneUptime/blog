# How to Test Terraform Variable Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Validation, Variables, Infrastructure as Code

Description: Learn how to write and test Terraform variable validation rules to catch invalid inputs early, with practical examples using the native test framework.

---

Terraform variable validation blocks let you define constraints on input variables. When someone passes an invalid value, Terraform rejects it immediately with a clear error message instead of failing halfway through an apply. But validation rules themselves can have bugs. If your regex is wrong or your condition has a logic error, invalid values slip through. Testing your validation rules ensures they actually work.

## Variable Validation Basics

Before we get to testing, here is a quick refresher on how validation works in Terraform.

```hcl
# variables.tf

variable "environment" {
  type        = string
  description = "The deployment environment"

  # Restrict to known environments
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"

  # Only allow specific instance families
  validation {
    condition     = can(regex("^(t3|t3a|m5|m5a|c5)\\.", var.instance_type))
    error_message = "Instance type must be from approved families: t3, t3a, m5, m5a, c5."
  }
}

variable "cidr_block" {
  type        = string
  description = "VPC CIDR block"

  # Validate CIDR format and size
  validation {
    condition     = can(cidrhost(var.cidr_block, 0)) && tonumber(split("/", var.cidr_block)[1]) >= 16 && tonumber(split("/", var.cidr_block)[1]) <= 24
    error_message = "CIDR block must be valid and have a prefix between /16 and /24."
  }
}
```

Each validation block has a `condition` that must evaluate to `true` and an `error_message` shown when it does not. You can have multiple validation blocks per variable.

## Testing Valid Inputs

The first thing to test is that valid inputs are accepted. Use Terraform's native test framework.

```hcl
# validation.tftest.hcl

# Test that all valid environments are accepted
run "valid_environment_dev" {
  command = plan

  variables {
    environment   = "dev"
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/16"
  }

  # If we get here without error, the validation passed
  assert {
    condition     = var.environment == "dev"
    error_message = "Should accept dev environment"
  }
}

run "valid_environment_staging" {
  command = plan

  variables {
    environment   = "staging"
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/16"
  }

  assert {
    condition     = var.environment == "staging"
    error_message = "Should accept staging environment"
  }
}

run "valid_environment_production" {
  command = plan

  variables {
    environment   = "production"
    instance_type = "m5.large"
    cidr_block    = "10.0.0.0/16"
  }

  assert {
    condition     = var.environment == "production"
    error_message = "Should accept production environment"
  }
}
```

## Testing Invalid Inputs

Testing that invalid inputs are rejected is where the real value is. Use `expect_failures` to assert that specific variables fail validation.

```hcl
# Test that invalid environments are rejected
run "invalid_environment_rejected" {
  command = plan

  variables {
    environment   = "test"
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/16"
  }

  # This tells Terraform we expect this variable to fail validation
  expect_failures = [
    var.environment,
  ]
}

run "empty_environment_rejected" {
  command = plan

  variables {
    environment   = ""
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/16"
  }

  expect_failures = [
    var.environment,
  ]
}
```

The `expect_failures` block is the key feature here. It tells Terraform that this test run should fail, and specifically that the failure should come from the listed variable's validation. If the validation passes when it should not, the test fails.

## Testing Complex Validation Rules

Real-world validation rules are often more complex than simple string matching. Let's test some common patterns.

### CIDR Block Validation

```hcl
# Test valid CIDR blocks
run "valid_cidr_16" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/16"
  }
  assert {
    condition     = true
    error_message = "Should accept /16 CIDR"
  }
}

run "valid_cidr_24" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t3.micro"
    cidr_block    = "172.16.0.0/24"
  }
  assert {
    condition     = true
    error_message = "Should accept /24 CIDR"
  }
}

# Test invalid CIDR blocks
run "cidr_too_large" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/8"
  }
  expect_failures = [
    var.cidr_block,
  ]
}

run "cidr_too_small" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/28"
  }
  expect_failures = [
    var.cidr_block,
  ]
}

run "invalid_cidr_format" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t3.micro"
    cidr_block    = "not-a-cidr"
  }
  expect_failures = [
    var.cidr_block,
  ]
}
```

### Regex-Based Validation

```hcl
# Test instance type validation with regex
run "valid_t3_micro" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t3.micro"
    cidr_block    = "10.0.0.0/16"
  }
  assert {
    condition     = true
    error_message = "Should accept t3.micro"
  }
}

run "valid_m5_xlarge" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "m5.xlarge"
    cidr_block    = "10.0.0.0/16"
  }
  assert {
    condition     = true
    error_message = "Should accept m5.xlarge"
  }
}

# These should be rejected - not in approved families
run "reject_t2_instance" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t2.micro"
    cidr_block    = "10.0.0.0/16"
  }
  expect_failures = [
    var.instance_type,
  ]
}

run "reject_p3_instance" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "p3.2xlarge"
    cidr_block    = "10.0.0.0/16"
  }
  expect_failures = [
    var.instance_type,
  ]
}
```

## Testing Multiple Validation Blocks

A variable can have multiple validation blocks. Each one is checked independently.

```hcl
# variables.tf
variable "project_name" {
  type = string

  # Must be lowercase alphanumeric with hyphens
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.project_name))
    error_message = "Project name must start with a letter, end with alphanumeric, and contain only lowercase letters, numbers, and hyphens."
  }

  # Must be between 3 and 32 characters
  validation {
    condition     = length(var.project_name) >= 3 && length(var.project_name) <= 32
    error_message = "Project name must be between 3 and 32 characters."
  }
}
```

Test each validation independently:

```hcl
# Test both validations pass
run "valid_project_name" {
  command = plan
  variables {
    project_name = "my-cool-project"
  }
  assert {
    condition     = true
    error_message = "Valid project name should be accepted"
  }
}

# Fails the pattern check (starts with number)
run "reject_starts_with_number" {
  command = plan
  variables {
    project_name = "123-project"
  }
  expect_failures = [
    var.project_name,
  ]
}

# Fails the length check (too short)
run "reject_too_short" {
  command = plan
  variables {
    project_name = "ab"
  }
  expect_failures = [
    var.project_name,
  ]
}

# Fails the pattern check (uppercase)
run "reject_uppercase" {
  command = plan
  variables {
    project_name = "MyProject"
  }
  expect_failures = [
    var.project_name,
  ]
}
```

## Testing with Terratest

If you use Terratest for Go-based testing, here is how to test validations:

```go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVariableValidation(t *testing.T) {
    t.Parallel()

    // Test that valid input works
    t.Run("valid_input", func(t *testing.T) {
        opts := &terraform.Options{
            TerraformDir: "../modules/mymodule",
            Vars: map[string]interface{}{
                "environment": "dev",
            },
        }
        defer terraform.Destroy(t, opts)
        // If InitAndPlan succeeds, validation passed
        terraform.InitAndPlan(t, opts)
    })

    // Test that invalid input fails
    t.Run("invalid_input", func(t *testing.T) {
        opts := &terraform.Options{
            TerraformDir: "../modules/mymodule",
            Vars: map[string]interface{}{
                "environment": "invalid",
            },
        }
        // InitAndPlan should fail because of validation
        _, err := terraform.InitAndPlanE(t, opts)
        assert.Error(t, err, "Should reject invalid environment")
        assert.Contains(t, err.Error(), "Environment must be one of")
    })
}
```

## Edge Cases to Always Test

When writing validation tests, make sure to cover these edge cases:

1. Empty strings
2. Very long strings (boundary testing)
3. Unicode characters if your regex does not account for them
4. Null values (if the variable is nullable)
5. Boundary values for numeric ranges

```hcl
variable "port" {
  type = number

  validation {
    condition     = var.port >= 1024 && var.port <= 65535
    error_message = "Port must be between 1024 and 65535."
  }
}
```

```hcl
# Test boundary values
run "port_lower_bound" {
  command = plan
  variables { port = 1024 }
  assert {
    condition     = true
    error_message = "Should accept port 1024"
  }
}

run "port_upper_bound" {
  command = plan
  variables { port = 65535 }
  assert {
    condition     = true
    error_message = "Should accept port 65535"
  }
}

run "port_below_range" {
  command = plan
  variables { port = 1023 }
  expect_failures = [var.port]
}

run "port_above_range" {
  command = plan
  variables { port = 65536 }
  expect_failures = [var.port]
}
```

Testing your variable validations is a quick win. The tests are fast since they only run `plan`, they do not create real resources, and they protect against the kind of input errors that cause confusing failures downstream. Start with the most critical variables and expand from there.

For more on Terraform testing, see [How to Use Contract Tests for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-contract-tests-for-terraform-modules/view) and [How to Test Terraform Outputs and Data](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-outputs-and-data/view).
