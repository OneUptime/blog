# How to Test with Plan in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to use command = plan in OpenTofu test run blocks to validate module configuration without creating real infrastructure.

## Introduction

OpenTofu tests support two modes: `command = plan` and `command = apply`. Plan-mode tests run `tofu plan` as part of `tofu test` and validate the planned changes without creating any real resources. This can make them fast and safe for unit-style testing, especially when you use `mock_provider` or offline provider configuration. Understanding what you can and cannot test with plan helps you write effective tests.

## Plan Mode Basics

```hcl
run "test_name" {
  # command = apply is the default - set plan explicitly
  command = plan

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type should be t3.micro"
  }
}
```

## What Plan Mode Tests

In plan mode, you can assert against:

- **Known configuration values**: Variables, literal values, expressions
- **Values that are known at plan time**: Most resource arguments you explicitly set
- **Output values derived from known values**: Computed from variables and literals

```hcl
mock_provider "aws" {}

variables {
  instance_type = "t3.micro"
  environment   = "production"
  name_prefix   = "myapp"
}

run "validates_configuration" {
  command = plan

  # ✅ Can test: values you set in config
  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type from variable not applied"
  }

  # ✅ Can test: tags computed from variables
  assert {
    condition     = aws_instance.web.tags["Environment"] == "production"
    error_message = "Environment tag not set from variable"
  }

  # ✅ Can test: resource counts
  assert {
    condition     = length(aws_subnet.private) == 3
    error_message = "Should plan 3 private subnets"
  }
}
```

## What Plan Mode Cannot Test

Provider-computed values are unknown at plan time (unless using mock_provider):

```hcl
# Without mock_provider, these are UNKNOWN at plan time:

# - aws_instance.web.public_ip (assigned by AWS)
# - aws_instance.web.id (assigned by AWS)
# - aws_db_instance.main.endpoint (computed by RDS)

# With mock_provider, you control these values:
mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      public_ip = "54.1.2.3"  # Now knowable at plan time
      id        = "i-mock123"
    }
  }
}

run "can_now_test_computed_values" {
  command = plan

  assert {
    condition     = aws_instance.web.public_ip == "54.1.2.3"
    error_message = "Public IP should match mock value"
  }
}
```

## Testing Preconditions with Plan

Plan mode is the right mode for testing preconditions that can be evaluated during planning:

```hcl
mock_provider "aws" {}

run "rejects_non_production_size_in_prod" {
  command = plan

  variables {
    environment    = "production"
    instance_class = "db.t3.micro"  # Too small for prod
  }

  # Expect the precondition to fail
  expect_failures = [aws_db_instance.main]
}

run "accepts_correct_size_in_prod" {
  command = plan

  variables {
    environment    = "production"
    instance_class = "db.r5.large"  # Correct size for prod
  }

  assert {
    condition     = aws_db_instance.main.instance_class == "db.r5.large"
    error_message = "Instance class should be db.r5.large in production"
  }
}
```

## Testing Output Values in Plan Mode

```hcl
mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      id  = "i-mock123"
      arn = "arn:aws:ec2:us-east-1:123456789012:instance/i-mock123"
    }
  }
}

variables {
  environment = "prod"
  name        = "web-server"
}

run "outputs_are_populated" {
  command = plan

  assert {
    condition     = output.instance_id == "i-mock123"
    error_message = "Instance ID output should match mock value"
  }

  assert {
    condition     = output.instance_name == "prod-web-server"
    error_message = "Instance name output has wrong format: ${output.instance_name}"
  }
}
```

## Plan Mode for Conditional Logic

```hcl
mock_provider "aws" {}

run "creates_log_group_when_enabled" {
  command = plan
  variables {
    enable_logging = true
  }

  assert {
    condition     = length(aws_cloudwatch_log_group.app) == 1
    error_message = "Log group should be planned when logging is enabled"
  }
}

run "skips_log_group_when_disabled" {
  command = plan
  variables {
    enable_logging = false
  }

  assert {
    condition     = length(aws_cloudwatch_log_group.app) == 0
    error_message = "Log group should not be planned when logging is disabled"
  }
}
```

## Plan vs Apply Decision

| Use `command = plan` when... | Use `command = apply` when... |
|------------------------------|-------------------------------|
| Testing configuration logic | Testing actual resource creation |
| Testing validation rules | Verifying provider behavior |
| Running mocked or offline tests in CI | Running in integration test environment |
| Testing conditionals and counts | Testing outputs from real resources |

## Conclusion

Plan-mode tests are the foundation of fast module testing without creating infrastructure. Use them to validate configuration logic, variable handling, conditional resource creation, and output format. Combine with `mock_provider` to make provider-computed values testable at plan time and to run credential-free tests. Reserve `command = apply` for integration tests that need to validate actual infrastructure behavior.
