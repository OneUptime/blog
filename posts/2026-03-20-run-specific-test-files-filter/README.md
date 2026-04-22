# Running Specific Test Files and Filtering in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, CI/CD, Infrastructure as Code, Test Filtering

Description: Learn how to run specific OpenTofu test files and filter test execution to speed up development workflows and targeted debugging.

## Why Filter Tests?

Running all infrastructure tests on every change can be slow and expensive. Test filtering allows you to:

- Run only the tests relevant to a changed module
- Debug a specific failing test file without running the full suite
- Run fast unit tests in every CI run, with full integration tests on merge
- Focus on a subset of tests during development

## Running All Tests

```bash
tofu test
```

This runs all supported test files (`*.tftest.hcl`, `*.tftest.json`, `*.tofutest.hcl`, and `*.tofutest.json`) in the current module directory and its `tests/` subdirectory.

## Running a Specific Test File

Use the `-filter` flag to run a single test file:

```bash
tofu test -filter=tests/vpc.tftest.hcl
```

You can specify multiple files:

```bash
tofu test \
  -filter=tests/vpc.tftest.hcl \
  -filter=tests/subnets.tftest.hcl
```

## Running Tests in a Specific Directory

Use `-chdir` to run tests for a specific module:

```bash
tofu -chdir=modules/vpc test
tofu -chdir=modules/rds test
```

## Filtering by Test File, Not Run Name

OpenTofu's `tofu test` command filters test execution by test file. It does not provide a CLI flag for running an individual `run` block by name, so put independently runnable scenarios in separate test files:

```bash
tofu test -filter=tests/create_vpc.tftest.hcl
```

## Combining Filters

```bash
# Run a specific file from a custom test directory
tofu test \
  -test-directory=tests/integration \
  -filter=tests/integration/basic_deployment.tftest.hcl
```

## Verbose Output

See the plan or state for each test run block as it executes:

```bash
tofu test -verbose
```

## JSON Output for CI

```bash
tofu test -json | tee test-results.ndjson
```

## Practical CI/CD Workflow

### Fast path: Unit test files on every PR

```yaml
- name: Unit Tests
  run: |
    tofu test \
      -test-directory=tests/unit \
      -json | tee unit-results.ndjson
```

### Full path: Integration tests on merge to main

```yaml
- name: Integration Tests
  if: github.ref == 'refs/heads/main'
  run: |
    tofu test \
      -test-directory=tests/integration \
      -verbose \
      -json | tee integration-results.ndjson
```

### Per-module testing in a monorepo

```bash
#!/bin/bash
# test-changed-modules.sh
# Detect which modules changed and test only those

CHANGED_MODULES=$(git diff --name-only HEAD~1 | grep "^modules/" | cut -d/ -f1-2 | sort -u)

for module in $CHANGED_MODULES; do
  echo "Testing $module..."
  tofu -chdir="$module" test -json | tee "${module//\//-}-results.ndjson"
done
```

## Test File Naming Conventions

Organize tests to make filtering intuitive:

```text
modules/vpc/
├── main.tf
└── tests/
    ├── unit/
    │   ├── cidr_allocation.tftest.hcl
    │   └── subnet_count.tftest.hcl
    └── integration/
        ├── basic_vpc.tftest.hcl
        └── multi_az_vpc.tftest.hcl
```

Run unit tests:
```bash
tofu test -filter=tests/unit/cidr_allocation.tftest.hcl
```

Run all integration tests:
```bash
tofu test -test-directory=tests/integration
```

## Checking Available Tests

```bash
# List test files without running them
find . -type f \( -name "*.tftest.hcl" -o -name "*.tftest.json" -o -name "*.tofutest.hcl" -o -name "*.tofutest.json" \) | sort
```

## Debugging a Failing Test

When a test fails, run it in isolation with verbose output:

```bash
tofu test \
  -filter=tests/integration/basic_vpc.tftest.hcl \
  -verbose \
  -json
```

## Best Practices

1. **Organize tests in subdirectories** (unit/, integration/) for easy filtering
2. **Name test files and run blocks descriptively** to make output and file filtering meaningful
3. **Run unit tests on every PR**, integration tests only on merge
4. **Use JSON output** in CI for machine-parseable results
5. **Keep test file names descriptive** so `-filter` paths are self-documenting

## Conclusion

OpenTofu's test filtering capabilities - via `-filter`, `-test-directory`, and `-chdir` - give you fine-grained control over test execution. By organizing tests into unit and integration suites and using these flags in your CI/CD pipeline, you can balance test thoroughness with execution speed.
