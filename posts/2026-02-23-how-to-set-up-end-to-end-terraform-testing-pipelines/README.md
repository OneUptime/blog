# How to Set Up End-to-End Terraform Testing Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, CI/CD, End-to-End Testing, DevOps, Pipeline

Description: Learn how to build a complete end-to-end testing pipeline for Terraform that covers formatting, validation, unit tests, integration tests, and security scanning.

---

A single `terraform validate` in your CI pipeline is not enough. Real Terraform testing requires multiple stages, from fast static checks to slow but thorough integration tests that create actual infrastructure. Setting up a proper end-to-end testing pipeline gives you confidence that your infrastructure code works before it touches any environment.

## The Testing Pyramid for Terraform

Just like application testing, Terraform testing follows a pyramid structure. Fast, cheap tests at the bottom catch most issues. Slower, more expensive tests at the top catch the rest.

```text
        /  E2E Tests  \          - Full deploy + verify + destroy
       /  Integration  \         - Real resources, API calls
      /  Contract Tests \        - Module interface checks
     /    Unit Tests     \       - Logic, validation, plan checks
    /  Static Analysis    \      - fmt, validate, lint, security scan
```

Each layer runs only if the previous one passes. This saves time and money because you do not spin up real infrastructure when there is a syntax error.

## Stage 1: Static Analysis

The fastest checks run first. No cloud credentials needed.

```yaml
# .github/workflows/terraform-pipeline.yml
name: Terraform Testing Pipeline

on:
  pull_request:
    paths:
      - 'modules/**'
      - 'environments/**'
      - '**.tf'

jobs:
  static-analysis:
    name: Static Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # Check formatting
      - name: Format Check
        run: terraform fmt -check -recursive

      # Validate all module directories
      - name: Validate Modules
        run: |
          for dir in modules/*/; do
            echo "Validating $dir..."
            cd "$dir"
            terraform init -backend=false
            terraform validate
            cd -
          done

      # Lint with tflint
      - name: Setup TFLint
        uses: terraform-linters/setup-tflint@v4

      - name: Run TFLint
        run: |
          tflint --init
          for dir in modules/*/; do
            echo "Linting $dir..."
            tflint --chdir="$dir" --recursive
          done

      # Security scanning with tfsec/trivy
      - name: Run Trivy Security Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          exit-code: '1'
          severity: 'HIGH,CRITICAL'
```

## Stage 2: Unit Tests

Unit tests use `terraform plan` and the native test framework. They verify logic without creating resources.

```yaml
  unit-tests:
    name: Unit Tests
    needs: static-analysis
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module:
          - networking
          - compute
          - database
          - monitoring
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Run Module Tests
        working-directory: modules/${{ matrix.module }}
        run: |
          terraform init -backend=false
          terraform test -verbose
        env:
          # Mock provider credentials for plan-only tests
          AWS_ACCESS_KEY_ID: "test"
          AWS_SECRET_ACCESS_KEY: "test"
          AWS_DEFAULT_REGION: "us-east-1"
```

The test files live alongside each module:

```hcl
# modules/networking/tests/unit.tftest.hcl

variables {
  vpc_cidr           = "10.0.0.0/16"
  environment        = "dev"
  availability_zones = ["us-east-1a", "us-east-1b"]
}

# Test variable validation
run "rejects_invalid_cidr" {
  command = plan
  variables {
    vpc_cidr = "not-a-cidr"
  }
  expect_failures = [var.vpc_cidr]
}

# Test resource configuration
run "creates_expected_resources" {
  command = plan

  assert {
    condition     = length([for rc in plan.resource_changes : rc if rc.type == "aws_subnet"]) == 4
    error_message = "Should create 4 subnets (2 public + 2 private)"
  }
}

# Test output types
run "outputs_are_correct_type" {
  command = plan

  assert {
    condition     = output.vpc_id != null
    error_message = "vpc_id output should not be null"
  }
}
```

## Stage 3: Contract Tests

Contract tests verify module interfaces without full integration.

```yaml
  contract-tests:
    name: Contract Tests
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Run Contract Tests
        run: |
          # Run all contract test files across modules
          for dir in modules/*/; do
            if ls "$dir"/tests/contract*.tftest.hcl 1>/dev/null 2>&1; then
              echo "Running contract tests for $dir..."
              cd "$dir"
              terraform init -backend=false
              terraform test -filter="tests/contract*.tftest.hcl"
              cd -
            fi
          done
```

## Stage 4: Integration Tests

Integration tests create real infrastructure. These need cloud credentials and cost real money, so they run selectively.

```yaml
  integration-tests:
    name: Integration Tests
    needs: contract-tests
    runs-on: ubuntu-latest
    # Only run on specific conditions to save costs
    if: |
      github.event.pull_request.draft == false &&
      contains(github.event.pull_request.labels.*.name, 'run-integration-tests')
    environment: testing

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-arn: ${{ secrets.AWS_TEST_ROLE_ARN }}
          aws-region: us-east-1

      - name: Run Integration Tests
        working-directory: test
        run: |
          go test -v -timeout 30m -run TestIntegration ./...
        env:
          # Unique prefix to avoid resource conflicts
          TEST_PREFIX: "ci-${{ github.run_id }}"
```

The integration tests in Go:

```go
// test/integration_test.go
package test

import (
    "fmt"
    "os"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/retry"
    http_helper "github.com/gruntwork-io/terratest/modules/http-helper"
    "github.com/stretchr/testify/assert"
)

func TestIntegrationNetworking(t *testing.T) {
    t.Parallel()

    prefix := os.Getenv("TEST_PREFIX")
    if prefix == "" {
        prefix = fmt.Sprintf("test-%d", time.Now().Unix())
    }

    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "vpc_cidr":           "10.0.0.0/16",
            "environment":        prefix,
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
    }

    // Always clean up
    defer terraform.Destroy(t, opts)

    // Apply and verify
    terraform.InitAndApply(t, opts)

    // Verify VPC was actually created
    vpcId := terraform.Output(t, opts, "vpc_id")
    assert.Regexp(t, `^vpc-[a-f0-9]+$`, vpcId)

    // Verify subnets are routable
    subnetIds := terraform.OutputList(t, opts, "private_subnet_ids")
    assert.Len(t, subnetIds, 2)
}

func TestIntegrationFullStack(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../environments/test",
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Verify the application is reachable
    url := terraform.Output(t, opts, "app_url")
    retry.DoWithRetry(t, "Check app health", 10, 10*time.Second, func() (string, error) {
        statusCode, body := http_helper.HttpGet(t, url, nil)
        if statusCode != 200 {
            return "", fmt.Errorf("expected 200, got %d", statusCode)
        }
        return body, nil
    })
}
```

## Stage 5: Cleanup and Reporting

Always ensure test resources are cleaned up, even if tests fail.

```yaml
  cleanup:
    name: Cleanup Test Resources
    needs: integration-tests
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-arn: ${{ secrets.AWS_TEST_ROLE_ARN }}
          aws-region: us-east-1

      - name: Cleanup orphaned resources
        run: |
          # Find and destroy resources with the test prefix
          PREFIX="ci-${{ github.run_id }}"
          python scripts/cleanup-test-resources.py --prefix "$PREFIX"

  report:
    name: Test Report
    needs: [static-analysis, unit-tests, contract-tests, integration-tests]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Test Summary
        run: |
          echo "## Test Results" >> $GITHUB_STEP_SUMMARY
          echo "| Stage | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Static Analysis | ${{ needs.static-analysis.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Unit Tests | ${{ needs.unit-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Contract Tests | ${{ needs.contract-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Integration Tests | ${{ needs.integration-tests.result }} |" >> $GITHUB_STEP_SUMMARY
```

## Cost Management

Integration tests that create real resources cost money. Keep costs under control:

```hcl
# test/fixtures/cost-optimized.tfvars
# Use smallest possible resources for testing

instance_type    = "t3.nano"
db_instance_class = "db.t3.micro"
min_capacity     = 1
max_capacity     = 1
multi_az         = false
```

```yaml
# Only run expensive tests when explicitly requested
integration-tests:
  if: |
    contains(github.event.pull_request.labels.*.name, 'run-integration-tests') ||
    github.event_name == 'schedule'
```

Schedule nightly runs for the full test suite, and use labels to trigger integration tests on specific PRs.

## Putting It Together

A complete testing pipeline gives you fast feedback on easy problems and thorough verification of complex changes. The key is layering tests so each stage adds value without duplicating work. Static analysis catches formatting and syntax. Unit tests catch logic errors. Contract tests catch interface breaks. Integration tests catch deployment issues.

Start with stages 1 and 2 - they require no cloud credentials and catch most problems. Add integration tests when you are ready for the cost and complexity. The pipeline pays for itself the first time it catches a breaking change before it reaches production.

For more on specific testing techniques, see [How to Test Terraform with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-with-github-actions/view) and [How to Set Up Continuous Testing for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-continuous-testing-for-terraform-modules/view).
