# Integration Tests for OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Infrastructure as Code, Integration Testing, CI/CD

Description: Learn how to write and run integration tests for OpenTofu infrastructure configurations using the built-in testing framework to validate real cloud resources.

## Why Test OpenTofu Configurations?

Infrastructure as Code is code, and code needs tests. Integration tests for OpenTofu configurations:

- Validate that resources are created correctly in a real cloud environment
- Catch misconfigurations before they reach production
- Provide confidence when refactoring modules
- Enable CI/CD gates on infrastructure changes

OpenTofu 1.6+ includes a native testing framework that runs actual plan and apply cycles, and OpenTofu 1.8+ adds mock providers for faster plan-only tests.

## Test File Structure

OpenTofu test files use the `.tftest.hcl` extension and live alongside your configuration:

```text
modules/vpc/
├── main.tf
├── variables.tf
├── outputs.tf
└── tests/
    ├── vpc_basic.tftest.hcl
    └── vpc_advanced.tftest.hcl
```

## Basic Integration Test

```hcl
# tests/vpc_basic.tftest.hcl

run "create_vpc" {
  command = apply

  variables {
    vpc_cidr = "10.0.0.0/16"
    name     = "test-vpc"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block did not match expected value"
  }

  assert {
    condition     = aws_vpc.main.enable_dns_support == true
    error_message = "DNS support should be enabled"
  }
}
```

## Testing Module Outputs

```hcl
run "verify_outputs" {
  command = apply

  variables {
    environment = "test"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC ID output should not be empty"
  }

  assert {
    condition     = length(output.private_subnet_ids) == 3
    error_message = "Expected 3 private subnets"
  }
}
```

## Multi-Run Test Scenarios

```hcl
# Create shared setup data, then pass it to a second run

run "setup" {
  module {
    source = "./setup"
  }
}

run "verify_with_setup" {
  variables {
    name_prefix = run.setup.name_prefix
  }

  assert {
    condition     = startswith(output.bucket_name, var.name_prefix)
    error_message = "Bucket name did not use the expected prefix"
  }
}
```

## Provider Configuration for Test Runs

```hcl
provider "aws" {
  region = "us-east-1"
}

variables {
  environment = "integration-test"
  name_prefix = "tftest-${substr(uuid(), 0, 8)}"
}

run "deploy_and_test" {
  command = apply

  assert {
    condition     = startswith(aws_s3_bucket.test.bucket, var.name_prefix)
    error_message = "Bucket name did not use the expected prefix"
  }
}
```

## Running the Tests

```bash
# Run all tests
tofu test

# Run specific test file
tofu test -filter=tests/vpc_basic.tftest.hcl

# Run with verbose output
tofu test -verbose

# Run in a specific directory
tofu -chdir=modules/vpc test
```

## Using Mock Providers for Speed (OpenTofu 1.8+)

```hcl
# tests/unit.tftest.hcl
mock_provider "aws" {}

run "validate_config" {
  command = plan

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "CIDR block mismatch"
  }
}
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run OpenTofu Integration Tests
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: |
    tofu init
    tofu test -verbose
```

## Best Practices

1. **Use unique name prefixes** for test resources to avoid conflicts
2. **Clean up after tests** - OpenTofu's test runner destroys resources after each run
3. **Test both happy path and edge cases** (invalid inputs, boundary values)
4. **Use mock providers** (OpenTofu 1.8+) for fast unit tests, real providers for integration tests
5. **Run integration tests in isolated AWS accounts** or separate namespaces

## Conclusion

OpenTofu's built-in testing framework makes it straightforward to write integration tests that validate real infrastructure behavior. By combining plan-mode checks with apply-mode assertions, you can catch misconfigurations early and build confidence in your infrastructure code.
