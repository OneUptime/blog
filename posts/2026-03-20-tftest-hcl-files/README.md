# How to Write .tftest.hcl Files for OpenTofu Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Testing, Tftest, HCL, Infrastructure as Code

Description: Learn the syntax and structure of .tftest.hcl files used by OpenTofu's native testing framework, including run blocks, assertions, variables, and mock providers.

## Introduction

OpenTofu's native testing framework uses `.tftest.hcl` files to define test cases. These files use familiar HCL syntax and provide a declarative way to test your infrastructure configurations without needing a separate testing framework.

## File Structure

A `.tftest.hcl` file can contain:
- `variables` blocks - global variable overrides
- `run` blocks - individual test cases
- `mock_provider` blocks - provider mocks (OpenTofu 1.8+)
- `provider` blocks - provider configurations for tests

## Basic Test File

```hcl
# tests/networking.tftest.hcl

# Global variables applied to all runs

variables {
  environment = "test"
  region      = "us-east-1"
}

# First test case
run "vpc_is_created" {
  command = plan

  variables {
    name       = "test-vpc"
    cidr_block = "10.0.0.0/16"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block should be 10.0.0.0/16"
  }
}

# Second test case
run "subnets_are_created" {
  command = plan

  assert {
    condition     = length(aws_subnet.public) == 3
    error_message = "Should have 3 public subnets"
  }
}
```

## Run Block Options

```hcl
run "example" {
  # command: apply (default) or plan
  command = apply

  # Override variables for this run only
  variables {
    count = 5
  }

  # Override providers for this run
  providers = {
    aws = aws.alternate
  }

  # Expected failures (for input validation or custom conditions)
  expect_failures = [
    var.environment,
    check.web,
  ]
}
```

## Mock Providers

```hcl
mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id         = "vpc-mock00001"
      arn        = "arn:aws:ec2:us-east-1:123456789:vpc/vpc-mock00001"
    }
  }
}
```

## Provider Configuration in Tests

```hcl
provider "aws" {
  region = "eu-west-1"
  alias  = "eu"
}

run "eu_region_test" {
  providers = {
    aws = aws.eu
  }

  assert {
    condition     = aws_vpc.main.id != ""
    error_message = "VPC should be created in EU region"
  }
}
```

## Referencing Module Outputs in Assertions

```hcl
run "module_outputs" {
  command = apply

  assert {
    condition     = output.vpc_id != ""
    error_message = "vpc_id output should not be empty"
  }

  assert {
    condition     = length(output.subnet_ids) >= 2
    error_message = "Should output at least 2 subnet IDs"
  }
}
```

## Running Tests

```bash
# Run all .tftest.hcl files
tofu test

# Run a specific file
tofu test -filter=tests/networking.tftest.hcl

# Verbose output
tofu test -verbose
```

## Conclusion

`.tftest.hcl` files provide a clean, HCL-native way to test OpenTofu configurations. Their familiar syntax, combined with mock provider support and `expect_failures` for negative testing, makes them a powerful tool for validating infrastructure modules at every stage of development.
