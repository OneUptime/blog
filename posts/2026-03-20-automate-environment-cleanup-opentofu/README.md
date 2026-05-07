# How to Automate Environment Cleanup with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Automation, Cost Optimization, Environment Cleanup, CI/CD, Infrastructure as Code

Description: Learn how to automate the destruction of temporary and expired OpenTofu environments using scheduled pipelines and tag-based cleanup scripts.

## Introduction

Ephemeral environments for feature branches and PR testing accumulate quickly and drive up cloud costs. Automating cleanup ensures that temporary environments are destroyed promptly. This guide covers tag-based cleanup, scheduled pipelines, and TTL-enforced environment patterns.

## TTL Tags on Resources

Tag all temporary resources with a TTL timestamp.

```hcl
locals {
  # Calculate expiry time (24 hours from now for feature envs)
  expires_at = timeadd(timestamp(), "24h")
}

resource "aws_instance" "feature_env" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.small"

  tags = {
    Name        = "feature-${var.branch_name}"
    Environment = "feature"
    Branch      = var.branch_name
    ExpiresAt   = local.expires_at
    Temporary   = "true"
    ManagedBy   = "opentofu"
  }

  lifecycle {
    # Keep the original TTL assigned at creation time.
    ignore_changes = [tags["ExpiresAt"]]
  }
}
```

## Scheduled Cleanup Pipeline

```yaml
# .github/workflows/cleanup-environments.yml

name: Cleanup Expired Environments

on:
  schedule:
    - cron: "0 */6 * * *"  # every 6 hours
  workflow_dispatch:         # allow manual trigger

permissions:
  contents: write
  id-token: write
  pull-requests: read

jobs:
  cleanup:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1

      - name: Configure Git author
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_CLEANUP_ROLE_ARN }}
          aws-region: us-east-1

      - name: Cleanup expired feature environments
        run: |
          ./scripts/cleanup-expired.sh

      - name: Cleanup environments for closed PRs
        run: |
          ./scripts/cleanup-closed-prs.sh
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Cleanup Script

```bash
#!/usr/bin/env bash
# scripts/cleanup-expired.sh
set -euo pipefail
shopt -s nullglob

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
NOW_EPOCH=$(date -u +%s)
CLEANUP_COUNT=0

echo "Scanning for expired environments (current time: ${NOW})..."

# Find all feature environment directories
for env_dir in environments/features/*/; do
  branch_name=$(basename "$env_dir")
  ttl_file="${env_dir%/}/.ttl"

  if [[ ! -f "$ttl_file" ]]; then
    echo "SKIP: No TTL file found for ${branch_name}"
    continue
  fi

  expires_at=$(<"$ttl_file")
  expires_at_epoch=$(date -u -d "$expires_at" +%s)

  if (( expires_at_epoch < NOW_EPOCH )); then
    echo "DESTROYING expired environment: ${branch_name} (expired: ${expires_at})"

    cd "$env_dir"
    tofu init -input=false
    tofu destroy -auto-approve -input=false
    cd -

    # Remove the environment directory from Git
    git rm -rf "$env_dir"
    CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
  else
    echo "KEEP: ${branch_name} (expires: ${expires_at})"
  fi
done

if [[ $CLEANUP_COUNT -gt 0 ]]; then
  git commit -m "chore: destroy ${CLEANUP_COUNT} expired feature environment(s)"
  git push
  echo "Cleaned up ${CLEANUP_COUNT} environments."
else
  echo "No expired environments found."
fi
```

## PR Environment Cleanup

```bash
#!/usr/bin/env bash
# scripts/cleanup-closed-prs.sh
set -euo pipefail
shopt -s nullglob

OPEN_PRS=$(gh pr list --state open --limit 1000 --json number --jq '.[].number')
CLEANUP_COUNT=0

for env_dir in environments/pr/*/; do
  pr_number=$(basename "$env_dir" | sed 's/^pr-//')

  if ! echo "$OPEN_PRS" | grep -q "^${pr_number}$"; then
    echo "PR #${pr_number} is closed. Destroying environment..."

    cd "$env_dir"
    tofu init -input=false
    tofu destroy -auto-approve -input=false
    cd -

    git rm -rf "$env_dir"
    CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
    echo "Destroyed PR #${pr_number} environment"
  fi
done

if [[ $CLEANUP_COUNT -gt 0 ]]; then
  git commit -m "chore: destroy ${CLEANUP_COUNT} closed PR environment(s)"
  git push
else
  echo "No closed PR environments found."
fi
```

## AWS EventBridge Scheduled Cleanup

```hcl
resource "aws_cloudwatch_event_rule" "cleanup" {
  name                = "tofu-environment-cleanup"
  description         = "Trigger Lambda to tag-scan and destroy expired environments"
  schedule_expression = "rate(6 hours)"
}

resource "aws_cloudwatch_event_target" "cleanup_lambda" {
  rule = aws_cloudwatch_event_rule.cleanup.name
  arn  = aws_lambda_function.env_cleanup.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.env_cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cleanup.arn
}
```

## Summary

Automated environment cleanup prevents cost accumulation from forgotten temporary environments. TTL tags, scheduled GitHub Actions pipelines, and PR-state-aware cleanup scripts ensure ephemeral environments are destroyed promptly when no longer needed - reducing cloud waste automatically.
