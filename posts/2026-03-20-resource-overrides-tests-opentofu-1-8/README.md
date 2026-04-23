# How to Use Resource Overrides in Tests Introduced in OpenTofu 1.8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Resource Overrides, OpenTofu 1.8, Infrastructure as Code

Description: Learn how to use resource overrides in OpenTofu 1.8 tests to customize specific resource behavior without replacing entire provider mocks.

## Introduction

OpenTofu 1.8 complemented provider mocking with resource overrides - a more surgical approach to test customization. Instead of mocking an entire provider, overrides let you selectively replace behavior for specific resource or data source addresses while leaving the rest of the configuration untouched.

## Basic Resource Override

Override a specific resource address in a test run block.

```hcl
# tests/main.tftest.hcl

run "test_with_overridden_bucket" {
  command = plan

  # Override a specific resource address
  override_resource {
    target = aws_s3_bucket.logs
    values = {
      id     = "overridden-logs-bucket"
      arn    = "arn:aws:s3:::overridden-logs-bucket"
      region = "us-east-1"
    }
  }

  assert {
    condition     = aws_s3_bucket.logs.id == "overridden-logs-bucket"
    error_message = "Bucket ID should match the override"
  }
}
```

## Overriding Data Sources

Use `override_data` to substitute real data source lookups during tests.

```hcl
run "test_with_mock_account_data" {
  command = plan

  override_data {
    target = data.aws_caller_identity.current
    values = {
      account_id = "111122223333"
      arn        = "arn:aws:iam::111122223333:user/ci-user"
      user_id    = "AIDACKCEVSQ6C2EXAMPLE"
    }
  }

  assert {
    condition     = aws_s3_bucket.main.bucket == "my-app-prod-111122223333"
    error_message = "Bucket name should use the overridden account ID"
  }
}
```

## Override vs Mock Provider

Overrides can apply to a single `run` block or to the whole test file. A run-level override takes precedence for the same target, while mock providers are defined at the test-file level.

```hcl
# tests/selective.tftest.hcl

# Mock the whole provider as a baseline

mock_provider "aws" {
  mock_resource "aws_s3_bucket" {
    defaults = {
      id     = "default-mock-bucket"
      region = "us-east-1"
    }
  }
}

run "uses_default_mock" {
  command = plan

  assert {
    condition     = aws_s3_bucket.primary.id == "default-mock-bucket"
    error_message = "Should use the provider-level default mock"
  }
}

run "uses_override" {
  command = plan

  # This run overrides the provider mock for this resource address
  override_resource {
    target = aws_s3_bucket.primary
    values = {
      id     = "special-bucket-for-this-test"
      region = "eu-west-1"
    }
  }

  assert {
    condition     = aws_s3_bucket.primary.id == "special-bucket-for-this-test"
    error_message = "Should use the run-level override"
  }
}
```

## Overriding Module Resources

Target resources inside modules using their full address, and assert through outputs exposed by the module.

```hcl
run "test_module_with_override" {
  command = plan

  override_resource {
    target = module.database.aws_db_instance.main
    values = {
      id       = "mock-db-instance"
      address  = "mock-db.us-east-1.rds.amazonaws.com"
      port     = 5432
      endpoint = "mock-db.us-east-1.rds.amazonaws.com:5432"
    }
  }

  assert {
    condition     = module.database.db_port == 5432
    error_message = "Database port should be overridden to 5432"
  }
}
```

## Combining Overrides with Variables

Override resources and supply test variables together for fully isolated runs.

```hcl
variables {
  environment = "test"
  app_name    = "myapp"
}

run "verify_naming_with_override" {
  command = plan

  override_data {
    target = data.aws_region.current
    values = {
      region = "ap-southeast-1"
    }
  }

  assert {
    condition     = aws_s3_bucket.app.bucket == "myapp-test-ap-southeast-1"
    error_message = "Bucket name format should incorporate region override"
  }
}
```

## Running Override Tests

```bash
# Run all tests including those using overrides
tofu test

# Run a specific file with override tests
tofu test -filter=tests/selective.tftest.hcl

# Run with verbose output to see each run's plan or state
tofu test -verbose
```

## Summary

Resource overrides in OpenTofu 1.8 give you fine-grained control in tests by letting you substitute values for individual resource or data source addresses within a single `run` block or across a test file. Combined with provider-level mocks as a baseline, overrides let you test edge cases and specific scenarios without duplicating mock provider configuration across multiple test files.
