# How to Run Specific Test Files with -filter in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Filter, CI/CD, Infrastructure as Code

Description: Learn how to use the `-filter` flag in OpenTofu to run specific test files or individual test cases instead of the full test suite.

## Introduction

As your infrastructure codebase grows, so does the number of test files. Running the entire test suite on every change is slow and wasteful. OpenTofu's `-filter` flag lets you target specific test files, making your feedback loop dramatically faster.

## Basic File Filtering

Pass one or more `-filter` flags with the path to a test file to run only those tests:

```bash
# Run only the S3 bucket tests

tofu test -filter=tests/s3_bucket.tftest.hcl

# Run multiple specific test files
tofu test \
  -filter=tests/s3_bucket.tftest.hcl \
  -filter=tests/iam_roles.tftest.hcl
```

The path is relative to the current working directory, even if you also set `-test-directory`.

## Run Block Scope

The `-filter` flag works at the test-file level. It does not support a `file::run_block_name` syntax to run a single `run` block.

```bash
# Run only the dedicated test file for this scenario
tofu test -filter=tests/s3_bucket_versioning.tftest.hcl
```

If you need that level of isolation while debugging, move the scenario into its own test file and filter that file instead. This is especially useful when debugging a failing test-you can run only the file that contains the broken scenario instead of the entire suite.

## Practical CI/CD Patterns

### Filtering by Changed Module

In a monorepo, you can compute the relevant test files from the git diff and pass them to `-filter`:

```bash
#!/usr/bin/env bash
# ci/run-affected-tests.sh

# Find modules that changed in this PR
CHANGED_MODULES=$(git diff --name-only origin/main...HEAD \
  | grep -oP 'modules/[^/]+' \
  | sort -u)

FILTER_ARGS=""
for module in $CHANGED_MODULES; do
  # Look for a corresponding test file
  test_file="tests/${module##modules/}.tftest.hcl"
  if [ -f "$test_file" ]; then
    FILTER_ARGS="$FILTER_ARGS -filter=$test_file"
  fi
done

if [ -n "$FILTER_ARGS" ]; then
  tofu test $FILTER_ARGS
else
  echo "No test files found for changed modules"
fi
```

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: OpenTofu Tests

on:
  pull_request:
    paths:
      - 'modules/networking/**'

jobs:
  test-networking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.7.0"

      - name: Init
        run: tofu init

      - name: Run networking tests only
        run: tofu test -filter=tests/networking.tftest.hcl
```

## Combining `-filter` with `-test-directory`

When your test files live in a subdirectory, combine both flags:

```bash
# Set the base test directory and then filter within it
tofu test \
  -test-directory=tests/integration \
  -filter=tests/integration/rds.tftest.hcl
```

Note that when using both flags, the `-filter` path must still be resolvable from the working directory, not relative to `-test-directory`.

## Listing Available Tests

Before filtering, it helps to know what test files and run blocks exist. A quick shell one-liner lists them:

```bash
# List all test files
find . -type f \( -name "*.tftest.hcl" -o -name "*.tftest.json" -o -name "*.tofutest.hcl" -o -name "*.tofutest.json" \)

# List all run block names across HCL-based test files
grep -r '^run "' . --include="*.tftest.hcl" --include="*.tofutest.hcl"
```

## Conclusion

The `-filter` flag turns `tofu test` from an all-or-nothing command into a precision tool. Use it in your editor integration for instant feedback, in CI to run only affected tests, and during debugging to isolate a smaller subset of your suite.
