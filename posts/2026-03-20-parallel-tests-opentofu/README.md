# How to Run Tests in Parallel in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how OpenTofu runs tests in parallel across multiple test files and how to structure your test suite for optimal parallelism and isolation.

## Introduction

A single `tofu test` invocation processes test files sequentially in alphabetical order, and run blocks within each file execute in the order they appear. OpenTofu does not yet support a built-in `parallel` attribute on test or run blocks (tracked in opentofu/opentofu issue #2542). To run tests in parallel today, you launch multiple `tofu test` processes externally - for example, from CI matrix jobs or background shells - each scoped to a different set of test files. Proper test isolation prevents these parallel invocations from interfering with each other.

## How OpenTofu Test Execution Works

```text
Test discovery: OpenTofu finds .tftest.hcl files in the working directory
and in the directory set by -test-directory (default: tests/).

A single `tofu test` invocation runs every file sequentially:

File 1: unit.tftest.hcl          File 2: integration.tftest.hcl
  run "test_a" ──┐                  run "test_x" ──┐
  run "test_b" ──┤ sequential        run "test_y" ──┤ sequential
  run "test_c" ──┘                  run "test_z" ──┘

File 1 finishes before File 2 starts. To parallelize, launch
separate `tofu test` processes, each scoped with -filter.
```

## Sequential Runs Within a File

Run blocks in a single file share state and run in order:

```hcl
# tests/integration.tftest.hcl

# These three runs are sequential - each sees state from previous runs

run "create_vpc" {
  command = apply
  # Creates vpc
}

run "create_instances" {
  command = apply
  # Can reference the VPC created in previous run
  assert {
    condition     = aws_instance.web.subnet_id != ""
    error_message = "Instance should be in the VPC created earlier"
  }
}

run "verify_connectivity" {
  command = apply
  # Validates the full deployment
}
```

## Parallel Execution Across Files

Because a single `tofu test` invocation is sequential, parallelism comes from running multiple invocations side by side. Split your tests so each file (or group) can be run independently:

```text
tests/
├── unit_compute.tftest.hcl     # Tests EC2 logic
├── unit_networking.tftest.hcl  # Tests VPC logic
├── unit_storage.tftest.hcl     # Tests S3 logic
├── unit_iam.tftest.hcl         # Tests IAM logic
└── integration.tftest.hcl      # End-to-end test (sequential internally)
```

```bash
# Launch one tofu test process per file in the background - they run in parallel
tofu test -filter=tests/unit_compute.tftest.hcl &
tofu test -filter=tests/unit_networking.tftest.hcl &
tofu test -filter=tests/unit_storage.tftest.hcl &
tofu test -filter=tests/unit_iam.tftest.hcl &
wait
```

## Isolation for Parallel Integration Tests

For integration tests that create real resources, use unique names to prevent conflicts between concurrent invocations. The file-level `variables` block can call functions (since OpenTofu 1.11) but cannot reference resources, so derive uniqueness from `timestamp()` or an externally injected variable rather than from a `random_id` resource:

```hcl
# tests/integration_a.tftest.hcl
variables {
  # Unique prefix for this test file
  name_prefix = "test-a-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  bucket_name = "my-test-a-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}

run "test_scenario_a" {
  command = apply
  # Uses test-a- prefix - won't conflict with integration_b tests
}
```

```hcl
# tests/integration_b.tftest.hcl
variables {
  name_prefix = "test-b-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  bucket_name = "my-test-b-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}

run "test_scenario_b" {
  command = apply
  # Uses test-b- prefix - isolated from integration_a
}
```

## Using Separate AWS Accounts for Parallelism

For truly isolated parallel integration tests, use separate AWS accounts or regions:

```yaml
# .github/workflows/parallel-tests.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-file: [unit_compute, unit_networking, unit_storage]
    steps:
      - name: Run tests
        run: tofu test -filter=tests/${{ matrix.test-file }}.tftest.hcl

  integration-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        region: [us-east-1, us-west-2]
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TEST_ROLE_ARN }}
          aws-region: ${{ matrix.region }}

      - name: Run integration tests
        run: tofu test -var="region=${{ matrix.region }}" -filter=tests/integration.tftest.hcl
```

## Avoid Shared State in Parallel Invocations

Bad pattern - separate test files sharing the same resource names when run from concurrent `tofu test` processes:

```hcl
# tests/feature_a.tftest.hcl - PROBLEMATIC if run in parallel
variables {
  bucket_name = "my-shared-test-bucket"  # ❌ Conflicts with feature_b
}
```

Good pattern - each file uses unique identifiers:

```hcl
# tests/feature_a.tftest.hcl
variables {
  bucket_name = "test-feature-a-${formatdate("YYYYMMDD-hhmmss", timestamp())}"  # ✅ Unique
}
```

## Timing Considerations

```bash
# Measure how long the full sequential suite takes
time tofu test

# Unit tests (mocked providers): typically 5-30 seconds total
# Integration tests (real AWS): typically 2-10 minutes total
# Sharding across CI jobs or background processes can drop wall-clock time substantially
```

## Conclusion

OpenTofu runs tests sequentially within a single `tofu test` process - both across files and within a file. To gain parallelism today, orchestrate multiple processes externally, typically via CI matrix jobs or background shells, each scoped to its own set of test files with `-filter`. Design your tests with isolation in mind: unique resource names for integration tests, mock providers for unit tests, and separate accounts or regions when real resources would otherwise collide. Sequential execution within a file remains useful for multi-step integration scenarios where later runs depend on state created by earlier ones.
