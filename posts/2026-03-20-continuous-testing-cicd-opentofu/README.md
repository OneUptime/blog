# How to Set Up Continuous Testing in CI/CD for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CI/CD, Testing, Continuous Integration, GitHub Action

Description: Learn how to build a comprehensive continuous testing pipeline for OpenTofu that runs linting, security scanning, unit tests, and integration tests at the right stages of the development workflow.

## Introduction

A comprehensive CI/CD testing strategy for OpenTofu runs different test types at different stages: fast static checks on every commit, unit tests on every PR, and integration tests on main branch or scheduled. This layered approach provides fast feedback without the cost of running full integration tests on every change.

## Testing Pyramid for OpenTofu

```text
                    ┌────────────────┐
                    │ Integration    │  (nightly, main branch)
                    │ Tests          │  Minutes, real infra
                    ├────────────────┤
                    │ Unit Tests     │  (every PR)
                    │ (mock provider)│  Seconds, no cloud
                    ├────────────────┤
                    │ Static Checks  │  (every commit)
                    │ fmt,validate,  │  Seconds, no cloud
                    │ tflint,checkov │
                    └────────────────┘
```

## Complete CI/CD Workflow

```yaml
# .github/workflows/opentofu-ci.yml

name: OpenTofu CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  TOFU_VERSION: "1.11.0"

jobs:
  # Stage 1: Static analysis (runs on every commit, fast)
  static-analysis:
    name: Static Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ env.TOFU_VERSION }}

      - name: Format check
        run: |
          if ! tofu fmt -check -recursive .; then
            echo "Run 'tofu fmt -recursive .' to fix formatting"
            exit 1
          fi

      - name: Validate
        run: |
          for dir in modules/*/; do
            echo "Validating $dir"
            tofu -chdir="$dir" init -backend=false
            tofu -chdir="$dir" validate
          done

      - name: tflint
        uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: v0.50.0
      - run: tflint --init && tflint --recursive --format=compact

      - name: Checkov security scan
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform
          soft_fail: false

  # Stage 2: Unit tests (runs on every PR)
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: static-analysis
    strategy:
      matrix:
        module: [vpc, database, security-groups, ecs-service]
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ env.TOFU_VERSION }}

      - name: Run unit tests - ${{ matrix.module }}
        run: |
          cd modules/${{ matrix.module }}
          tofu test -test-directory=tests/unit -verbose
        # No AWS credentials needed - uses mock providers

  # Stage 3: Integration tests (runs on main branch merges and nightly)
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.event_name == 'schedule'
    needs: unit-tests
    environment: test  # Requires environment protection
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.TEST_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ env.TOFU_VERSION }}

      - name: Run integration tests
        run: |
          cd modules/vpc
          tofu test -test-directory=tests/integration -verbose
        timeout-minutes: 30

  # Stage 4: Plan on production (runs on PRs)
  plan-production:
    name: Production Plan
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: static-analysis
    environment: production-plan  # Read-only access
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (read-only)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.PROD_PLAN_ROLE_ARN }}
          aws-region: us-east-1

      - name: OpenTofu Plan
        run: |
          tofu -chdir=environments/prod init
          tofu -chdir=environments/prod plan -no-color
        continue-on-error: false
```

## Pre-commit Hooks for Local Development

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.105.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint

  - repo: https://github.com/bridgecrewio/checkov
    rev: 3.2.0
    hooks:
      - id: checkov
        args: [--soft-fail]
```

The `antonbabenko/pre-commit-terraform` hooks discover and use the `tofu` binary automatically when it is on `PATH` (or you can set the binary path explicitly), so they work for both Terraform and OpenTofu.

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run all hooks manually
pre-commit run --all-files
```

## Test Results and Reporting

`tofu test` does not emit JUnit XML directly. The supported machine-readable output is streaming JSON via the `-json` flag, which you can capture and attach to the workflow run as an artifact for later inspection (or convert to JUnit with a separate tool).

```yaml
      - name: Run unit tests with JSON output
        run: |
          mkdir -p test-results
          cd modules/${{ matrix.module }}
          tofu test -test-directory=tests/unit -json | tee ../../test-results/${{ matrix.module }}.json

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: tofu-test-results-${{ matrix.module }}
          path: test-results/${{ matrix.module }}.json
```

## Conclusion

A layered OpenTofu testing strategy provides both fast feedback (static checks in seconds) and high confidence (integration tests against real infrastructure). The key is running each test type at the appropriate stage: static checks on every commit, unit tests on every PR, integration tests on main branch merges. This prevents slow tests from blocking developer productivity while ensuring thorough validation before production deployment.
