# How to Test Sensitive Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform, Security

Description: Learn how to safely handle sensitive variables in OpenTofu tests, including passing secrets via environment variables, using mock values, and testing sensitive output validation.

## Introduction

Sensitive variables in OpenTofu - database passwords, API keys, TLS certificates - require careful handling in tests. You should never hardcode real secrets in test files. OpenTofu's testing framework supports several patterns for providing sensitive values safely while ensuring your tests still validate the right behavior.

## Defining Sensitive Variables in Modules

```hcl
# variables.tf

variable "db_password" {
  description = "Database admin password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters"
  }
}

variable "api_key" {
  description = "External API key"
  type        = string
  sensitive   = true
}
```

## Method 1: Environment Variables (Recommended for CI)

```bash
# In CI environment - set secrets from CI secret store
export TF_VAR_db_password="test-password-at-least-16-chars"
export TF_VAR_api_key="test-api-key-for-unit-tests"

tofu init
tofu test -filter=tests/unit.tftest.hcl
```

## Method 2: Ephemeral Test Values in Test File

For unit tests, use clearly fake test values:

```hcl
# tests/unit.tftest.hcl
mock_provider "aws" {}

variables {
  # Fake test values - clearly not production secrets
  db_password = "test-password-for-unit-tests-only"
  api_key     = "test-api-key-not-real"
}

run "password_length_validation_passes" {
  command = plan

  assert {
    condition     = aws_db_instance.main.password == var.db_password
    error_message = "Password should be set from variable"
  }
}
```

## Method 3: Validate Sensitive Variable Constraints

Test that validation rules correctly reject short passwords:

```hcl
# tests/validation.tftest.hcl
mock_provider "aws" {}

variables {
  api_key = "test-api-key-not-real"
}

run "rejects_short_password" {
  command = plan

  variables {
    db_password = "short"  # Too short - less than 16 chars
  }

  # Expect the validation to fail
  expect_failures = [var.db_password]
}

run "accepts_long_enough_password" {
  command = plan

  variables {
    db_password = "this-is-a-valid-test-password"
  }

  # No failures expected - password meets requirements
  assert {
    condition     = length(var.db_password) >= 16
    error_message = "Should accept password that meets length requirement"
  }
}
```

## Method 4: Non-Sensitive Proxy Values for Structure Tests

When testing output structure rather than actual secret values:

```hcl
# tests/unit.tftest.hcl
mock_provider "aws" {
  mock_resource "aws_db_instance" {
    defaults = {
      endpoint = "mock-db.rds.amazonaws.com:5432"
      address  = "mock-db.rds.amazonaws.com"
      port     = 5432
    }
  }

  mock_resource "aws_secretsmanager_secret_version" {
    defaults = {
      id = "mock-secret/AWSCURRENT"
    }
  }
}

variables {
  db_password = "test-password-sixteen-chars"
  api_key     = "test-api-key-not-real"
}

run "secret_is_stored_in_secrets_manager" {
  command = plan

  assert {
    # Test that a Secrets Manager secret is created (not the value)
    condition     = aws_secretsmanager_secret.db.name != ""
    error_message = "DB password should be stored in Secrets Manager"
  }
}
```

## Sensitive Output Handling in Tests

Sensitive outputs are redacted in test failure messages:

```hcl
# outputs.tf
output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "connection_string" {
  value     = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive = true
}
```

```hcl
# tests/outputs.tftest.hcl
mock_provider "aws" {
  mock_resource "aws_db_instance" {
    defaults = {
      endpoint = "mock.rds.amazonaws.com:5432"
    }
  }
}

variables {
  db_password = "test-password-sixteen-ch"
  db_username = "admin"
  db_name     = "myapp"
  api_key     = "test-api-key-not-real"
}

run "sensitive_output_is_populated" {
  command = plan

  assert {
    # Can check if sensitive output is non-empty even though value is redacted
    condition     = output.db_endpoint != ""
    error_message = "Database endpoint output should be populated (value redacted)"
  }
}
```

## .gitignore for Sensitive Test Files

```gitignore
# Sensitive test variables
tests/*.secret.tfvars
tests/secrets.tfvars
tests/*.env
.env.test
```

## CI Pipeline Pattern

```yaml
# .github/workflows/tests.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Run unit tests
        env:
          TF_VAR_db_password: ${{ secrets.TEST_DB_PASSWORD }}
          TF_VAR_api_key: ${{ secrets.TEST_API_KEY }}
        run: |
          tofu init
          tofu test -filter=tests/unit.tftest.hcl
```

## Conclusion

Never hardcode real production secrets in test files. Use environment variables (`TF_VAR_*`) for CI pipelines, clearly labeled fake values for unit tests, and `expect_failures` to test validation rules. When testing sensitive outputs, assert on emptiness or format rather than exact values. This approach keeps your test suite secure while still providing meaningful coverage of sensitive variable handling.
