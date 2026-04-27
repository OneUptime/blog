# Testing OpenTofu Modules with tofu test

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Testing

Description: Learn how to write and run unit and integration tests for your OpenTofu modules using the built-in tofu test command.

OpenTofu's built-in testing framework lets you write tests directly in HCL. Tests verify that your modules behave correctly, validate outputs, and catch regressions before they reach production.

## Basic Test Structure

Test files use the `.tftest.hcl` extension:

```hcl
# tests/basic.tftest.hcl

run "creates_vpc_with_correct_cidr" {
  command = plan

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block should be 10.0.0.0/16"
  }
}
```

## Running Tests

```bash
# Run all tests

tofu test

# Run tests in a specific directory
tofu test -test-directory=tests

# Run a specific test file
tofu test -filter=tests/basic.tftest.hcl

# Verbose output
tofu test -verbose
```

## Test Commands: plan vs apply

```hcl
# plan: validates configuration without creating resources (fast, free)
run "validate_configuration" {
  command = plan

  assert {
    condition     = var.environment == "prod" ? var.instance_type == "t3.large" : true
    error_message = "Production requires t3.large instances"
  }
}

# apply: actually creates resources (slower, may cost money)
run "creates_real_resources" {
  command = apply

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC ID should not be empty after apply"
  }
}
```

## Module Test with Variables

```hcl
# tests/module_test.tftest.hcl

variables {
  environment = "test"
  vpc_cidr    = "10.0.0.0/16"
  region      = "us-east-1"
}

run "plan_succeeds" {
  command = plan
}

run "creates_vpc" {
  command = apply

  assert {
    condition     = module.vpc.vpc_id != null
    error_message = "VPC should be created"
  }

  assert {
    condition     = module.vpc.vpc_cidr == var.vpc_cidr
    error_message = "VPC CIDR should match input variable"
  }
}

run "vpc_has_subnets" {
  command = apply

  assert {
    condition     = length(module.vpc.public_subnet_ids) >= 2
    error_message = "Should create at least 2 public subnets"
  }

  assert {
    condition     = length(module.vpc.private_subnet_ids) >= 2
    error_message = "Should create at least 2 private subnets"
  }
}
```

## Overriding Variables per Run Block

```hcl
# Default variables for all tests
variables {
  region      = "us-east-1"
  environment = "test"
}

run "small_deployment" {
  variables {
    instance_count = 1
    instance_type  = "t3.micro"
  }

  command = plan

  assert {
    condition     = aws_autoscaling_group.main.min_size == 1
    error_message = "Should have min size of 1"
  }
}

run "large_deployment" {
  variables {
    instance_count = 10
    instance_type  = "m5.xlarge"
  }

  command = plan

  assert {
    condition     = aws_autoscaling_group.main.min_size == 10
    error_message = "Should have min size of 10"
  }
}
```

## Testing with Mock Providers

For unit testing without real cloud credentials:

```hcl
# tests/unit.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id         = "vpc-mock12345"
      arn        = "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-mock12345"
      cidr_block = "10.0.0.0/16"
    }
  }

  mock_resource "aws_subnet" {
    defaults = {
      id  = "subnet-mock12345"
      arn = "arn:aws:ec2:us-east-1:123456789012:subnet/subnet-mock12345"
    }
  }
}

run "unit_test_with_mocks" {
  command = apply  # Uses mock provider - no real AWS calls

  assert {
    condition     = output.vpc_id == "vpc-mock12345"
    error_message = "VPC ID should come from mock"
  }
}
```

## Test Setup and Teardown

```hcl
# tests/integration.tftest.hcl

# setup block creates prerequisites
run "setup_networking" {
  module {
    source = "./tests/fixtures/networking"
  }

  command = apply
}

run "test_application_deployment" {
  variables {
    vpc_id = run.setup_networking.vpc_id
  }

  command = apply

  assert {
    condition     = output.app_url != ""
    error_message = "Application URL should be set"
  }
}
```

## Example Module with Tests

```hcl
# modules/s3-bucket/main.tf
resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name
  tags   = var.tags
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}
```

```hcl
# modules/s3-bucket/tests/defaults.tftest.hcl
variables {
  bucket_name = "test-bucket-${uuid()}"
}

mock_provider "aws" {}

run "versioning_disabled_by_default" {
  command = plan

  assert {
    condition     = aws_s3_bucket_versioning.main.versioning_configuration[0].status == "Suspended"
    error_message = "Versioning should be disabled by default"
  }
}

run "versioning_can_be_enabled" {
  variables {
    versioning_enabled = true
  }

  command = plan

  assert {
    condition     = aws_s3_bucket_versioning.main.versioning_configuration[0].status == "Enabled"
    error_message = "Versioning should be enabled when requested"
  }
}
```

## Conclusion

The `tofu test` command brings first-class testing to infrastructure code. Use plan-based tests for fast validation during development and apply-based tests for integration verification. Mock providers enable unit testing without cloud costs or credentials. Investing in module tests catches regressions early and builds confidence in your infrastructure modules.
