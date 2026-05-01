# How to Use expect_failures in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Expect_failures, Error Testing, Infrastructure as Code

Description: Learn how to use the `expect_failures` argument in OpenTofu test run blocks to verify that validation rules, preconditions, and postconditions produce the expected errors.

## Introduction

`expect_failures` is an argument in `run` blocks that marks the run as **passing** when the listed checkable objects report an error from a custom condition, and **failing** when they do not. It is the primary mechanism for testing error paths in OpenTofu modules.

## Syntax

```hcl
run "test_name" {
  command = plan  # or apply

  variables {
    # Input designed to trigger a failure
  }

  # List checkable objects whose custom conditions should fail
  expect_failures = [
    var.some_variable,
    resource_type.resource_name,
    data.data_type.data_name,
    output.some_output,
    check.check_block_name,
  ]
}
```

## Testing Variable Validation

```hcl
# The variable under test (in the module)

# variable "environment" {
#   type = string
#   validation {
#     condition     = contains(["dev", "staging", "prod"], var.environment)
#     error_message = "environment must be one of: dev, staging, prod"
#   }
# }

run "rejects_invalid_environment_value" {
  command = plan

  variables {
    environment = "production"  # Not in the allowed list
  }

  expect_failures = [
    var.environment,
  ]
}
```

## Testing Resource Preconditions

```hcl
run "rejects_oversized_instance_in_dev" {
  command = plan

  variables {
    environment   = "dev"
    instance_type = "m5.4xlarge"  # Should be rejected in dev
  }

  # The precondition on aws_instance.app is expected to fail
  expect_failures = [
    aws_instance.app,
  ]
}
```

## Testing Resource Postconditions

Postconditions are checked after OpenTofu evaluates the object they belong to. If the condition depends on values that are only known after changes are applied, you need `command = apply` to test them:

```hcl
run "postcondition_fires_when_encryption_missing" {
  # Using a mock provider that returns unencrypted disk
  command = apply

  variables {
    enforce_encryption = false
  }

  expect_failures = [
    aws_ebs_volume.data,
  ]
}
```

## Testing `check` Blocks

OpenTofu `check` blocks run assertions at the end of plan and apply operations. You can target them with `expect_failures`:

```hcl
# In the module:
# check "health_endpoint_reachable" {
#   data "http" "health" {
#     url = var.health_url
#   }
#
#   assert {
#     condition     = data.http.health.status_code == 200
#     error_message = "Health endpoint returned non-200 status"
#   }
# }

run "check_block_fires_on_bad_endpoint" {
  command = apply

  variables {
    # URL that returns 503
    health_url = "https://httpstat.us/503"
  }

  expect_failures = [
    check.health_endpoint_reachable,
  ]
}
```

## Multiple Expected Failures

You can list multiple targets if the configuration should fail in several places simultaneously:

```hcl
run "multiple_validation_failures" {
  command = plan

  variables {
    environment = "invalid"   # fails var.environment
    region      = "us-fake-1" # fails var.region
  }

  expect_failures = [
    var.environment,
    var.region,
  ]
}
```

## Common Pitfalls

**`expect_failures` only works for custom conditions.** It can validate failures from variable validations, preconditions, postconditions, output preconditions, and `check` blocks, but it does not cover provider-side validation or generic provider errors.

**Verify the right thing fails.** If a different resource or variable fails, OpenTofu reports that unexpected failure and also reports a missing expected failure for the object you listed. Be specific with your variable values so the failing condition is obvious and the resulting diagnostics are easy to interpret.

## Conclusion

`expect_failures` is essential for building a complete test suite. Without it, your tests only verify the happy path. With it, you can prove that your module rejects bad inputs gracefully and with clear error messages.
