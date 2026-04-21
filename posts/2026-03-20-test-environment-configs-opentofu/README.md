# How to Test Environment-Specific Configurations in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to test environment-specific module configurations in OpenTofu, verifying that dev, staging, and production environments get the correct resources and settings.

## Introduction

Infrastructure modules often need to behave differently across environments - production uses larger instances, enables Multi-AZ, and requires encryption, while dev uses smaller and cheaper resources. Testing environment-specific configurations ensures your module applies the right settings for each environment and that production-only requirements are properly enforced.

## Module with Environment-Specific Logic

```hcl
# variables.tf

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production"
  }
}

# main.tf
locals {
  is_production = var.environment == "production"

  allocated_storage = local.is_production ? 100 : 20
  instance_class    = local.is_production ? "db.r5.large" : "db.t3.micro"
  multi_az          = local.is_production ? true : false
  retention_days    = local.is_production ? 30 : 7
  storage_encrypted = local.is_production
}

resource "aws_db_instance" "main" {
  allocated_storage           = local.allocated_storage
  engine                      = "mysql"
  instance_class              = local.instance_class
  multi_az                    = local.multi_az
  backup_retention_period     = local.retention_days
  deletion_protection         = local.is_production
  manage_master_user_password = true
  skip_final_snapshot         = true
  storage_encrypted           = local.storage_encrypted
  username                    = "app"
}
```

## Testing Each Environment

```hcl
# tests/environments.tftest.hcl
mock_provider "aws" {}

# ── Development environment ───────────────────────────────────────────────────
run "dev_uses_small_instance" {
  command = plan
  variables {
    environment = "dev"
  }

  assert {
    condition     = aws_db_instance.main.instance_class == "db.t3.micro"
    error_message = "Dev should use db.t3.micro, got: ${aws_db_instance.main.instance_class}"
  }

  assert {
    condition     = aws_db_instance.main.multi_az == false
    error_message = "Dev should not use Multi-AZ"
  }

  assert {
    condition     = aws_db_instance.main.deletion_protection == false
    error_message = "Dev should not have deletion protection"
  }
}

# ── Staging environment ───────────────────────────────────────────────────────
run "staging_uses_small_instance" {
  command = plan
  variables {
    environment = "staging"
  }

  assert {
    condition     = aws_db_instance.main.instance_class == "db.t3.micro"
    error_message = "Staging uses small instance by default"
  }

  assert {
    condition     = aws_db_instance.main.backup_retention_period == 7
    error_message = "Staging should have 7-day retention"
  }
}

# ── Production environment ────────────────────────────────────────────────────
run "production_uses_large_instance" {
  command = plan
  variables {
    environment = "production"
  }

  assert {
    condition     = aws_db_instance.main.instance_class == "db.r5.large"
    error_message = "Production should use db.r5.large, got: ${aws_db_instance.main.instance_class}"
  }

  assert {
    condition     = aws_db_instance.main.multi_az == true
    error_message = "Production must use Multi-AZ"
  }

  assert {
    condition     = aws_db_instance.main.backup_retention_period == 30
    error_message = "Production must have 30-day retention, got: ${aws_db_instance.main.backup_retention_period}"
  }

  assert {
    condition     = aws_db_instance.main.deletion_protection == true
    error_message = "Production must have deletion protection enabled"
  }

  assert {
    condition     = aws_db_instance.main.storage_encrypted == true
    error_message = "Production must have storage encryption enabled"
  }
}
```

## Testing Environment Validation

```hcl
# tests/env_validation.tftest.hcl
mock_provider "aws" {}

run "rejects_invalid_environment" {
  command = plan
  variables {
    environment = "sandbox"  # Not in allowed list
  }
  expect_failures = [var.environment]
}

run "rejects_empty_environment" {
  command = plan
  variables {
    environment = ""
  }
  expect_failures = [var.environment]
}
```

## Testing Production-Specific Preconditions

```hcl
# main.tf - precondition blocks
variable "instance_type" {
  type = string
}

resource "aws_instance" "web" {
  ami           = "ami-1234567890abcdef0"
  instance_type = var.instance_type

  lifecycle {
    precondition {
      condition = !(var.environment == "production" && var.instance_type == "t3.micro")
      error_message = "Production cannot use t3.micro instance type"
    }
  }
}
```

```hcl
# tests/preconditions.tftest.hcl
mock_provider "aws" {}

run "production_rejects_small_instance" {
  command = plan
  variables {
    environment   = "production"
    instance_type = "t3.micro"
  }
  expect_failures = [aws_instance.web]
}

run "dev_allows_small_instance" {
  command = plan
  variables {
    environment   = "dev"
    instance_type = "t3.micro"
  }
  # No failures expected for dev
}
```

## Using Fixture Files Per Environment

```hcl
# tests/fixtures/dev.tfvars
environment   = "dev"
instance_type = "t3.micro"
db_size       = 20
enable_logs   = false
```

```hcl
# tests/fixtures/production.tfvars
environment   = "production"
instance_type = "m5.large"
db_size       = 100
enable_logs   = true
```

```bash
# Run tests for each environment
tofu test -filter=tests/integration.tftest.hcl -var-file="tests/fixtures/dev.tfvars"
tofu test -filter=tests/integration.tftest.hcl -var-file="tests/fixtures/production.tfvars"
```

## CI Matrix for All Environments

```yaml
strategy:
  matrix:
    environment: [dev, staging, production]

steps:
  - name: Test ${{ matrix.environment }} configuration
    run: |
      tofu test -filter=tests/environments.tftest.hcl \
        -var="environment=${{ matrix.environment }}"
```

## Conclusion

Environment-specific testing ensures your module enforces the right configuration for each deployment tier. Write explicit test cases for each environment (dev, staging, production), verify that production requirements (Multi-AZ, encryption, deletion protection) are enforced, and confirm that development environments use cost-effective settings. Use fixture files to define environment configurations and CI matrix strategies to test all environments in parallel.
