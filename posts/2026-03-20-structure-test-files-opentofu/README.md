# How to Structure Test Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn best practices for organizing and structuring OpenTofu test files, including directory layout, naming conventions, and separating unit from integration tests.

## Introduction

Well-structured test files make tests easy to find, run selectively, and maintain over time. OpenTofu is flexible about where test files live, but consistent conventions across your project reduce cognitive overhead. This guide covers directory layout, naming, and organizational patterns that work well for real-world module testing.

## Recommended Directory Structure

```text
modules/my-module/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── tests/
    ├── setup/                   # Setup helper module
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── fixtures/                # Variable fixtures
    │   ├── minimal.tfvars       # Bare minimum variables
    │   ├── full.tfvars          # All features enabled
    │   └── production.tfvars   # Production-like config
    ├── unit.tftest.hcl          # Fast unit tests (mocked providers)
    ├── validation.tftest.hcl    # Variable validation tests
    ├── outputs.tftest.hcl       # Output value tests
    └── integration.tftest.hcl  # Slow integration tests (real AWS)
```

## File Naming Conventions

| File | Purpose | Command | Speed |
|------|---------|---------|-------|
| `unit.tftest.hcl` | Core logic tests | `plan` | Fast |
| `validation.tftest.hcl` | Input validation tests | `plan` | Fast |
| `outputs.tftest.hcl` | Output value tests | `plan` | Fast |
| `integration.tftest.hcl` | End-to-end tests | `apply` | Slow |
| `*.tofutest.hcl` | Alternative extension | Either | Either |

## Unit Test File Structure

```hcl
# tests/unit.tftest.hcl

# Fast tests - no real cloud resources, no credentials needed

# ──── Provider Mocks ────────────────────────────────────────────────────────
mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      id        = "i-mock1234"
      public_ip = "54.0.0.1"
    }
  }
}

# ──── Shared Variables ───────────────────────────────────────────────────────
variables {
  instance_type = "t3.micro"
  environment   = "test"
  name_prefix   = "unit-test"
}

# ──── Test Cases ─────────────────────────────────────────────────────────────
run "instance_type_from_variable" {
  command = plan
  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type should come from variable"
  }
}

run "name_tag_uses_prefix" {
  command = plan
  assert {
    condition     = startswith(aws_instance.web.tags["Name"], "unit-test")
    error_message = "Name tag should use prefix: ${aws_instance.web.tags["Name"]}"
  }
}
```

## Validation Test File Structure

```hcl
# tests/validation.tftest.hcl
# Tests that invalid inputs are correctly rejected

mock_provider "aws" {}

# Test valid inputs
run "accepts_valid_environment" {
  command = plan
  variables {
    environment = "production"
  }
  # No expect_failures - should succeed
  assert {
    condition     = var.environment == "production"
    error_message = "Environment should be set to production"
  }
}

# Test invalid inputs
run "rejects_invalid_environment" {
  command = plan
  variables {
    environment = "invalid-env"
  }
  expect_failures = [var.environment]
}

run "rejects_empty_name" {
  command = plan
  variables {
    name = ""
  }
  expect_failures = [var.name]
}
```

## Integration Test File Structure

```hcl
# tests/integration.tftest.hcl
# Slow tests - creates real AWS resources, requires credentials

# ──── Variables ──────────────────────────────────────────────────────────────
variables {
  region      = "us-east-1"
  environment = "test"
  suffix      = "it-${formatdate("MMDDhhmmss", timestamp())}"
}

# ──── Setup Phase ─────────────────────────────────────────────────────────────
run "setup_prerequisites" {
  module {
    source = "./tests/setup"
  }
  variables {
    suffix   = var.suffix
    vpc_cidr = "10.100.0.0/16"
  }
}

# ──── Test Phase ──────────────────────────────────────────────────────────────
run "creates_resources" {
  command = apply
  variables {
    vpc_id = run.setup_prerequisites.vpc_id
    suffix = var.suffix
  }
  assert {
    condition     = output.resource_id != ""
    error_message = "Resource should be created"
  }
}

# ──── Verify Phase ────────────────────────────────────────────────────────────
run "resources_are_accessible" {
  command = apply
  assert {
    condition     = output.status == "available"
    error_message = "Resource should be available: ${output.status}"
  }
}

# ──── Teardown happens automatically ─────────────────────────────────────────
```

## Running Test Subsets

```bash
# Run only unit tests (fast, for development)
tofu test -filter=tests/unit.tftest.hcl -filter=tests/validation.tftest.hcl -filter=tests/outputs.tftest.hcl

# Run only integration tests (slow, for CI)
tofu test -filter=tests/integration.tftest.hcl

# Run all tests
tofu test
```

## Makefile for Test Targets

```makefile
.PHONY: test test-unit test-integration

test-unit:
	tofu test -filter=tests/unit.tftest.hcl -filter=tests/validation.tftest.hcl -filter=tests/outputs.tftest.hcl -verbose

test-integration:
	tofu test -filter=tests/integration.tftest.hcl -verbose

test: test-unit test-integration
```

## Conclusion

Separate test files by type (unit, validation, outputs, integration) for easy selective execution. Put shared setup infrastructure in a `tests/setup/` module and variable fixtures in `tests/fixtures/`. Use consistent naming so developers know which tests are fast (unit/validation) vs slow (integration). This structure scales from simple modules to complex multi-module projects.
