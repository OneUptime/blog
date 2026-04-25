# Plan Mode vs Apply Mode in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Infrastructure as Code, CI/CD, Best Practice

Description: Understand the difference between plan mode and apply mode in OpenTofu tests and when to use each for effective infrastructure testing.

## Overview

OpenTofu's built-in testing framework supports two execution modes for `run` blocks:

- **`command = plan`** - Generates a plan but does not create real resources
- **`command = apply`** - Runs a full apply, creating real resources in the cloud

Choosing the right mode for each test is key to balancing speed, cost, and confidence.

## Plan Mode

Plan mode validates your configuration without applying changes.

```hcl
run "validate_configuration" {
  command = plan

  variables {
    instance_type = "t3.micro"
    environment   = "test"
  }

  assert {
    condition     = aws_instance.app.instance_type == "t3.micro"
    error_message = "Instance type mismatch in plan"
  }
}
```

### What Plan Mode Can Test

- Variable validation and defaults
- Resource attribute values computed from variables and locals
- Conditional logic and `count`/`for_each` expressions
- Module output values that don't depend on real resource IDs

### Limitations of Plan Mode

- Cannot test values that are only known after apply (resource IDs, assigned IPs)
- Cannot fully verify provider and cloud API behavior without creating resources
- May miss IAM permission errors or API limits that only appear during create or update operations

## Apply Mode

Apply mode provisions real infrastructure and validates actual resource state.

```hcl
run "provision_and_verify" {
  command = apply

  variables {
    vpc_cidr = "10.0.0.0/16"
    name     = "test-vpc"
  }

  assert {
    condition     = aws_vpc.main.id != ""
    error_message = "VPC ID should be populated after apply"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "CIDR block mismatch"
  }
}
```

### What Apply Mode Can Test

- Real resource IDs and attributes assigned by the provider
- Cloud API compatibility and permission correctness
- Resource relationships and dependencies
- End-to-end connectivity and service availability

### Cost and Time Considerations

Apply mode creates real resources - incurring cloud costs and taking more time. OpenTofu's test runner destroys resources after each `run` block completes, but temporary costs apply.

## Combining Both Modes

A common pattern is to validate configuration with plan, then verify provisioned state with apply:

```hcl
run "plan_validation" {
  command = plan

  variables {
    bucket_name = "my-test-bucket-${uuid()}"
  }

  assert {
    condition     = aws_s3_bucket.data.force_destroy == true
    error_message = "Test buckets must have force_destroy enabled"
  }
}

run "apply_and_verify" {
  command = apply

  variables {
    bucket_name = "my-test-bucket-${uuid()}"
  }

  assert {
    condition     = aws_s3_bucket.data.id != ""
    error_message = "Bucket should have an ID after creation"
  }
}
```

## Idempotency Testing

Because test assertions operate on resources, data sources, variables, outputs, and modules from the code under test, use a separate plan step to verify idempotency after an apply:

```bash
tofu plan -detailed-exitcode
```

An exit code of `0` means no changes are needed, `2` means changes are still pending, and `1` indicates an error.

## When to Use Each Mode

| Scenario | Recommended Mode |
|---|---|
| Validating variable logic and defaults | plan |
| Testing conditional resource creation | plan |
| Verifying values only known after apply | apply |
| Testing IAM permissions | apply |
| Integration tests for module outputs | apply |
| Fast unit tests in CI | plan (with mock providers) |
| Full regression tests before release | apply |

## Using Mock Providers with Plan Mode

For the fastest possible tests, combine plan mode with mock providers:

```hcl
mock_provider "aws" {}

run "fast_validation" {
  command = plan

  variables {
    environment = "test"
  }

  assert {
    condition     = length(aws_subnet.public) == 3
    error_message = "Expected 3 public subnets"
  }
}
```

## Best Practices

1. **Default to plan mode** for configuration logic tests - it's faster and free
2. **Use apply mode** for integration tests that must validate real API behavior
3. **Run plan tests in every PR**, apply tests on merge or nightly
4. **Always clean up** - OpenTofu destroys resources after each test run, but temporary costs still apply while the test is executing
5. **Isolate test resources** using unique name prefixes to avoid conflicts

## Conclusion

Plan mode and apply mode serve complementary purposes in OpenTofu testing. Use plan mode for fast, cost-free logic validation and apply mode for full integration testing. A well-designed test suite uses both strategically to maximize confidence while minimizing test time and cloud costs.
