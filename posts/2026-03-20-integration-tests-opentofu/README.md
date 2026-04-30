# How to Set Up Integration Tests for OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Integration Test, Cloud Testing, Infrastructure Testing

Description: Learn how to write integration tests for OpenTofu configurations using the native test framework's apply mode to validate real infrastructure creation, connectivity, and behavior.

## Introduction

Integration tests use `command = apply` in OpenTofu test files to create real infrastructure, validate it, and destroy it after the run completes. Unlike unit tests with mock providers, integration tests verify that your module works with the actual cloud provider - catching API changes, permission issues, and configuration errors that mocks cannot detect.

## Basic Integration Test

```hcl
# tests/integration/vpc_integration.tftest.hcl

# No mock_provider - use real AWS provider

provider "aws" {
  region = "us-east-1"
}

run "creates_vpc_with_correct_cidr" {
  command = apply

  variables {
    vpc_cidr     = "10.99.0.0/16"  # Non-conflicting test CIDR
    environment  = "test"
    name_prefix  = "tofu-test-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.99.0.0/16"
    error_message = "VPC CIDR block doesn't match expected value"
  }

  assert {
    condition     = aws_vpc.main.enable_dns_hostnames == true
    error_message = "DNS hostnames should be enabled"
  }
}
```

## Testing with Cleanup

```hcl
# tests/integration/database_integration.tftest.hcl

run "create_test_database" {
  command = apply

  variables {
    db_identifier = "test-db-${formatdate("MMDDhhmmss", timestamp())}"
    environment   = "test"
    instance_class = "db.t3.micro"
    skip_final_snapshot = true  # Required for test databases
  }

  assert {
    condition     = aws_db_instance.main.status == "available"
    error_message = "Database should be in available state"
  }

  assert {
    condition     = aws_db_instance.main.engine == "postgres"
    error_message = "Expected PostgreSQL engine"
  }

  assert {
    condition     = aws_db_instance.main.storage_encrypted == true
    error_message = "Database storage must be encrypted"
  }
}

# Cleanup is automatic - tofu test destroys resources after each run block
```

## Multi-Module Integration Tests

```hcl
# tests/integration/app_stack.tftest.hcl

# Compose dependent modules in a helper module so they are
# created and validated in the same apply run.
run "create_app_stack" {
  command = apply

  module {
    source = "./tests/helpers/app_stack"
  }

  variables {
    vpc_cidr    = "10.99.0.0/16"
    environment = "test"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC should be created"
  }

  assert {
    condition     = output.db_status == "available"
    error_message = "Database should be available"
  }
}
```

## Testing Network Access Rules

```hcl
# tests/integration/connectivity.tftest.hcl

run "test_security_group_rules" {
  command = apply

  variables {
    environment   = "test"
    allowed_cidrs = ["10.0.0.0/8"]
  }

  assert {
    # Verify security group allows internal traffic
    condition     = length([for rule in aws_security_group.app.ingress : rule if contains(rule.cidr_blocks, "10.0.0.0/8")]) > 0
    error_message = "Security group should allow traffic from internal CIDR"
  }

  assert {
    # Verify no 0.0.0.0/0 on sensitive ports
    condition     = length([for rule in aws_security_group.app.ingress : rule if contains(rule.cidr_blocks, "0.0.0.0/0") && rule.from_port == 22]) == 0
    error_message = "SSH should not be open to the internet"
  }
}
```

## Running Integration Tests

```bash
# Initialize the working directory
tofu init

# Run integration tests (requires real AWS credentials)
tofu test -test-directory=tests/integration -verbose

# Run with a specific AWS profile/account
AWS_PROFILE=test-account tofu test -test-directory=tests/integration

# Run a single integration test
tofu test -filter=tests/integration/vpc_integration.tftest.hcl
```

## CI/CD Configuration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Nightly

permissions:
  contents: read
  id-token: write

jobs:
  integration-test:
    runs-on: ubuntu-latest
    environment: test  # Optional: use environment-scoped vars/secrets and protection rules

    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.TEST_ROLE_ARN }}
          aws-region: us-east-1

      - uses: opentofu/setup-opentofu@v2

      - name: Initialize OpenTofu
        run: tofu init
        working-directory: modules/vpc

      - name: Run integration tests
        run: tofu test -test-directory=tests/integration -verbose
        working-directory: modules/vpc
```

## Conclusion

Integration tests with `command = apply` provide the highest confidence that your modules work correctly against real cloud APIs. Create dedicated test AWS accounts or isolated VPCs for integration testing to prevent interference with production resources. Use unique name prefixes with timestamps to avoid conflicts between parallel test runs, and the native test framework automatically destroys resources after each run block completes.
