# How to Write Unit Tests for Terraform with the Built-in Test Framework

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Unit Tests, Infrastructure as Code, HCL

Description: Learn how to write unit tests for Terraform using the native test framework introduced in Terraform 1.6, including test file structure, assertions, and mock providers.

---

Terraform 1.6 introduced a native test framework that lets you write tests in HCL without any external tools. You can validate your module logic, check output values, and verify resource configurations - all without deploying real infrastructure. This guide focuses specifically on writing unit tests using this built-in framework.

## What Makes a Test a Unit Test

In Terraform's testing model, a unit test is one that validates module behavior without creating real infrastructure. This is achieved through `command = plan` in your test runs, which executes the plan phase but never calls `terraform apply`. Combined with mock providers, you can test your configuration logic in isolation.

Unit tests are fast, free, and safe. They do not need cloud credentials, do not incur costs, and cannot accidentally break anything.

## Setting Up Your Test Files

Test files use the `.tftest.hcl` extension and live in a `tests` directory by default:

```text
my-module/
  main.tf
  variables.tf
  outputs.tf
  tests/
    unit.tftest.hcl
    defaults.tftest.hcl
```

You can also place test files in the root directory alongside your `.tf` files. Terraform discovers them automatically.

## Basic Unit Test Structure

Here is a minimal unit test that validates a module's output:

```hcl
# tests/unit.tftest.hcl
# Unit tests for the VPC module

# Run block defines a single test case
run "test_vpc_cidr_block" {
  # Use plan mode - no real resources are created
  command = plan

  # Set input variables for this test
  variables {
    vpc_cidr    = "10.0.0.0/16"
    environment = "test"
  }

  # Assert conditions that must be true
  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block should match the input variable"
  }

  assert {
    condition     = aws_vpc.main.tags["Environment"] == "test"
    error_message = "VPC should be tagged with the correct environment"
  }
}
```

The corresponding module might look like:

```hcl
# main.tf
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

# variables.tf
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "environment" {
  type        = string
  description = "Environment name"
}
```

## Running Unit Tests

Execute tests with the `terraform test` command:

```bash
# Run all tests
terraform test

# Run tests with verbose output
terraform test -verbose

# Run a specific test file
terraform test -filter=tests/unit.tftest.hcl
```

Output looks like this:

```text
tests/unit.tftest.hcl... in progress
  run "test_vpc_cidr_block"... pass
tests/unit.tftest.hcl... tearing down
tests/unit.tftest.hcl... pass

Success! 1 passed, 0 failed.
```

## Testing Variable Validation Rules

Terraform variable validation rules are perfect candidates for unit testing. You can verify that invalid inputs are correctly rejected:

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Environment name"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of instances to create"

  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}
```

Test that valid values pass and invalid values fail:

```hcl
# tests/validation.tftest.hcl
# Tests for variable validation rules

run "valid_environment" {
  command = plan

  variables {
    environment    = "dev"
    instance_count = 3
  }

  # If the plan succeeds, the validation passed
  # No explicit assert needed - we are testing that it does not error
}

run "invalid_environment_rejected" {
  command = plan

  variables {
    environment    = "invalid"
    instance_count = 3
  }

  # Expect this plan to fail
  expect_failures = [
    var.environment,
  ]
}

run "instance_count_too_high" {
  command = plan

  variables {
    environment    = "dev"
    instance_count = 50
  }

  expect_failures = [
    var.instance_count,
  ]
}

run "instance_count_zero_rejected" {
  command = plan

  variables {
    environment    = "dev"
    instance_count = 0
  }

  expect_failures = [
    var.instance_count,
  ]
}
```

The `expect_failures` attribute is key for negative testing. It tells Terraform that the specified variables, resources, or outputs are expected to produce errors.

## Testing Outputs

You can verify that module outputs compute the correct values:

```hcl
# outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_cidrs" {
  value = [for s in aws_subnet.private : s.cidr_block]
}

output "environment_prefix" {
  value = upper(var.environment)
}
```

```hcl
# tests/outputs.tftest.hcl
# Tests for module outputs

run "output_values" {
  command = plan

  variables {
    environment = "production"
    vpc_cidr    = "10.0.0.0/16"
  }

  # Test computed output
  assert {
    condition     = output.environment_prefix == "PRODUCTION"
    error_message = "Environment prefix should be uppercased"
  }
}
```

## Testing Conditional Logic

Modules often contain conditional resource creation. Unit tests can verify that conditions work correctly:

```hcl
# main.tf
resource "aws_cloudwatch_log_group" "app" {
  count = var.enable_logging ? 1 : 0

  name              = "/app/${var.environment}"
  retention_in_days = var.log_retention_days
}

resource "aws_flow_log" "vpc" {
  count = var.enable_logging ? 1 : 0

  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  log_destination = aws_cloudwatch_log_group.app[0].arn
}
```

```hcl
# tests/conditionals.tftest.hcl
# Tests for conditional resource creation

run "logging_enabled" {
  command = plan

  variables {
    vpc_cidr           = "10.0.0.0/16"
    environment        = "production"
    enable_logging     = true
    log_retention_days = 30
  }

  # When logging is enabled, the log group should exist
  assert {
    condition     = length(aws_cloudwatch_log_group.app) == 1
    error_message = "Log group should be created when logging is enabled"
  }

  assert {
    condition     = aws_cloudwatch_log_group.app[0].retention_in_days == 30
    error_message = "Log retention should match the variable"
  }
}

run "logging_disabled" {
  command = plan

  variables {
    vpc_cidr           = "10.0.0.0/16"
    environment        = "dev"
    enable_logging     = false
    log_retention_days = 7
  }

  # When logging is disabled, no log group should be created
  assert {
    condition     = length(aws_cloudwatch_log_group.app) == 0
    error_message = "Log group should not be created when logging is disabled"
  }
}
```

## Testing for_each and count Logic

Dynamic resource creation with `for_each` can be tested to ensure the right number of resources are created:

```hcl
# main.tf
variable "subnets" {
  type = map(object({
    cidr = string
    az   = string
  }))
}

resource "aws_subnet" "this" {
  for_each = var.subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = each.key
  }
}
```

```hcl
# tests/for_each.tftest.hcl
# Tests for for_each resource creation

run "creates_correct_subnets" {
  command = plan

  variables {
    vpc_cidr    = "10.0.0.0/16"
    environment = "dev"
    subnets = {
      "private-a" = { cidr = "10.0.1.0/24", az = "us-east-1a" }
      "private-b" = { cidr = "10.0.2.0/24", az = "us-east-1b" }
      "public-a"  = { cidr = "10.0.3.0/24", az = "us-east-1a" }
    }
  }

  # Verify the correct number of subnets
  assert {
    condition     = length(aws_subnet.this) == 3
    error_message = "Should create exactly 3 subnets"
  }

  # Verify a specific subnet's CIDR
  assert {
    condition     = aws_subnet.this["private-a"].cidr_block == "10.0.1.0/24"
    error_message = "private-a subnet should have CIDR 10.0.1.0/24"
  }

  # Verify availability zone assignment
  assert {
    condition     = aws_subnet.this["private-b"].availability_zone == "us-east-1b"
    error_message = "private-b should be in us-east-1b"
  }
}
```

## Using Helper Modules in Tests

Sometimes you need shared setup across multiple test runs. Use the `module` block inside `run` to reference helper modules:

```hcl
# tests/with_helper.tftest.hcl

# Use a helper module to generate test data
run "setup" {
  command = plan

  module {
    source = "./tests/helpers/test-fixtures"
  }
}

run "test_with_fixture_data" {
  command = plan

  variables {
    vpc_cidr    = run.setup.test_vpc_cidr
    environment = run.setup.test_environment
  }

  assert {
    condition     = aws_vpc.main.cidr_block == run.setup.test_vpc_cidr
    error_message = "VPC should use the fixture CIDR"
  }
}
```

## Best Practices for Unit Testing Terraform

1. **Keep tests focused.** Each `run` block should test one specific behavior. Use descriptive names.

2. **Always use `command = plan` for unit tests.** This keeps tests fast and free of side effects.

3. **Test edge cases.** Empty lists, maximum values, special characters in names - anything that could break your logic.

4. **Use `expect_failures` for negative tests.** Verify that invalid inputs are rejected, not just that valid inputs are accepted.

5. **Organize test files by concern.** Have separate files for validation tests, output tests, conditional logic tests, and so on.

6. **Run tests in CI.** Add `terraform test` to your pull request checks. Tests that are not automated are tests that get skipped.

```bash
# Add to your CI pipeline
terraform init
terraform test
```

Unit tests with the built-in framework run in seconds and catch a surprising number of bugs. They are the fastest feedback loop you can get for Terraform code, and there is no reason not to write them for every module.

For deeper testing that creates real infrastructure, see [How to Write Integration Tests for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-write-integration-tests-for-terraform/view).
