# How to Use Test Output for Debugging in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to use OpenTofu test output, verbose mode, JSON output, and assertion error messages for debugging failing tests.

## Introduction

When tests fail, good output is essential for quick diagnosis. OpenTofu's test command provides verbose mode, JSON output, and informative error messages. Writing assertions with detailed error messages and using the available flags makes debugging test failures faster and more efficient.

## Basic Test Output

```bash
tofu test

# tests/unit.tftest.hcl... in progress

#   run "creates_instance"... pass
#   run "validates_tags"... fail
# tests/unit.tftest.hcl... tearing down
# tests/unit.tftest.hcl... fail
#
# Failure! 1 passed, 1 failed.
```

## Verbose Mode

Use `-verbose` to print the plan or state for each test run block as it executes:

```bash
tofu test -verbose

# tests/unit.tftest.hcl... in progress
#   run "creates_instance"... pass
#
# OpenTofu also prints the plan or state for each run block.
# Use that output to inspect the resource attributes your assertions check.
#
#   run "validates_tags"... fail
#       Error: Test assertion failed
#       Missing required tag: Owner
# tests/unit.tftest.hcl... fail
```

## JSON Output for Parsing

```bash
# Get machine-readable output
tofu test -json

# Pretty-print with jq
tofu test -json | jq .

# Extract only failures
tofu test -json | jq 'select(.type == "test_run") | select(.test_run.status == "fail")'

# Count passes and failures
tofu test -json | jq 'select(.type == "test_summary") | {
  passed: .test_summary.passed,
  failed: .test_summary.failed,
  errored: .test_summary.errored,
  skipped: .test_summary.skipped
}'
```

## Writing Informative Error Messages

The key to fast debugging is error messages that include actual vs expected values:

```hcl
mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      instance_type     = "t3.micro"
      availability_zone = "us-east-1a"
      public_ip         = "54.0.0.1"
    }
  }
}

variables {
  environment   = "production"
  instance_type = "t3.micro"
}

run "instance_configuration" {
  command = plan

  # Bad: no context in error message
  assert {
    condition     = aws_instance.web.instance_type == "m5.large"
    error_message = "Wrong instance type"  # ❌ Not helpful
  }

  # Good: includes actual value and expected value
  assert {
    condition     = aws_instance.web.instance_type == "m5.large"
    error_message = "Instance type should be m5.large for production, got: ${aws_instance.web.instance_type}"  # ✅ Helpful
  }

  # Good: for collections
  assert {
    condition     = length(aws_instance.web.vpc_security_group_ids) >= 1
    error_message = "Expected at least 1 security group, got ${length(aws_instance.web.vpc_security_group_ids)}: ${jsonencode(aws_instance.web.vpc_security_group_ids)}"
  }
}
```

## Debugging with Plan Output

Run the module normally to see the full plan:

```bash
# See the full plan for what's being tested
tofu plan -var="environment=production" -var="instance_type=t3.micro"

# Match the test variables and provider setup as closely as possible
# This helps you inspect the resource attributes that assertions check
# Plan output is more readable than test failure output
```

## Adding Debug Outputs to Modules

Add temporary debug outputs to inspect values:

```hcl
# outputs.tf (temporary debugging)
output "debug_locals" {
  value = {
    is_production  = local.is_production
    instance_class = local.instance_class
    computed_tags  = local.common_tags
  }
}
```

```hcl
# tests/debug.tftest.hcl
mock_provider "aws" {}

variables {
  environment = "production"
}

run "inspect_locals" {
  command = plan

  # Include the debug output when the assertion fails
  assert {
    condition     = output.debug_locals.is_production == true
    error_message = "is_production=${output.debug_locals.is_production}, instance_class=${output.debug_locals.instance_class}"
  }
}
```

## Using tofu console for Debugging

Interactively evaluate expressions:

```bash
# Open console in the module directory
tofu console -var="environment=production"

# Test expressions interactively
> local.instance_class
"db.r5.large"

> contains(["dev", "staging", "production"], var.environment)
true

> length(var.subnet_ids)
3
```

## Test Failure Investigation Workflow

```bash
# 1. Run the failing test file with verbose output
tofu test -filter=tests/failing.tftest.hcl -verbose

# 2. Check the full plan for the failing scenario
tofu plan -var="environment=production"

# 3. Use console to evaluate specific expressions
tofu console -var="environment=production"

# 4. Add temporary debug output if needed
# 5. Fix the module or test
# 6. Run the test again
tofu test -filter=tests/failing.tftest.hcl -verbose
```

## CI Failure Output

```yaml
- name: Run tests with verbose output
  run: tofu test -verbose 2>&1 | tee test-output.txt

- name: Upload test output on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-output
    path: test-output.txt
```

## Conclusion

Effective test debugging combines verbose mode for plan or state detail, informative error messages with actual values, and the `tofu console` for interactive expression evaluation. Write error messages that include both expected and actual values using string interpolation. Use JSON output to integrate test results into CI reporting systems. The combination of good test structure and informative messages significantly reduces time spent diagnosing failures.
