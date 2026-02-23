# How to Set Up Terraform CI/CD Notifications (Slack Teams)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Slack, Microsoft Teams, Notifications, DevOps

Description: Configure Terraform CI/CD pipeline notifications for Slack and Microsoft Teams including plan summaries, apply results, drift alerts, and failure notifications.

---

When Terraform applies run in a CI/CD pipeline, the team needs visibility into what changed and whether it succeeded. Pushing notifications to Slack or Microsoft Teams keeps everyone informed without requiring them to watch pipeline logs. The trick is sending useful, actionable messages rather than noisy alerts that get ignored.

This guide covers setting up notifications for Terraform CI/CD events in both Slack and Microsoft Teams.

## Slack Notifications

### Basic Slack Webhook Setup

First, create a Slack app and incoming webhook:

1. Go to api.slack.com/apps and create an app
2. Enable Incoming Webhooks
3. Add a webhook to your target channel
4. Store the webhook URL as a CI/CD secret

### Plan Notifications on PR

```yaml
# .github/workflows/terraform-notify.yml
name: Terraform with Notifications
on:
  pull_request:
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        id: plan
        working-directory: infrastructure
        run: |
          terraform init
          terraform plan -out=tfplan -detailed-exitcode -no-color 2>&1 | tee plan.txt
          EXIT_CODE=${PIPESTATUS[0]}

          # Extract summary line
          SUMMARY=$(grep -E "^Plan:|^No changes" plan.txt | tail -1)
          echo "summary=$SUMMARY" >> "$GITHUB_OUTPUT"

          if [ $EXIT_CODE -eq 2 ]; then
            echo "has_changes=true" >> "$GITHUB_OUTPUT"
          else
            echo "has_changes=false" >> "$GITHUB_OUTPUT"
          fi

      # Send Slack notification with plan summary
      - name: Notify Slack - Plan
        if: steps.plan.outputs.has_changes == 'true'
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"blocks\": [
                {
                  \"type\": \"header\",
                  \"text\": {
                    \"type\": \"plain_text\",
                    \"text\": \"Terraform Plan - Changes Detected\"
                  }
                },
                {
                  \"type\": \"section\",
                  \"fields\": [
                    {
                      \"type\": \"mrkdwn\",
                      \"text\": \"*PR:* <${{ github.event.pull_request.html_url }}|#${{ github.event.pull_request.number }}> ${{ github.event.pull_request.title }}\"
                    },
                    {
                      \"type\": \"mrkdwn\",
                      \"text\": \"*Author:* ${{ github.actor }}\"
                    }
                  ]
                },
                {
                  \"type\": \"section\",
                  \"text\": {
                    \"type\": \"mrkdwn\",
                    \"text\": \"\`\`\`${{ steps.plan.outputs.summary }}\`\`\`\"
                  }
                },
                {
                  \"type\": \"actions\",
                  \"elements\": [
                    {
                      \"type\": \"button\",
                      \"text\": {
                        \"type\": \"plain_text\",
                        \"text\": \"View PR\"
                      },
                      \"url\": \"${{ github.event.pull_request.html_url }}\"
                    },
                    {
                      \"type\": \"button\",
                      \"text\": {
                        \"type\": \"plain_text\",
                        \"text\": \"View Pipeline\"
                      },
                      \"url\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
                    }
                  ]
                }
              ]
            }"
```

### Apply Notifications

```yaml
  apply:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        id: apply
        working-directory: infrastructure
        run: |
          terraform init
          terraform apply -auto-approve -no-color 2>&1 | tee apply.txt
          SUMMARY=$(grep -E "^Apply complete!" apply.txt | tail -1)
          echo "summary=$SUMMARY" >> "$GITHUB_OUTPUT"

      # Success notification
      - name: Notify Slack - Apply Success
        if: success()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"blocks\": [
                {
                  \"type\": \"header\",
                  \"text\": {
                    \"type\": \"plain_text\",
                    \"text\": \"Terraform Apply Successful\"
                  }
                },
                {
                  \"type\": \"section\",
                  \"fields\": [
                    {
                      \"type\": \"mrkdwn\",
                      \"text\": \"*Environment:* production\"
                    },
                    {
                      \"type\": \"mrkdwn\",
                      \"text\": \"*Applied by:* ${{ github.actor }}\"
                    },
                    {
                      \"type\": \"mrkdwn\",
                      \"text\": \"*Commit:* <${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}|\`$(echo ${{ github.sha }} | cut -c1-7)\`>\"
                    },
                    {
                      \"type\": \"mrkdwn\",
                      \"text\": \"*Result:* ${{ steps.apply.outputs.summary }}\"
                    }
                  ]
                }
              ]
            }"

      # Failure notification
      - name: Notify Slack - Apply Failed
        if: failure()
        run: |
          # Get the last 20 lines of apply output for context
          ERROR_CONTEXT=$(tail -20 infrastructure/apply.txt | head -15)

          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"blocks\": [
                {
                  \"type\": \"header\",
                  \"text\": {
                    \"type\": \"plain_text\",
                    \"text\": \"Terraform Apply FAILED\"
                  }
                },
                {
                  \"type\": \"section\",
                  \"text\": {
                    \"type\": \"mrkdwn\",
                    \"text\": \"*Environment:* production\\n*Applied by:* ${{ github.actor }}\\n\\n\`\`\`$(echo \"$ERROR_CONTEXT\" | head -10)\`\`\`\"
                  }
                },
                {
                  \"type\": \"actions\",
                  \"elements\": [
                    {
                      \"type\": \"button\",
                      \"text\": {
                        \"type\": \"plain_text\",
                        \"text\": \"View Logs\"
                      },
                      \"url\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\",
                      \"style\": \"danger\"
                    }
                  ]
                }
              ]
            }"
```

## Microsoft Teams Notifications

Teams uses Adaptive Cards through incoming webhooks:

```yaml
# Teams notification for apply results
- name: Notify Teams - Apply Result
  if: always()
  run: |
    STATUS="${{ job.status }}"
    COLOR="good"
    TITLE="Terraform Apply Successful"

    if [ "$STATUS" != "success" ]; then
      COLOR="attention"
      TITLE="Terraform Apply FAILED"
    fi

    curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
      -H "Content-Type: application/json" \
      -d "{
        \"@type\": \"MessageCard\",
        \"@context\": \"http://schema.org/extensions\",
        \"themeColor\": \"$([ '$STATUS' = 'success' ] && echo '00FF00' || echo 'FF0000')\",
        \"summary\": \"$TITLE\",
        \"sections\": [{
          \"activityTitle\": \"$TITLE\",
          \"facts\": [
            {
              \"name\": \"Environment\",
              \"value\": \"production\"
            },
            {
              \"name\": \"Applied by\",
              \"value\": \"${{ github.actor }}\"
            },
            {
              \"name\": \"Commit\",
              \"value\": \"$(echo ${{ github.sha }} | cut -c1-7)\"
            },
            {
              \"name\": \"Status\",
              \"value\": \"$STATUS\"
            }
          ],
          \"markdown\": true
        }],
        \"potentialAction\": [
          {
            \"@type\": \"OpenUri\",
            \"name\": \"View Pipeline\",
            \"targets\": [{
              \"os\": \"default\",
              \"uri\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
            }]
          }
        ]
      }"
```

## Drift Detection Notifications

Send alerts when scheduled drift detection finds changes:

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection
on:
  schedule:
    - cron: '0 9 * * 1-5'  # Weekdays at 9am

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Check for Drift
        id: drift
        working-directory: infrastructure
        run: |
          terraform init
          terraform plan -detailed-exitcode -no-color 2>&1 | tee drift.txt
          EXIT_CODE=${PIPESTATUS[0]}

          if [ $EXIT_CODE -eq 2 ]; then
            echo "drift_detected=true" >> "$GITHUB_OUTPUT"
            SUMMARY=$(grep -E "^Plan:" drift.txt)
            echo "summary=$SUMMARY" >> "$GITHUB_OUTPUT"
          else
            echo "drift_detected=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Notify Drift to Slack
        if: steps.drift.outputs.drift_detected == 'true'
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"blocks\": [
                {
                  \"type\": \"header\",
                  \"text\": {
                    \"type\": \"plain_text\",
                    \"text\": \"Infrastructure Drift Detected\"
                  }
                },
                {
                  \"type\": \"section\",
                  \"text\": {
                    \"type\": \"mrkdwn\",
                    \"text\": \"Terraform detected configuration drift in production.\\n\\n${{ steps.drift.outputs.summary }}\\n\\nPlease investigate and either update the Terraform config or reconcile the manual changes.\"
                  }
                }
              ]
            }"
```

## Reducing Notification Noise

The most common complaint about CI/CD notifications is too much noise. Be selective:

```yaml
# Only notify on meaningful events
- name: Decide Whether to Notify
  id: should_notify
  run: |
    # Don't notify for no-change plans
    if [ "${{ steps.plan.outputs.has_changes }}" != "true" ]; then
      echo "notify=false" >> "$GITHUB_OUTPUT"
      exit 0
    fi

    # Don't notify for formatting-only changes
    ONLY_FORMAT=$(git diff --name-only HEAD~1 | grep -v '\.tf$' | wc -l)
    if [ "$ONLY_FORMAT" -eq 0 ]; then
      echo "notify=false" >> "$GITHUB_OUTPUT"
      exit 0
    fi

    echo "notify=true" >> "$GITHUB_OUTPUT"

- name: Send Notification
  if: steps.should_notify.outputs.notify == 'true'
  run: |
    # Send the notification
    curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" ...
```

## Summary

Effective Terraform CI/CD notifications should:

1. Send plan summaries on PRs with links to the PR and pipeline
2. Notify on apply success with a summary of what changed
3. Alert immediately on apply failures with error context
4. Report drift detection findings on a schedule
5. Include actionable links (pipeline logs, PRs, commits)
6. Avoid noise by filtering out no-change plans and trivial updates

Start with failure notifications (the most critical) and apply summaries, then add plan notifications and drift alerts as your workflow matures. For the complete pipeline setup, check out [Terraform CI/CD pipeline monitoring](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pipeline-monitoring/view).
