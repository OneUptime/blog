# How to Run Specific Test Cases in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to run specific test cases, test files, and test directories in OpenTofu using the tofu test command flags and filters.

## Introduction

When you have many tests across multiple files, running all of them for every change is slow. OpenTofu provides flags on `tofu test` to run specific files or target a specific test directory. OpenTofu does not currently provide a CLI flag for filtering individual `run` blocks by name, so focused test execution is done at the test file level.

## Run All Tests

```bash
# Run all tests in the current directory and the tests/ directory

tofu test

# Print the plan or state for each run block
tofu test -verbose
```

## Run a Specific Test File

```bash
# Run tests in a specific .tftest.hcl file
tofu test -filter=tests/unit.tftest.hcl

# Run multiple specific files
tofu test -filter=tests/unit.tftest.hcl -filter=tests/validation.tftest.hcl
```

## Specify the Test Directory

```bash
# Use a custom test directory (default is "tests/")
tofu test -test-directory=test

# Use the current directory as the configured test directory
tofu test -test-directory=.

# Run tests from a different working directory
tofu -chdir=modules/vpc test
```

## Filter by Test Name

OpenTofu's `tofu test` command does not support a `-run` option for regex filtering by `run` block name. Use `-filter` to select one or more test files, and place focused run blocks in their own test files when you need that granularity:

```bash
# Run a tag-focused test file
tofu test -filter=tests/tags.tftest.hcl

# Run a validation-focused test file
tofu test -filter=tests/validation.tftest.hcl

# Run multiple focused files
tofu test -filter=tests/tags.tftest.hcl -filter=tests/validation.tftest.hcl

# Run a focused file from a custom test directory
tofu test -test-directory=extra-tests -filter=extra-tests/tags.tftest.hcl
```

## Example Test File with Named Runs

```hcl
# tests/unit.tftest.hcl

mock_provider "aws" {}

variables {
  environment   = "test"
  instance_type = "t3.micro"
}

run "creates_instance_with_correct_type" {
  command = plan
  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Wrong instance type"
  }
}

run "instance_has_required_tags" {
  command = plan
  assert {
    condition     = aws_instance.web.tags["Environment"] == "test"
    error_message = "Missing Environment tag"
  }
}

run "validation_rejects_invalid_type" {
  command = plan
  variables {
    instance_type = "m5.large"
  }
  expect_failures = [var.instance_type]
}
```

```bash
# Run every run block in this test file
tofu test -filter=tests/unit.tftest.hcl
# tests/unit.tftest.hcl... in progress
#   run "creates_instance_with_correct_type"... pass
#   run "instance_has_required_tags"... pass
#   run "validation_rejects_invalid_type"... pass

# To run only tag-related tests, put those run blocks in their own file
tofu test -filter=tests/tags.tftest.hcl
```

## Passing Variables to Test Runs

```bash
# Override variables for the test run
tofu test -var="environment=staging"
tofu test -var="instance_type=t3.small" -var="region=us-west-2"

# Use a variables file
tofu test -var-file="test.tfvars"
```

## JSON Output for CI Integration

```bash
# Output results as JSON for parsing
tofu test -json

# Combined with jq for failure detection
tofu test -json | jq 'select(.type == "test_run") | select(.test_run.status == "fail")'
```

## Test File Execution Order

Run blocks within a file run sequentially. Current OpenTofu executes selected test files in alphabetical order:

```bash
# Run all discovered test files in the current module and test directory
tofu test

# Run specific files; selected files execute in sorted order
tofu test -filter=tests/unit.tftest.hcl -filter=tests/integration.tftest.hcl
```

## Practical Development Workflow

```bash
# During module development: run unit tests only
tofu test -filter=tests/unit.tftest.hcl -verbose

# Test a specific feature you're working on
tofu test -filter=tests/encryption.tftest.hcl

# Before PR: run all tests
tofu test -verbose

# In CI: run with JSON output for reporting
tofu test -json > test-results.json
```

## Conclusion

Use `-filter` for file-level filtering and `-test-directory` to control which directory is scanned. OpenTofu does not currently support `-run` style filtering by `run` block name, so organize focused tests into separate files when you want to run them independently. Run all tests before committing. The `tofu test -json` flag integrates well with CI systems that parse structured output.
