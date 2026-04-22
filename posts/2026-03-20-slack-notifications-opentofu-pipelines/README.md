# How to Set Up Slack Notifications from OpenTofu Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Slack, CI/CD, Notification, DevOps, Automation

Description: Learn how to send Slack notifications from OpenTofu CI/CD pipelines to alert your team about plan changes, apply results, and deployment failures.

## Introduction

Keeping your team informed about infrastructure changes is critical for operational safety. This guide shows how to add Slack notifications at key stages of your OpenTofu pipeline using webhooks and popular CI/CD platforms.

## Setting Up a Slack Webhook

First, create an Incoming Webhook in your Slack workspace:
1. Go to your Slack app settings and add the **Incoming Webhooks** feature.
2. Choose a channel and copy the webhook URL.
3. Store the URL as a CI/CD secret (e.g., `SLACK_WEBHOOK_URL`).

## Notification Script

Create a reusable shell script that sends formatted messages to Slack.

```bash
#!/bin/bash
# scripts/notify-slack.sh

# Usage: bash scripts/notify-slack.sh "message" "color" "title"

MESSAGE="$1"
COLOR="${2:-good}"   # good (green), warning (yellow), danger (red)
TITLE="${3:-OpenTofu Notification}"
WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "SLACK_WEBHOOK_URL is not set, skipping notification"
  exit 0
fi

PAYLOAD=$(cat <<EOF
{
  "attachments": [
    {
      "color": "${COLOR}",
      "mrkdwn_in": ["text"],
      "title": "${TITLE}",
      "text": "${MESSAGE}",
      "footer": "OpenTofu Pipeline",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$WEBHOOK_URL"
```

## GitHub Actions Integration

Wire notifications into each pipeline stage.

```yaml
# .github/workflows/opentofu.yml
name: OpenTofu CI/CD

on:
  push:
    branches: [main]
  pull_request:

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_wrapper: false

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Plan
        id: plan
        run: |
          set +e
          tofu plan -out=tfplan -no-color 2>&1 | tee plan_output.txt
          exit_code=${PIPESTATUS[0]}
          echo "exit_code=$exit_code" >> "$GITHUB_OUTPUT"
          exit "$exit_code"

      - name: Notify Slack – Plan Success
        if: success() && steps.plan.outputs.exit_code == '0'
        run: |
          CHANGES=$(grep -E "^Plan:" plan_output.txt || echo "No changes detected")
          bash scripts/notify-slack.sh "Plan completed on *${{ github.ref_name }}*\n$CHANGES" "good" "OpenTofu Plan"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Upload Plan
        if: github.event_name == 'push' && github.ref == 'refs/heads/main' && steps.plan.outputs.exit_code == '0'
        uses: actions/upload-artifact@v7
        with:
          name: tfplan
          path: tfplan
          retention-days: 1

      - name: Notify Slack – Plan Failed
        if: failure()
        run: |
          bash scripts/notify-slack.sh "Plan FAILED on *${{ github.ref_name }}* by ${{ github.actor }}" "danger" "OpenTofu Plan Failed"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  apply:
    needs: plan
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v6

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_wrapper: false

      - name: OpenTofu Init
        run: tofu init

      - name: Download Plan
        uses: actions/download-artifact@v8
        with:
          name: tfplan
          path: .

      - name: Notify Slack – Apply Started
        run: |
          bash scripts/notify-slack.sh "Apply started on *main* by ${{ github.actor }}" "warning" "OpenTofu Apply"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: OpenTofu Apply
        id: apply
        run: tofu apply -no-color tfplan

      - name: Notify Slack – Apply Success
        if: success()
        run: |
          bash scripts/notify-slack.sh "Apply *succeeded* on main :white_check_mark:" "good" "OpenTofu Apply Complete"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify Slack – Apply Failed
        if: failure()
        run: |
          bash scripts/notify-slack.sh "Apply *FAILED* on main :rotating_light: – manual review required" "danger" "OpenTofu Apply Failed"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Using the Slack Terraform Provider

You can also manage Slack channels as OpenTofu resources.

```hcl
# Requires the pablovarela/slack provider (community)
terraform {
  required_providers {
    slack = {
      source  = "pablovarela/slack"
      version = "~> 1.0"
    }
  }
}

provider "slack" {
  token = var.slack_bot_token
}

resource "slack_conversation" "infra_alerts" {
  name       = "infra-alerts"
  is_private = false
}
```

## Summary

Adding Slack notifications to your OpenTofu pipelines keeps your team informed of plan changes, successful applies, and failures in real time. A reusable notify script combined with CI/CD pipeline steps provides visibility without adding complexity.
