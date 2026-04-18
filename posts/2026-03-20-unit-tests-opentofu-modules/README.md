# How to Write Unit Tests for OpenTofu Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to write unit tests for OpenTofu modules using mock providers and plan-mode testing to validate module logic without creating real infrastructure.

## Introduction

Unit tests in OpenTofu use `command = plan` with `mock_provider` blocks to validate module logic without creating any real infrastructure. They run quickly, require no cloud credentials, and can be included in fast CI checks. Unit tests are ideal for verifying variable handling, output values, and resource configuration logic.

## Unit Test vs Integration Test

| Aspect | Unit Test | Integration Test |
|--------|-----------|-----------------|
| `command` | `plan` | `apply` |
| Provider | `mock_provider` | Real provider |
| Speed | Seconds | Minutes |
| Cost | Free | Incurs costs |
| Creates real resources | No | Yes |
| Tests provider behavior | No | Yes |

## Basic Unit Test Structure

```hcl
# tests/unit.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      id            = "i-mock1234567890abcdef"
      public_ip     = "54.0.0.1"
      private_ip    = "10.0.1.10"
      instance_state = "running"
    }
  }

  mock_data "aws_ami" {
    defaults = {
      id   = "ami-mock123"
      name = "ubuntu-22.04"
    }
  }
}

variables {
  instance_type = "t3.micro"
  environment   = "test"
  name_prefix   = "test"
}

run "instance_uses_correct_type" {
  command = plan

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type must be t3.micro, got: ${aws_instance.web.instance_type}"
  }
}

run "instance_has_required_tags" {
  command = plan

  assert {
    condition     = aws_instance.web.tags["Environment"] == "test"
    error_message = "Environment tag must be 'test'"
  }

  assert {
    condition     = aws_instance.web.tags["Name"] != ""
    error_message = "Name tag must not be empty"
  }
}
```

## Testing Variable Validation

Use `expect_failures` to test that invalid input is rejected:

```hcl
# tests/validation.tftest.hcl

mock_provider "aws" {}

run "rejects_invalid_instance_type" {
  command = plan

  variables {
    # This should trigger variable validation failure
    instance_type = "m5.large"  # Not in the allowed list
  }

  # Expect this variable validation to fail
  expect_failures = [var.instance_type]
}

run "rejects_empty_environment" {
  command = plan

  variables {
    environment = ""
  }

  expect_failures = [var.environment]
}

run "accepts_valid_inputs" {
  command = plan

  variables {
    instance_type = "t3.micro"
    environment   = "production"
  }

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Valid instance type should be accepted"
  }
}
```

## Testing Module Outputs

```hcl
# tests/outputs.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id         = "vpc-mock123"
      cidr_block = "10.0.0.0/16"
    }
  }

  mock_resource "aws_subnet" {
    defaults = {
      id                = "subnet-mock123"
      availability_zone = "us-east-1a"
      cidr_block        = "10.0.1.0/24"
    }
  }
}

variables {
  vpc_cidr         = "10.0.0.0/16"
  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

run "outputs_vpc_id" {
  command = plan

  assert {
    condition     = output.vpc_id != ""
    error_message = "Module must output a vpc_id"
  }
}

run "outputs_correct_subnet_count" {
  command = plan

  assert {
    condition     = length(output.private_subnet_ids) == 3
    error_message = "Module must output 3 private subnet IDs"
  }
}
```

## Testing Conditional Resource Creation

```hcl
# tests/conditional.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_cloudwatch_log_group" {
    defaults = {
      id   = "/aws/test-log-group"
      name = "/aws/test-log-group"
    }
  }
}

run "does_not_create_log_group_when_disabled" {
  command = plan

  variables {
    enable_logging = false
  }

  assert {
    # When disabled, the count should be 0
    condition     = length([for r in aws_cloudwatch_log_group.app : r]) == 0
    error_message = "Log group should not be created when logging is disabled"
  }
}

run "creates_log_group_when_enabled" {
  command = plan

  variables {
    enable_logging = true
  }

  assert {
    condition     = length(aws_cloudwatch_log_group.app) == 1
    error_message = "Log group should be created when logging is enabled"
  }
}
```

## Running Unit Tests in CI

```yaml
# .github/workflows/unit-tests.yml

name: Unit Tests

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.8.0"

      - name: Run unit tests
        run: tofu test -filter=tests/unit.tftest.hcl -verbose
        working-directory: modules/my-module
        # No AWS credentials needed - uses mock providers
```

## Conclusion

Unit tests with mock providers let you validate module logic in seconds without any cloud credentials or costs. Focus unit tests on variable handling, conditional resource creation, output values, and validation rules. Use `expect_failures` to verify that your module correctly rejects invalid inputs. These fast tests are ideal for PR checks and should be the foundation of your module testing strategy.
