# How to Write Test Configuration Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn the structure and syntax of OpenTofu test configuration files (.tftest.hcl and .tofutest.hcl) including run blocks, variables, providers, and assertions.

## Introduction

OpenTofu test files use the `.tftest.hcl` (or `.tofutest.hcl`) extension and can contain blocks such as `variables`, `provider`, `mock_provider`, `override_resource`, `override_data`, `override_module`, and `run`. Understanding the structure of test files lets you write clear, maintainable tests for your infrastructure modules.

## Test File Top-Level Blocks

```hcl
# Top-level variables block - applies to all run blocks

variables {
  region      = "us-east-1"
  environment = "test"
}

# Top-level provider override - replaces provider config in module
provider "aws" {
  region = "us-east-1"
}

# Mock provider definition for unit tests
mock_provider "aws" {
  alias = "mock"
}

# Run blocks define individual test scenarios
run "test_scenario_name" {
  command = plan  # or apply
  # ...
}
```

## Variables Block

The top-level `variables` block sets defaults for all run blocks. Individual run blocks can override them:

```hcl
# Default values for all runs
variables {
  instance_type  = "t3.micro"
  disk_size      = 20
  environment    = "test"
  enable_backups = false
}

run "test_with_defaults" {
  command = plan

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Should use default instance type"
  }
}

run "test_with_override" {
  command = plan

  # Override variables for this specific run
  variables {
    instance_type = "t3.large"
    disk_size     = 100
  }

  assert {
    condition     = aws_instance.web.instance_type == "t3.large"
    error_message = "Should use overridden instance type"
  }
}
```

## Provider Block

Override provider configuration for tests:

```hcl
# Override AWS region for all tests in this file
provider "aws" {
  region = "us-west-2"

  # Use a test-specific profile
  profile = "test-account"
}

run "creates_in_correct_region" {
  command = plan

  assert {
    condition     = aws_instance.web.availability_zone != ""
    error_message = "Instance should be in us-west-2"
  }
}
```

## Mock Provider Block

Define mock providers and their default return values:

```hcl
mock_provider "aws" {
  # Mock specific resource types
  mock_resource "aws_instance" {
    defaults = {
      id            = "i-0123456789abcdef0"
      public_ip     = "54.0.0.1"
      private_ip    = "10.0.1.10"
      instance_state = "running"
      arn           = "arn:aws:ec2:us-east-1:123456789012:instance/i-0123456789"
    }
  }

  mock_data "aws_ami" {
    defaults = {
      id           = "ami-0123456789abcdef0"
      name         = "ubuntu-22.04-server"
      architecture = "x86_64"
    }
  }
}

run "unit_test_with_mocks" {
  command = plan

  assert {
    condition     = aws_instance.web.instance_type == var.instance_type
    error_message = "Instance type not set from variable"
  }
}
```

## Run Block Structure

Each `run` block represents a test scenario:

```hcl
run "complete_run_block_example" {
  # command: apply (default) or plan
  command = plan

  # Override the module to test (optional)
  module {
    source = "./alternate-module"
  }

  # Variable overrides for this run only
  variables {
    environment = "staging"
  }

  # Expected custom condition failures (for negative tests)
  expect_failures = [
    aws_instance.web,  # This resource's precondition/postcondition should fail
    var.instance_type, # This variable validation should fail
  ]

  # Assertions that must pass
  assert {
    condition     = output.instance_id != ""
    error_message = "Instance ID output should not be empty"
  }

  assert {
    condition     = length(output.subnet_ids) == 3
    error_message = "Should create 3 subnets, got: ${length(output.subnet_ids)}"
  }
}
```

## Multiple Run Blocks with State Sharing

Run blocks that target the same module share state within the test file by default:

```hcl
variables {
  bucket_name = "example-test-bucket-12345"
}

run "create_bucket" {
  command = apply

  assert {
    condition     = aws_s3_bucket.main.bucket == var.bucket_name
    error_message = "Bucket created with wrong name"
  }
}

# This run sees the state from the previous run because it targets the same module
run "verify_versioning" {
  command = apply

  assert {
    condition     = aws_s3_bucket_versioning.main.versioning_configuration[0].status == "Enabled"
    error_message = "Versioning should be enabled after second apply"
  }
}
```

## File Naming Conventions

```bash
tests/
├── main.tftest.hcl          # Primary test file
├── unit.tftest.hcl          # Unit tests with mocked providers
├── integration.tftest.hcl   # Integration tests (real resources)
├── validation.tftest.hcl    # Variable validation tests
└── outputs.tftest.hcl       # Output value tests
```

Both `.tftest.hcl` and `.tofutest.hcl` extensions are recognized by `tofu test`.

## Conclusion

OpenTofu test files are organized around `run` blocks, with optional `variables`, `provider`, `mock_provider`, and override blocks. Use top-level `variables` for shared defaults and override them per run block. Mock providers eliminate the need for real credentials in unit tests. Multiple run blocks that target the same module share state, enabling multi-step test scenarios that simulate real deployment sequences.
