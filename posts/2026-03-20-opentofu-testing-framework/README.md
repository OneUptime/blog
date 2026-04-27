# How to Set Up the OpenTofu Testing Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to set up and run the OpenTofu native testing framework using .tftest.hcl and .tofutest.hcl test files for infrastructure testing.

## Introduction

OpenTofu 1.6+ includes a native testing framework that allows you to write automated tests for your infrastructure modules. Tests are written in `.tftest.hcl` or `.tofutest.hcl` files and run with `tofu test`. The framework supports unit tests with mocked providers and integration tests against real infrastructure.

## Prerequisites

- OpenTofu 1.6 or later
- A module to test
- AWS credentials (for integration tests) or mocked providers (for unit tests)

## Basic Module Structure

```text
my-module/
├── main.tf
├── variables.tf
├── outputs.tf
└── tests/
    ├── unit.tftest.hcl
    └── integration.tftest.hcl
```

## Writing Your First Test File

```hcl
# tests/unit.tftest.hcl

# Variables to use across test runs

variables {
  instance_type = "t3.micro"
  environment   = "test"
}

# A run block defines one test scenario
run "creates_instance_with_correct_type" {
  # Use command = plan for unit tests (no real resources created)
  command = plan

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type should be t3.micro"
  }
}

run "tags_are_set_correctly" {
  command = plan

  assert {
    condition     = aws_instance.web.tags["Environment"] == "test"
    error_message = "Environment tag not set correctly"
  }
}
```

## Running Tests

```bash
# Run all tests in the current module
tofu test

# Run tests in a specific directory
tofu test -test-directory=tests/

# Run a specific test file
tofu test -filter=tests/unit.tftest.hcl

# Verbose output showing each assertion
tofu test -verbose

# Run with a specific variable value
tofu test -var="instance_type=t3.small"
```

## Test Output

```bash
tofu test

# tests/unit.tftest.hcl... in progress
#   run "creates_instance_with_correct_type"... pass
#   run "tags_are_set_correctly"... pass
# tests/unit.tftest.hcl... tearing down
# tests/unit.tftest.hcl... pass
#
# Success! 2 passed, 0 failed.
```

## Test File with Mock Providers

For true unit tests that don't require real AWS credentials:

```hcl
# tests/unit_with_mocks.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      id         = "i-mock1234567890"
      public_ip  = "54.1.2.3"
      private_ip = "10.0.1.5"
      arn        = "arn:aws:ec2:us-east-1:123456789012:instance/i-mock1234567890"
    }
  }
}

variables {
  instance_type = "t3.micro"
  environment   = "test"
}

run "plan_succeeds_with_mock" {
  command = plan

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type not set correctly"
  }
}
```

## Integration Test Structure

```hcl
# tests/integration.tftest.hcl

variables {
  instance_type = "t3.micro"
  environment   = "test"
  region        = "us-east-1"
}

# Setup phase: create prerequisite resources
run "setup_vpc" {
  module {
    source = "./tests/setup"
  }
}

# Main test: apply and validate
run "creates_instance_successfully" {
  command = apply

  assert {
    condition     = aws_instance.web.public_ip != ""
    error_message = "Instance should have a public IP after creation"
  }

  assert {
    condition     = aws_instance.web.instance_state == "running"
    error_message = "Instance should be in running state"
  }
}
```

## Test Directory Organization

```text
my-module/
├── main.tf
├── variables.tf
├── outputs.tf
└── tests/
    ├── setup/             # Helper module for test prerequisites
    │   ├── main.tf
    │   └── outputs.tf
    ├── unit.tftest.hcl    # Fast tests with mocked providers
    └── integration.tftest.hcl  # Slow tests against real AWS
```

## Environment Variables for Tests

```bash
# Set variables for test runs
export TF_VAR_environment=test
export TF_VAR_region=us-east-1

# AWS credentials for integration tests
export AWS_PROFILE=test-account
export AWS_DEFAULT_REGION=us-east-1

tofu test -filter=tests/integration.tftest.hcl
```

## Conclusion

The OpenTofu testing framework provides a native way to test infrastructure modules without third-party tools. Start with unit tests using mocked providers for fast feedback, then add integration tests for end-to-end validation. Organize tests in a `tests/` directory, use `command = plan` for unit tests, and `command = apply` for integration tests. The `tofu test` command integrates naturally into CI/CD pipelines.
