# How to Test OpenTofu Modules in Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Testing, Module, Isolation, Infrastructure as Code

Description: Learn how to test OpenTofu modules in isolation using mock providers, plan-only tests, and fixture configurations to validate module behavior without deploying real infrastructure.

## Introduction

Testing modules in isolation means validating a module's logic - variable handling, resource configurations, and outputs - without creating actual cloud resources. This makes tests fast, free, and safe to run on every pull request.

## Plan-Only Tests

Use `command = plan` to test without deploying infrastructure:

```hcl
# tests/unit/main.tftest.hcl

variables {
  name        = "test-module"
  environment = "dev"
  cidr_block  = "10.0.0.0/16"
}

run "validate_vpc_configuration" {
  command = plan

  assert {
    condition     = aws_vpc.main.cidr_block == var.cidr_block
    error_message = "VPC CIDR does not match input variable"
  }

  assert {
    condition     = aws_vpc.main.tags["Environment"] == var.environment
    error_message = "Environment tag not set correctly"
  }
}
```

## Using Mock Providers (OpenTofu 1.8+)

Mock providers allow you to test without real credentials:

```hcl
# tests/unit/mock.tftest.hcl
mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id         = "vpc-mock12345"
      cidr_block = "10.0.0.0/16"
    }
  }

  mock_resource "aws_subnet" {
    defaults = {
      id = "subnet-mock12345"
    }
  }
}

run "test_with_mock" {
  command = plan

  assert {
    condition     = length(aws_subnet.public) == 3
    error_message = "Should create 3 public subnets"
  }
}
```

## Fixture-Based Isolation

Create a minimal fixture that only calls your module:

```hcl
# tests/fixtures/minimal/main.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cidr_block" {
  type = string
}

module "networking" {
  source      = "../../../"
  name        = var.name
  environment = var.environment
  cidr_block  = var.cidr_block
}

output "vpc_id"    { value = module.networking.vpc_id }
output "subnet_ids" { value = module.networking.subnet_ids }
```

Test the fixture:

```hcl
run "fixture_test" {
  module {
    source = "./tests/fixtures/minimal"
  }

  variables {
    name        = "isolated-test"
    environment = "dev"
    cidr_block  = "10.0.0.0/16"
  }

  command = plan
}
```

## Data Source Overrides for Isolation

Use `override_data` blocks in tests to substitute dependencies:

```hcl
# tests/unit/main.tftest.hcl
override_data {
  target = data.aws_availability_zones.available

  values = {
    names = ["us-east-1a", "us-east-1b", "us-east-1c"]
  }
}
```

## Running Isolated Tests

```bash
# Fast unit tests only
tofu test --test-directory=tests/unit

# Verbose output
tofu test --test-directory=tests/unit -verbose
```

## Conclusion

Testing modules in isolation using plan-only commands and mock providers dramatically speeds up your testing feedback loop. Reserve integration tests that deploy real infrastructure for CI/CD pipelines, and use isolated unit tests locally for rapid development iteration.
