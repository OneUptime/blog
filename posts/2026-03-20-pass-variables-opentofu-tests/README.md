# How to Pass Variables to OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn the different ways to pass variable values to OpenTofu test runs, including inline variables blocks, -var flags, variable files, and environment variables.

## Introduction

OpenTofu tests need variable values to exercise your module under different conditions. There are several ways to provide variables: in the test file itself (top-level or per-run), on the command line with `-var`, using `.tfvars` files, or via environment variables. Understanding the precedence and scope of each method lets you write flexible, maintainable tests.

## Method 1: Variables Block in Test File

The top-level `variables` block applies to all run blocks in the file:

```hcl
# tests/unit.tftest.hcl

# These apply to all run blocks unless overridden

variables {
  region         = "us-east-1"
  environment    = "test"
  instance_type  = "t3.micro"
  enable_backups = false
}

mock_provider "aws" {}

run "test_with_global_variables" {
  command = plan

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Should use global variable value"
  }
}
```

## Method 2: Per-Run Variables Block

Override or add variables for a specific run block:

```hcl
variables {
  instance_type = "t3.micro"
  environment   = "test"
}

mock_provider "aws" {}

run "test_default_instance" {
  command = plan
  # Uses global variables: t3.micro, test

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Should use t3.micro"
  }
}

run "test_large_instance" {
  command = plan

  # Overrides instance_type only; environment still = "test"
  variables {
    instance_type = "t3.large"
  }

  assert {
    condition     = aws_instance.web.instance_type == "t3.large"
    error_message = "Should use t3.large in this run"
  }
}

run "test_production_config" {
  command = plan

  # Override both variables for this run
  variables {
    instance_type = "m5.xlarge"
    environment   = "production"
  }

  assert {
    condition     = aws_instance.web.tags["Environment"] == "production"
    error_message = "Should use production environment"
  }
}
```

## Method 3: -var Flag on Command Line

Pass variables when running tests:

```bash
# Single variable
tofu test -var="environment=staging"

# Multiple variables
tofu test -var="environment=production" -var="instance_type=m5.large"

# Note: variables blocks in the test file override -var flags,
# so -var only takes effect for variables not already set in a variables block.
tofu test tests/unit.tftest.hcl -var="region=eu-west-1"
```

## Method 4: Variable Files

Use `.tfvars` files to pass multiple variables:

```hcl
# tests/test.tfvars
environment   = "test"
instance_type = "t3.micro"
region        = "us-east-1"
```

```bash
# Use a tfvars file
tofu test -var-file="tests/test.tfvars"

# Multiple var files (later files override earlier ones)
tofu test -var-file="base.tfvars" -var-file="test-overrides.tfvars"
```

## Method 5: Environment Variables

Variables can be set via `TF_VAR_*` environment variables:

```bash
export TF_VAR_environment=test
export TF_VAR_instance_type=t3.micro
export TF_VAR_region=us-east-1

tofu test
```

## Variable Precedence (Highest to Lowest)

1. Per-run `variables {}` block (overrides top-level)
2. Top-level `variables {}` block in test file
3. `-var` and `-var-file` command-line flags (in the order they appear)
4. `tfvars` files in the tests directory (`tests/terraform.tfvars` and `tests/*.auto.tfvars`)
5. `tfvars` files in the current directory (`terraform.tfvars` and `*.auto.tfvars`)
6. `TF_VAR_*` environment variables
7. Variable default values in the module

## Practical Patterns

### Environment-specific test variables

```hcl
# tests/staging.tfvars
environment    = "staging"
instance_type  = "t3.small"
enable_backups = true
```

```bash
# Run tests with staging configuration
tofu test -var-file="tests/staging.tfvars"
```

### Secrets via environment variables

```bash
# Don't put secrets in test files - use environment variables
export TF_VAR_db_password="test-password-not-real"
export TF_VAR_api_key="test-api-key"

tofu test tests/integration.tftest.hcl
```

### Testing multiple environments in CI

```yaml
# .github/workflows/test.yml
strategy:
  matrix:
    environment: [dev, staging, production]

steps:
  - name: Run tests
    run: tofu test -var="environment=${{ matrix.environment }}"
```

## Conclusion

Use top-level `variables` blocks for defaults shared across all runs in a file, per-run `variables` blocks to test different scenarios, and `-var` or `-var-file` flags for environment-specific or secret values. Keep secrets out of test files by using environment variables or CI secret injection. The layered variable precedence system gives you fine-grained control over what each test run sees.
