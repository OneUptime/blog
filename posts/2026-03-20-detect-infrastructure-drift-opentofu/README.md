# How to Detect Infrastructure Drift with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Drift Detection, State Management, Infrastructure as Code, Monitoring, DevOps

Description: Learn how to use OpenTofu's plan -refresh-only command and scheduled CI jobs to detect infrastructure drift before it causes incidents.

## Introduction

Infrastructure drift occurs when the actual cloud resources diverge from the state recorded by OpenTofu - usually because someone made a manual change in the cloud console. Detecting drift early, before a planned change, prevents "apply works locally but breaks in CI" surprises.

## What Drift Looks Like

```text
# Drift: someone manually changed a security group rule

  ~ aws_security_group.web (drift)
      ~ ingress {
            from_port       = 443
            to_port         = 443
          ~ cidr_blocks     = [
              - "10.0.0.0/8",       # Was removed manually
            ]
        }
```

## Detecting Drift with plan -refresh-only

```bash
# Refresh-only plan shows ONLY drift - no config changes included
tofu plan -refresh-only -no-color

# If output shows:
# "No changes. Your infrastructure matches the configuration."
# → No drift

# If output shows resource changes:
# → Drift detected! Review and decide whether to accept or remediate
```

## Accepting Drift (apply -refresh-only)

If the manual change is intentional and you want to accept it as the new baseline:

```bash
# Update state to match current cloud state without changing any resources
tofu apply -refresh-only
```

## Rejecting Drift (regular apply)

If the manual change is unauthorized and you want to restore the declared configuration:

```bash
# Apply will restore resources to match the OpenTofu configuration
tofu plan    # Shows what will be changed to fix the drift
tofu apply   # Restores configuration
```

## Scheduled Drift Detection in CI

```yaml
# .github/workflows/drift-detection.yml
name: Infrastructure Drift Detection

on:
  schedule:
    - cron: "0 */6 * * *"   # Every 6 hours

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      issues: write
    strategy:
      matrix:
        environment: [dev, staging, prod]
    defaults:
      run:
        working-directory: environments/${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_wrapper: false
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - run: tofu init -lockfile=readonly

      - name: Detect Drift
        id: drift
        run: |
          set +e
          tofu plan -refresh-only -detailed-exitcode -no-color 2>&1 | tee drift-output.txt
          exit_code=$?
          set -e

          echo "exit_code=$exit_code" >> "$GITHUB_OUTPUT"

          if [ "$exit_code" -eq 1 ]; then
            exit 1
          fi

      - name: Alert on Drift
        if: steps.drift.outputs.exit_code == '2'
        uses: actions/github-script@v9
        with:
          script: |
            // Create a GitHub issue for drift detection
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Infrastructure Drift Detected - ${{ matrix.environment }}`,
              body: `Drift was detected in the \`${{ matrix.environment }}\` environment.\n\nRun \`tofu plan -refresh-only\` to review the drift.`,
              labels: ['infrastructure', 'drift']
            });
```

## -detailed-exitcode for Scripted Drift Detection

```bash
# Exit codes with -detailed-exitcode:
# 0 = no changes (no drift)
# 1 = error
# 2 = changes present (drift detected)

tofu plan -refresh-only -detailed-exitcode
DRIFT_EXIT_CODE=$?

if [ "$DRIFT_EXIT_CODE" -eq 2 ]; then
  echo "DRIFT DETECTED - investigation required"
  exit 1
elif [ "$DRIFT_EXIT_CODE" -eq 1 ]; then
  echo "OpenTofu plan failed"
  exit 1
elif [ "$DRIFT_EXIT_CODE" -eq 0 ]; then
  echo "No drift detected"
fi
```

## Conclusion

Regular drift detection with `tofu plan -refresh-only` on a schedule keeps your infrastructure honest. Catching drift early - before it compounds or causes an incident - is far cheaper than discovering it during an emergency. Automate detection with CI, create alerts for detected drift, and investigate every drift report to understand whether it was authorized or unauthorized.
