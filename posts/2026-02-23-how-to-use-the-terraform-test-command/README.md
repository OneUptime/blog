# How to Use the terraform test Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, CLI, Infrastructure as Code, DevOps

Description: A complete guide to using the terraform test command, covering test discovery, execution modes, filtering, output formats, and CI integration.

---

The `terraform test` command, introduced as stable in Terraform 1.6, is the official way to run tests for your Terraform configurations. It discovers test files automatically, executes them in order, manages resource lifecycle, and reports results. This guide covers everything you need to know about the command itself - its flags, behavior, and practical usage patterns.

## Prerequisites

You need Terraform 1.6 or later. Check your version:

```bash
terraform version
# Terraform v1.7.0 or later recommended
```

If you are on an older version, the test framework was available as an experimental feature in 1.5, but the syntax changed in 1.6. Stick with 1.6+ for the stable API.

## How Test Discovery Works

When you run `terraform test`, Terraform looks for test files in two locations:

1. The current working directory (root module)
2. A `tests/` subdirectory

Test files must have the `.tftest.hcl` extension. Any file matching this pattern in either location will be discovered and executed:

```text
my-module/
  main.tf
  variables.tf
  outputs.tf
  basic.tftest.hcl           # Discovered (root directory)
  tests/
    validation.tftest.hcl    # Discovered (tests directory)
    advanced.tftest.hcl      # Discovered (tests directory)
  examples/
    complete.tftest.hcl      # NOT discovered (not in root or tests/)
```

If you want test files in other directories, use the `-test-directory` flag.

## Running All Tests

The simplest usage runs all discovered tests:

```bash
# Initialize first - required for provider downloads
terraform init

# Run all tests
terraform test
```

Output with all tests passing:

```text
tests/validation.tftest.hcl... in progress
  run "valid_inputs"... pass
  run "invalid_inputs_rejected"... pass
tests/validation.tftest.hcl... tearing down
tests/validation.tftest.hcl... pass
basic.tftest.hcl... in progress
  run "default_configuration"... pass
basic.tftest.hcl... tearing down
basic.tftest.hcl... pass

Success! 3 passed, 0 failed.
```

## Verbose Output

Add `-verbose` to see the full plan or apply output for each run block:

```bash
terraform test -verbose
```

This is invaluable for debugging. You see the same output you would get from running `terraform plan` or `terraform apply` directly, including all resource attributes and computed values.

## Filtering Tests

Run specific test files with `-filter`:

```bash
# Run only the validation tests
terraform test -filter=tests/validation.tftest.hcl

# Run only the root-level test file
terraform test -filter=basic.tftest.hcl
```

The filter matches the file path relative to the working directory. You cannot filter by individual `run` block names - filtering works at the file level.

## Custom Test Directory

If your tests live somewhere other than the default locations:

```bash
# Look for test files in a custom directory
terraform test -test-directory=integration-tests
```

This replaces the default `tests/` directory. Test files in the root module directory are still discovered.

## Setting Variables

You can pass variables to tests the same way you would to `plan` or `apply`:

```bash
# Pass a variable on the command line
terraform test -var="environment=staging"

# Use a variable file
terraform test -var-file=testing.tfvars
```

Variables set this way act as defaults. Individual `run` blocks can override them with their own `variables` blocks.

## JSON Output

For CI systems that need machine-readable output:

```bash
terraform test -json
```

Each test event is a JSON object on its own line:

```json
{"@level":"info","@message":"Found 2 files and 5 run blocks","@module":"terraform.ui","test_count":5,"file_count":2,"type":"test_summary"}
{"@level":"info","@message":"tests/unit.tftest.hcl... in progress","@module":"terraform.ui","test_file":"tests/unit.tftest.hcl","type":"test_file_status","status":"starting"}
{"@level":"info","@message":"  run \"test_defaults\"... pass","@module":"terraform.ui","test_file":"tests/unit.tftest.hcl","test_run":"test_defaults","type":"test_run_status","status":"pass"}
```

This format integrates well with CI tools that can parse structured test results.

## Test Execution Order

Tests are executed in a specific order:

1. **Files** are executed in alphabetical order
2. **Run blocks** within a file are executed in the order they appear
3. Each file gets its own isolated state - resources from one file do not leak into another
4. Within a file, run blocks share state by default

This ordering matters because you can chain run blocks:

```hcl
# tests/chained.tftest.hcl

# First run creates resources
run "create_base" {
  variables {
    name = "test-resource"
  }

  assert {
    condition     = output.resource_id != ""
    error_message = "Should output a resource ID"
  }
}

# Second run can reference values from the first
run "verify_base" {
  command = plan

  variables {
    name        = "test-resource"
    existing_id = run.create_base.resource_id
  }

  # Assertions here...
}
```

## Cleanup Behavior

After all run blocks in a file complete, Terraform destroys all resources created during that file's test runs. This happens even if assertions fail. The cleanup phase is shown in the output:

```text
tests/integration.tftest.hcl... tearing down
tests/integration.tftest.hcl... pass
```

If cleanup fails (which can happen with resources that have deletion protection), you will see an error. You may need to manually clean up in that case.

## Handling Plan vs Apply Mode

Each run block can specify whether to plan or apply:

```hcl
# Plan mode - fast, no resources created
run "unit_test" {
  command = plan
  # ...
}

# Apply mode (default) - creates real resources
run "integration_test" {
  command = apply
  # ...
}
```

A common pattern is to have separate files for unit and integration tests:

```bash
# Run only unit tests (fast, no credentials needed)
terraform test -filter=tests/unit.tftest.hcl

# Run only integration tests (slow, needs cloud credentials)
terraform test -filter=tests/integration.tftest.hcl
```

## Exit Codes

The `terraform test` command returns:

- **0** - all tests passed
- **1** - one or more tests failed or errored

This makes it straightforward to use in CI:

```bash
# In CI, the pipeline step fails if any test fails
terraform test
```

## Timeout Configuration

By default, individual operations within tests use Terraform's standard timeouts. You can set an overall test timeout:

```bash
# Set a 30-minute timeout for the entire test suite
terraform test -timeout=30m
```

This is useful for integration tests that create slow resources like RDS instances or EKS clusters.

## Using with Terraform Cloud

If you use Terraform Cloud as a backend, `terraform test` still runs locally. It does not use Terraform Cloud's remote execution. However, you still need to authenticate:

```bash
# Login to Terraform Cloud
terraform login

# Tests run locally but can use the Cloud backend for state
terraform test
```

## Practical CI Configuration

Here is a complete example that runs unit tests on every push and integration tests on a schedule:

```yaml
# .github/workflows/terraform-tests.yml
name: Terraform Tests

on:
  push:
    paths: ['modules/**']
  schedule:
    - cron: '0 3 * * 1'  # Weekly on Monday at 3 AM

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [vpc, database, compute]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Unit Tests
        working-directory: modules/${{ matrix.module }}
        run: |
          terraform init -backend=false
          terraform test -filter=tests/unit.tftest.hcl

  integration-tests:
    if: github.event_name == 'schedule'
    needs: unit-tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [vpc, database]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TEST_ROLE }}
          aws-region: us-east-1

      - name: Integration Tests
        working-directory: modules/${{ matrix.module }}
        run: |
          terraform init
          terraform test -filter=tests/integration.tftest.hcl -verbose
        timeout-minutes: 30
```

## Debugging Failed Tests

When a test fails, follow this process:

```bash
# 1. Run with verbose to see full output
terraform test -verbose -filter=tests/failing.tftest.hcl

# 2. Enable Terraform debug logging for more detail
TF_LOG=DEBUG terraform test -filter=tests/failing.tftest.hcl

# 3. Run the test configuration manually to inspect state
cd tests/fixtures
terraform init
terraform plan -var-file=test.tfvars
```

## Summary

The `terraform test` command is straightforward once you understand its conventions. Test files go in the root or `tests/` directory, they use the `.tftest.hcl` extension, and they contain `run` blocks with assertions. Use `-filter` for selective execution, `-verbose` for debugging, and `-json` for CI integration. The command handles resource cleanup automatically, making it safe for both unit tests (plan mode) and integration tests (apply mode).

For writing effective test files, see [How to Write .tftest.hcl Files for Terraform Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-write-tftest-hcl-files-for-terraform-testing/view) and [How to Use Mock Providers in Terraform Tests](https://oneuptime.com/blog/post/2026-02-23-how-to-use-mock-providers-in-terraform-tests/view).
