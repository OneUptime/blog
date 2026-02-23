# How to Use terraform plan -refresh-only for State Updates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Refresh, Drift Detection, Infrastructure as Code, DevOps

Description: Learn how to use terraform plan -refresh-only to update your state file to match actual cloud infrastructure without modifying resources, including drift detection and state reconciliation workflows.

---

The `terraform plan -refresh-only` mode was introduced in Terraform 1.1 as the replacement for the standalone `terraform refresh` command. It lets you update your state file to reflect the current state of your cloud resources without making any changes to those resources. This is essential for drift detection, state reconciliation, and understanding what has changed outside of Terraform.

This guide covers when to use refresh-only mode, how it differs from a regular plan, and how to build it into your operational workflows.

## What -refresh-only Does

During a normal `terraform plan`, Terraform:

1. Refreshes state by querying cloud APIs.
2. Compares refreshed state with configuration.
3. Generates a plan to make infrastructure match configuration.

With `-refresh-only`, Terraform stops after step 1. It shows you what changed in your cloud infrastructure since the last state update, but it does not propose any changes to make infrastructure match configuration.

```bash
# Normal plan - shows what Terraform wants to change
terraform plan

# Refresh-only plan - shows what changed in the cloud
terraform plan -refresh-only
```

## Why terraform refresh Was Deprecated

The standalone `terraform refresh` command had a dangerous behavior: it automatically updated state without showing you what was changing. If a resource was accidentally deleted, `terraform refresh` would silently remove it from state, making it impossible to recreate with a simple `terraform apply`.

```bash
# Old way (deprecated) - updates state without review
terraform refresh

# New way - shows changes before you approve them
terraform plan -refresh-only
terraform apply -refresh-only
```

The `-refresh-only` approach is safer because you see exactly what will change in state before it happens.

## Basic Usage

```bash
# Step 1: Preview state changes
terraform plan -refresh-only

# Output shows detected drift:
# Note: Objects have changed outside of Terraform
#
# Terraform detected the following changes made outside of
# Terraform since the last "terraform apply":
#
#   # aws_instance.web has been changed
#   ~ resource "aws_instance" "web" {
#         id                = "i-0abc123def456"
#       ~ instance_type     = "t3.medium" -> "t3.large"
#         tags              = {
#             "Name" = "web-server"
#         }
#     }

# Step 2: Apply state changes if they look correct
terraform apply -refresh-only
```

## Common Use Cases

### Drift Detection

Run `-refresh-only` in CI/CD to detect infrastructure changes made outside Terraform:

```bash
#!/bin/bash
# drift-check.sh - Detect infrastructure drift

set -euo pipefail

# Run refresh-only plan and capture output
PLAN_OUTPUT=$(terraform plan -refresh-only -no-color -detailed-exitcode 2>&1) || EXIT_CODE=$?

case ${EXIT_CODE:-0} in
  0)
    echo "No drift detected. State matches infrastructure."
    ;;
  2)
    echo "DRIFT DETECTED. The following changes were made outside Terraform:"
    echo "$PLAN_OUTPUT"
    exit 1  # Fail the pipeline to alert the team
    ;;
  *)
    echo "ERROR: terraform plan failed"
    echo "$PLAN_OUTPUT"
    exit 1
    ;;
esac
```

### Reconciling After Manual Changes

When someone makes a change through the AWS console or CLI, use `-refresh-only` to update state:

```bash
# Someone changed the instance type in the console from t3.medium to t3.large

# See what changed
terraform plan -refresh-only
# Shows: instance_type = "t3.medium" -> "t3.large"

# Option A: Accept the change (update state to match reality)
terraform apply -refresh-only

# Then update your configuration to match
# Change instance_type in main.tf from "t3.medium" to "t3.large"

# Verify config and state are in sync
terraform plan
# Should show: No changes.

# Option B: Revert the change (keep state as-is, let Terraform fix it)
# Don't run apply -refresh-only
# Instead, run a normal apply
terraform apply
# Terraform changes instance_type back to "t3.medium"
```

### Detecting Deleted Resources

```bash
terraform plan -refresh-only

# Output when a resource was deleted:
# Note: Objects have changed outside of Terraform
#
#   # aws_s3_bucket.data has been deleted
#   - resource "aws_s3_bucket" "data" {
#       - bucket = "my-data-bucket"
#       - id     = "my-data-bucket"
#     }
#
# Would update state to remove this resource.
```

If you apply this, the resource is removed from state. Running `terraform plan` afterward will show the resource needs to be created. This is the correct behavior - it accurately reflects that the bucket no longer exists.

## Targeted Refresh

You can refresh specific resources instead of everything:

```bash
# Only refresh a specific resource
terraform plan -refresh-only -target=aws_instance.web

# Refresh all resources in a module
terraform plan -refresh-only -target=module.networking

# Refresh multiple specific resources
terraform plan -refresh-only \
  -target=aws_instance.web \
  -target=aws_rds_cluster.database
```

This is useful for large state files where a full refresh takes a long time, or when you only care about drift in specific resources.

## Automating Drift Detection in CI/CD

```yaml
# .github/workflows/drift-detection.yml
name: Terraform Drift Detection

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  check-drift:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: |
          terraform init \
            -backend-config="key=${{ matrix.environment }}/terraform.tfstate"

      - name: Check for Drift
        id: drift
        run: |
          set +e
          terraform plan -refresh-only -detailed-exitcode -no-color > drift-report.txt 2>&1
          EXIT_CODE=$?
          set -e

          if [ $EXIT_CODE -eq 2 ]; then
            echo "drift_detected=true" >> $GITHUB_OUTPUT
          else
            echo "drift_detected=false" >> $GITHUB_OUTPUT
          fi

      - name: Report Drift
        if: steps.drift.outputs.drift_detected == 'true'
        run: |
          echo "Drift detected in ${{ matrix.environment }}"
          cat drift-report.txt

      - name: Create Issue for Drift
        if: steps.drift.outputs.drift_detected == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('drift-report.txt', 'utf8');
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Infrastructure drift detected in ${{ matrix.environment }}`,
              body: `Drift was detected during the scheduled check.\n\n\`\`\`\n${report}\n\`\`\``,
              labels: ['terraform', 'drift', '${{ matrix.environment }}']
            });
```

## Combining with Regular Plans

A good workflow is to run `-refresh-only` before your regular plan to separate drift detection from planned changes:

```bash
#!/bin/bash
# plan-with-drift-check.sh

set -euo pipefail

echo "=== Checking for infrastructure drift ==="
terraform plan -refresh-only -no-color

read -p "Apply state updates from drift? (yes/no): " response
if [ "$response" = "yes" ]; then
  terraform apply -refresh-only -auto-approve
fi

echo ""
echo "=== Running standard plan ==="
terraform plan
```

This makes it clear which changes are from drift (someone modified cloud resources) and which are from your Terraform configuration changes.

## Output Formats

Use different output formats for different audiences:

```bash
# Human-readable output (default)
terraform plan -refresh-only

# JSON output for programmatic processing
terraform plan -refresh-only -json | jq '.resource_drift'

# Save the plan for later review
terraform plan -refresh-only -out=refresh-plan.tfplan

# Show the saved plan
terraform show refresh-plan.tfplan

# Apply the saved plan
terraform apply refresh-plan.tfplan
```

## Handling Sensitive Data in Drift Reports

Refresh output may contain sensitive values. Be careful with logging:

```bash
# Filter sensitive data from drift reports
terraform plan -refresh-only -no-color 2>&1 | \
  grep -v "password\|secret\|key\|token" > safe-drift-report.txt

# Or use the JSON output and filter specific fields
terraform plan -refresh-only -json 2>/dev/null | \
  jq 'del(.. | .password?, .secret?, .api_key?)' > filtered-report.json
```

## Best Practices

1. **Use `-refresh-only` instead of `terraform refresh`.** The deprecated command updates state without review.
2. **Run refresh-only checks regularly** in CI/CD to catch drift before it causes problems.
3. **Review drift before accepting it.** Do not blindly apply refresh-only plans. Understand why each change happened.
4. **Use `-detailed-exitcode`** in automation to programmatically detect drift (exit code 2 means changes detected).
5. **Separate drift detection from planned changes** by running refresh-only first, then a regular plan.
6. **Target specific resources** when debugging drift in large state files to speed up the process.
7. **Be cautious with deleted resources.** Applying a refresh-only plan that removes a deleted resource from state means Terraform will want to recreate it on the next apply.

The `terraform plan -refresh-only` command is your primary tool for understanding what has changed in your infrastructure outside of Terraform. Use it regularly, and you will always know the true state of your cloud resources.
