# How to Generate Test Configurations in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to generate test configuration scaffolding for OpenTofu modules and use helper modules to set up test prerequisites.

## Introduction

Writing test configurations from scratch for every module is repetitive. OpenTofu's testing framework supports a modular approach where helper modules can create prerequisites and wrap the module under test, shared variables reduce duplication, and helper scripts generate boilerplate. This guide covers patterns for generating and organizing test configurations efficiently.

## Test Helper Modules

A helper module can create prerequisites and call the module under test in the same run:

```text
tests/
├── setup/              # Helper module that creates test prerequisites
│   ├── main.tf         # Creates VPC, subnets, etc.
│   ├── variables.tf
│   └── outputs.tf
├── unit.tftest.hcl
└── integration.tftest.hcl
```

```hcl
# tests/setup/main.tf

resource "aws_vpc" "test" {
  cidr_block = var.vpc_cidr
  tags = { Name = "test-vpc-${var.test_suffix}" }
}

resource "aws_subnet" "test" {
  vpc_id     = aws_vpc.test.id
  cidr_block = cidrsubnet(var.vpc_cidr, 8, 1)
}

module "main" {
  source    = "../.."
  vpc_id    = aws_vpc.test.id
  subnet_id = aws_subnet.test.id
}
```

```hcl
# tests/setup/outputs.tf
output "vpc_id" {
  value = aws_vpc.test.id
}

output "subnet_id" {
  value = aws_subnet.test.id
}

output "resource_id" {
  value = module.main.resource_id
}
```

```hcl
# tests/integration.tftest.hcl

variables {
  vpc_cidr    = "10.100.0.0/16"
  test_suffix = "test-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}

# Run the helper module, which creates prerequisites and invokes the module under test
run "create_main_resource" {
  module {
    source = "./tests/setup"
  }

  variables {
    vpc_cidr    = var.vpc_cidr
    test_suffix = var.test_suffix
  }

  assert {
    condition     = output.resource_id != ""
    error_message = "Resource should be created successfully"
  }
}
```

## Generating Test File Templates

A shell script to scaffold a new test file for a module:

```bash
#!/bin/bash
# generate-tests.sh - generate test scaffolding for a module

MODULE_NAME=$1
TESTS_DIR="tests"

mkdir -p "$TESTS_DIR/setup"

# Generate unit test file
cat > "$TESTS_DIR/unit.tftest.hcl" << EOF
# Unit tests for $MODULE_NAME module
# Run with: tofu test -filter=tests/unit.tftest.hcl

mock_provider "aws" {}

variables {
  # TODO: Add default variable values for testing
}

run "plan_succeeds_with_defaults" {
  command = plan
  # TODO: Add assert blocks that reference real resources or outputs.
}
EOF

# Generate integration test file
cat > "$TESTS_DIR/integration.tftest.hcl" << EOF
# Integration tests for $MODULE_NAME module
# Run with: tofu test -filter=tests/integration.tftest.hcl
# Requires: AWS credentials

variables {
  # TODO: Add variable values for integration testing
}

run "creates_resources_successfully" {
  command = apply
  # TODO: Add assert blocks that reference real resources or outputs.
}
EOF

echo "Generated test files in $TESTS_DIR/"
```

## Module Block for Alternate Configurations

Use `module` blocks in run blocks to test different module sources:

```hcl
# Test the current version of the module
run "test_current_version" {
  command = plan
  # Uses the module in the current directory (default)

  assert {
    condition     = output.result != ""
    error_message = "Current version should produce output"
  }
}

# Test a specific version from the registry
run "test_v1_compatibility" {
  module {
    source  = "registry.terraform.io/my-org/my-module/aws"
    version = "1.0.0"
  }

  command = plan

  assert {
    condition     = output.result != ""
    error_message = "v1.0.0 should still produce output"
  }
}
```

## Reusing Variables Across Test Files

Create a shared variables file:

```hcl
# tests/common.tfvars
region          = "us-east-1"
environment     = "test"
organization    = "acme"
default_tags = {
  ManagedBy   = "opentofu"
  Environment = "test"
}
```

```bash
# Reference common variables in all test runs
tofu test -filter=tests/unit.tftest.hcl -var-file="tests/common.tfvars"
tofu test -filter=tests/integration.tftest.hcl -var-file="tests/common.tfvars"
```

## Generating Configuration with tofu plan -generate-config-out

For modules with import blocks, generate configuration:

```bash
# Generate configuration from existing resources
tofu plan -generate-config-out=generated.tf

# Then write tests against the generated configuration
```

## Complete Test Scaffolding Example

```text
modules/ec2-instance/
├── main.tf
├── variables.tf
├── outputs.tf
└── tests/
    ├── setup/
    │   ├── main.tf       # Creates VPC for integration tests
    │   └── outputs.tf
    ├── fixtures/
    │   ├── basic.tfvars  # Minimal variable set
    │   └── full.tfvars   # All features enabled
    ├── unit.tftest.hcl
    ├── validation.tftest.hcl
    └── integration.tftest.hcl
```

## Conclusion

Organize your test configurations with helper modules that create prerequisites and invoke the module under test in a single run, shared variable files for common values, and separate files for unit vs integration tests. Use shell scripts to generate boilerplate when creating new modules. The `module` block in run blocks enables testing the same scenarios against different module versions, which is particularly valuable for library modules used across multiple projects.
