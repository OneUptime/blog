# How to Use .tftest.hcl Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Tftest.hcl, Infrastructure as Code, Test Files

Description: Learn the structure and capabilities of `.tftest.hcl` test files in OpenTofu, including run blocks, assertions, variables, and provider overrides.

## Introduction

OpenTofu's testing framework recognises files with the `.tftest.hcl` extension as test files. These files are written in HCL and support a rich set of blocks for defining test scenarios, supplying variables, mocking providers, and asserting expected outcomes.

## File Structure Overview

A `.tftest.hcl` file can contain these top-level block types:

| Block | Purpose |
|---|---|
| `variables` | Default variable values shared across all run blocks |
| `provider` | Provider configuration overrides |
| `mock_provider` | Mock provider definitions |
| `override_resource` | Resource overrides shared across run blocks |
| `override_data` | Data source overrides shared across run blocks |
| `override_module` | Module call overrides shared across run blocks |
| `run` | Individual test scenario |

```hcl
# example.tftest.hcl

# Shared variables used by every run block unless overridden

variables {
  region      = "us-east-1"
  environment = "test"
}

# Optional: override the provider used during tests
provider "aws" {
  region = var.region
}

# First test scenario
run "creates_bucket_with_correct_name" {
  variables {
    bucket_name = "my-test-bucket-12345"
  }

  assert {
    condition     = aws_s3_bucket.this.bucket == "my-test-bucket-12345"
    error_message = "Bucket name does not match input variable"
  }
}

# Second test scenario
run "bucket_has_versioning_disabled_by_default" {
  variables {
    bucket_name = "my-versioning-test-98765"
  }

  assert {
    condition     = length(aws_s3_bucket_versioning.this) == 0
    error_message = "Versioning resource should not exist when disabled"
  }
}
```

## The `run` Block in Detail

Each `run` block maps to one test case. The key arguments are:

```hcl
run "descriptive_test_name" {
  # "apply" (default) or "plan" - plan avoids creating resources, but apply-only values may be unknown
  command = apply

  # Override variables just for this run
  variables {
    instance_type = "t3.micro"
  }

  # module block lets you point to a different module path for this run
  module {
    source = "./modules/ec2"
  }

  # One or more assertions
  assert {
    condition     = output.instance_id != ""
    error_message = "Instance ID should not be empty after apply"
  }
}
```

## Using `expect_failures` in `.tftest.hcl`

When you want to verify that a validation rule or precondition rejects bad input, use `expect_failures`:

```hcl
run "rejects_invalid_environment" {
  command = plan

  variables {
    environment = "staging-invalid"
  }

  # Tell OpenTofu that this run is expected to fail
  # on the referenced variable validation
  expect_failures = [
    var.environment,
  ]
}
```

## Sharing Variables Across Runs

Top-level `variables` blocks set defaults. A `run`-level `variables` block merges with (and can override) the top-level values:

```hcl
# Top-level defaults
variables {
  region = "us-west-2"
  tags   = { Project = "demo" }
}

run "with_overridden_region" {
  variables {
    # Overrides only region; tags still comes from the top-level block
    region = "eu-west-1"
  }

  assert {
    condition     = output.region == "eu-west-1"
    error_message = "Region override was not applied"
  }
}
```

## File Placement

By default, `tofu test` searches for `.tftest.hcl` files in:

1. The current working directory.
2. The default `tests/` directory.

Use `-test-directory=path` to search a different test directory; OpenTofu still also searches the current working directory.

Keep test files next to the module they test for co-location, or in a `tests/` subdirectory for larger projects.

## Conclusion

`.tftest.hcl` files give you a declarative, HCL-native way to write infrastructure tests. Mastering the `variables`, `provider`, `mock_provider`, `override_resource`, `override_data`, `override_module`, and `run` blocks lets you cover happy paths, error cases, and complex multi-step scenarios-all within the same familiar OpenTofu workflow.
