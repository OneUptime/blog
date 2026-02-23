# How to Set Up Continuous Testing for Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Continuous Testing, CI/CD, Modules, DevOps, Automation

Description: Learn how to implement continuous testing for Terraform modules with scheduled tests, drift detection, provider update monitoring, and automated regression testing.

---

Continuous testing for Terraform modules means running tests not just when code changes, but on an ongoing basis. Provider updates, cloud API changes, upstream module modifications, and configuration drift can break your modules at any time. A module that passed all tests last week might fail today because AWS changed a default value or deprecated an API. Continuous testing catches these issues before they surface in a deployment.

## What Continuous Testing Covers

Continuous testing goes beyond PR-triggered tests to include:

- **Scheduled regression tests**: Run the full test suite periodically
- **Drift detection**: Verify deployed infrastructure matches configuration
- **Provider compatibility tests**: Test against new provider versions
- **Dependency monitoring**: Check that upstream modules still work
- **Smoke tests**: Quick health checks on deployed environments

## Scheduled Regression Tests

Run your full test suite on a schedule to catch environment-caused failures.

```yaml
# .github/workflows/continuous-testing.yml
name: Continuous Module Testing

on:
  schedule:
    # Run every night at 2 AM UTC
    - cron: '0 2 * * *'
  # Allow manual trigger
  workflow_dispatch:
    inputs:
      module:
        description: 'Specific module to test (empty for all)'
        required: false

jobs:
  discover-modules:
    runs-on: ubuntu-latest
    outputs:
      modules: ${{ steps.find.outputs.modules }}
    steps:
      - uses: actions/checkout@v4
      - id: find
        run: |
          # Find all modules that have tests
          MODULES=$(find modules -name "*.tftest.hcl" -exec dirname {} \; | \
            sort -u | sed 's|/tests$||' | \
            jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "modules=$MODULES" >> $GITHUB_OUTPUT

  test-module:
    needs: discover-modules
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        module: ${{ fromJson(needs.discover-modules.outputs.modules) }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TEST_ROLE }}
          aws-region: us-east-1

      - name: Run Tests
        working-directory: ${{ matrix.module }}
        run: |
          terraform init
          terraform test -verbose

      - name: Report Results
        if: always()
        run: |
          echo "## ${{ matrix.module }}" >> $GITHUB_STEP_SUMMARY
          echo "Status: ${{ job.status }}" >> $GITHUB_STEP_SUMMARY

  notify-failures:
    needs: test-module
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Send Slack Notification
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Terraform continuous tests failed! Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Drift Detection

Drift happens when infrastructure changes outside of Terraform. Scheduled plan checks detect this.

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PLAN_ROLE }}
          aws-region: us-east-1

      - name: Check for Drift
        id: drift
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform init
          # -detailed-exitcode: 0=no changes, 1=error, 2=changes detected
          terraform plan -detailed-exitcode -out=drift.tfplan 2>&1 | tee plan-output.txt
          EXIT_CODE=${PIPESTATUS[0]}
          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT

          if [ $EXIT_CODE -eq 2 ]; then
            echo "drift_detected=true" >> $GITHUB_OUTPUT
            echo "DRIFT DETECTED in ${{ matrix.environment }}"
          elif [ $EXIT_CODE -eq 0 ]; then
            echo "drift_detected=false" >> $GITHUB_OUTPUT
            echo "No drift in ${{ matrix.environment }}"
          else
            echo "Error running plan"
            exit 1
          fi

      - name: Create Issue on Drift
        if: steps.drift.outputs.drift_detected == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const planOutput = fs.readFileSync(
              'environments/${{ matrix.environment }}/plan-output.txt', 'utf8'
            );

            // Check for existing drift issue
            const issues = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: 'drift,${{ matrix.environment }}',
              state: 'open'
            });

            const body = `Drift detected in **${{ matrix.environment }}** environment.

            \`\`\`
            ${planOutput.slice(-2000)}
            \`\`\`

            Run ID: ${{ github.run_id }}`;

            if (issues.data.length === 0) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Infrastructure drift detected in ${{ matrix.environment }}`,
                body: body,
                labels: ['drift', '${{ matrix.environment }}']
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issues.data[0].number,
                body: body
              });
            }
```

## Provider Compatibility Testing

Test your modules against new provider versions before upgrading.

```yaml
# .github/workflows/provider-compat.yml
name: Provider Compatibility

on:
  schedule:
    - cron: '0 4 * * 1'  # Every Monday at 4 AM

jobs:
  check-provider-updates:
    runs-on: ubuntu-latest
    outputs:
      new_version: ${{ steps.check.outputs.new_version }}
    steps:
      - uses: actions/checkout@v4
      - id: check
        run: |
          # Get current provider version from lock file
          CURRENT=$(grep -A1 'provider "registry.terraform.io/hashicorp/aws"' \
            .terraform.lock.hcl | grep version | awk '{print $3}' | tr -d '"')

          # Get latest version from registry
          LATEST=$(curl -s https://registry.terraform.io/v1/providers/hashicorp/aws | \
            jq -r '.version')

          echo "Current: $CURRENT, Latest: $LATEST"
          if [ "$CURRENT" != "$LATEST" ]; then
            echo "new_version=$LATEST" >> $GITHUB_OUTPUT
          fi

  test-new-provider:
    needs: check-provider-updates
    if: needs.check-provider-updates.outputs.new_version != ''
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [networking, compute, database]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Test with New Provider
        working-directory: modules/${{ matrix.module }}
        run: |
          # Update provider constraint temporarily
          terraform init -upgrade
          terraform test -verbose
```

## Smoke Tests for Deployed Environments

Quick tests that verify deployed infrastructure is still functional.

```go
// test/smoke_test.go
package test

import (
    "fmt"
    "net/http"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/assert"
)

// TestSmokeProduction runs quick health checks against production
func TestSmokeProduction(t *testing.T) {
    // Read outputs from existing state (don't apply anything)
    opts := &terraform.Options{
        TerraformDir: "../environments/production",
    }

    terraform.Init(t, opts)

    // Check that the load balancer responds
    albDNS := terraform.Output(t, opts, "alb_dns_name")
    url := fmt.Sprintf("https://%s/health", albDNS)

    retry.DoWithRetry(t, "Health check", 3, 10*time.Second, func() (string, error) {
        resp, err := http.Get(url)
        if err != nil {
            return "", err
        }
        defer resp.Body.Close()

        if resp.StatusCode != 200 {
            return "", fmt.Errorf("health check returned %d", resp.StatusCode)
        }
        return "healthy", nil
    })

    // Check that the database endpoint is reachable
    dbEndpoint := terraform.Output(t, opts, "db_endpoint")
    assert.NotEmpty(t, dbEndpoint, "Database endpoint should exist")
}
```

Run smoke tests on a frequent schedule:

```yaml
smoke-tests:
  name: Smoke Tests
  runs-on: ubuntu-latest
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
    - run: cd test && go test -v -run TestSmoke -timeout 5m ./...
```

## Monitoring Test Results Over Time

Track test results to spot trends and regressions.

```yaml
  report-metrics:
    needs: test-module
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Report to monitoring
        run: |
          # Send metrics to your monitoring system
          curl -X POST "${{ secrets.METRICS_ENDPOINT }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"metric\": \"terraform.test.result\",
              \"value\": $([ \"${{ needs.test-module.result }}\" == \"success\" ] && echo 1 || echo 0),
              \"tags\": {
                \"pipeline\": \"continuous\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
              }
            }"
```

## Cost Management for Continuous Tests

Running tests continuously creates real cloud resources. Keep costs in check:

1. Use the smallest resource sizes possible for tests
2. Run integration tests less frequently than unit tests (nightly vs every PR)
3. Set test timeouts aggressively to prevent runaway resources
4. Tag all test resources with TTL and run cleanup jobs
5. Use plan-only tests wherever possible (free and fast)

```yaml
# Run different test levels at different frequencies
unit-tests:
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours (free, no resources)

integration-tests:
  schedule:
    - cron: '0 2 * * *'    # Daily (creates resources)

full-e2e:
  schedule:
    - cron: '0 2 * * 0'    # Weekly (expensive)
```

Continuous testing is about catching problems before they become incidents. The investment in automation pays for itself the first time you catch a provider regression or drift before it hits a deployment. Start with nightly regression tests and drift detection, then expand to provider compatibility and smoke tests as your needs grow.

For more on testing strategies, see [How to Set Up End-to-End Terraform Testing Pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-end-to-end-terraform-testing-pipelines/view) and [How to Test Terraform Provider Updates](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-provider-updates/view).
