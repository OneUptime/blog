# How to Use Machine and Human Readable Output Introduced in OpenTofu 1.11

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output Format, OpenTofu 1.11, CLI, Automation, Infrastructure as Code

Description: Learn how to use the improved machine and human readable output formats introduced in OpenTofu 1.11 for better CI/CD integration and operator experience.

## Introduction

OpenTofu CLI provides standard human-readable output for operators and machine-readable JSON interfaces for automation tooling. The regular `plan` and `apply` commands are intended for people, while `-json` and `tofu show -json` expose structured data that scripts can parse.

## Human-Readable Plan Output

The standard plan output provides a readable summary of the proposed changes.

```bash
# Standard plan with human-readable formatting

tofu plan

# Typical output includes:
# - Resource addresses
# - Symbols such as + and ~ for planned actions
# - A final summary of add/change/destroy counts

OpenTofu will perform the following actions:

  # aws_s3_bucket.logs will be created
  + resource "aws_s3_bucket" "logs" {
      + bucket        = "myapp-prod-logs"
      + force_destroy = false
    }

  # aws_db_instance.main will be updated in-place
  ~ resource "aws_db_instance" "main" {
      ~ backup_retention_period = 7 -> 14
        identifier              = "myapp-prod-db"
    }

Plan: 1 to add, 1 to change, 0 to destroy.
```

## Machine-Readable JSON Output

Use `-json` for the machine-readable UI event stream, or `tofu show -json` to inspect a saved plan file as JSON.

```bash
# Save a plan file, then render it as JSON
tofu plan -out=plan.tfplan
tofu show -plan=plan.tfplan -json > plan.json

# Stream plan/apply UI events as newline-delimited JSON
tofu plan -json | tee plan-ui.jsonl
tofu apply -json -auto-approve | tee apply-ui.jsonl

# Parse plan UI output with jq
tofu plan -json | jq 'select(.type == "planned_change") | .change.resource.addr'

# Count planned changes by action
tofu plan -json | \
  jq -r 'select(.type == "planned_change") | .change.action' | \
  sort | uniq -c
```

## Parsing Apply Results in CI/CD

Extract apply results for notifications and audit logs.

```bash
#!/bin/bash
# scripts/apply-with-reporting.sh

APPLY_LOG=$(mktemp)

tofu apply -json -auto-approve | tee "$APPLY_LOG"

# Extract summary
ADDED=$(jq -r 'select(.type == "change_summary") | .changes.add // 0' "$APPLY_LOG" | tail -1)
CHANGED=$(jq -r 'select(.type == "change_summary") | .changes.change // 0' "$APPLY_LOG" | tail -1)
REMOVED=$(jq -r 'select(.type == "change_summary") | .changes.remove // 0' "$APPLY_LOG" | tail -1)

echo "Apply complete: +${ADDED} ~${CHANGED} -${REMOVED}"

# Post to Slack
curl -s -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"OpenTofu apply complete: +${ADDED} ~${CHANGED} -${REMOVED}\"}"

rm "$APPLY_LOG"
```

## Structured Output for Monitoring

Feed JSON output into log aggregation systems.

```bash
# Send structured logs to CloudWatch.
# Assumes the log group and log stream already exist.
STREAM_NAME="${ENVIRONMENT}-$(date +%Y%m%d)"

tofu apply -json -auto-approve | while IFS= read -r line; do
  EVENT=$(jq -cn --arg message "$line" --arg timestamp "$(date +%s%3N)" \
    '[{timestamp: ($timestamp | tonumber), message: $message}]')

  aws logs put-log-events \
    --log-group-name "/opentofu/applies" \
    --log-stream-name "$STREAM_NAME" \
    --log-events "$EVENT"
done
```

## Exit Codes for Automation

For `tofu plan`, `-detailed-exitcode` lets scripts distinguish no-op plans from plans with changes.

```bash
# Exit codes for `tofu plan -detailed-exitcode`:
# 0 = success with no changes
# 1 = error
# 2 = success with changes

tofu plan -detailed-exitcode
EXIT_CODE=$?

case $EXIT_CODE in
  0) echo "No changes needed" ;;
  1) echo "Plan failed" && exit 1 ;;
  2) echo "Changes detected, proceeding to apply" ;;
esac
```

## Output Format in GitHub Actions

Use JSON output to create PR comments with plan summaries.

```yaml
# .github/workflows/tofu-pr.yml
- name: Run OpenTofu Plan
  id: plan
  run: |
    tofu plan -json | tee plan-output.jsonl
    ADDED=$(jq -r 'select(.type=="change_summary") | .changes.add // 0' plan-output.jsonl | tail -1)
    CHANGED=$(jq -r 'select(.type=="change_summary") | .changes.change // 0' plan-output.jsonl | tail -1)
    REMOVED=$(jq -r 'select(.type=="change_summary") | .changes.remove // 0' plan-output.jsonl | tail -1)
    echo "summary=Plan: +${ADDED:-0} ~${CHANGED:-0} -${REMOVED:-0}" >> "$GITHUB_OUTPUT"

- name: Comment on PR
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## OpenTofu Plan\n\`${{ steps.plan.outputs.summary }}\``
      })
```

## Summary

OpenTofu provides human-readable CLI output for operators and machine-readable JSON interfaces for automation. Use the standard `plan` and `apply` output for people, `-json` for the JSON UI event stream, and `tofu show -json` when you need a JSON representation of a saved plan file. Combined with `-detailed-exitcode`, these interfaces make CI/CD automation more reliable than parsing human-readable output.
