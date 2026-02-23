# How to Integrate Terraform with Slack for Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Slack, DevOps, Notifications, Infrastructure as Code, Automation

Description: Learn how to integrate Terraform with Slack to send real-time notifications about infrastructure changes, plan outputs, and deployment status to your team channels.

---

Managing infrastructure with Terraform is powerful, but keeping your team informed about changes can be challenging. Integrating Terraform with Slack allows you to send real-time notifications about infrastructure plans, applies, and errors directly to your team channels. This guide walks you through multiple approaches to achieve this integration.

## Why Integrate Terraform with Slack?

Infrastructure changes can have significant impacts on your applications and services. When a team member runs `terraform apply`, others need to know what changed. Slack integration provides visibility into infrastructure modifications, helps with audit trails, and enables faster incident response when something goes wrong.

Common use cases include notifying teams about planned changes before they happen, alerting on successful or failed applies, sharing cost estimates for proposed changes, and triggering approval workflows for sensitive environments.

## Prerequisites

Before starting, you will need a Slack workspace with admin access, a Slack incoming webhook URL or a Slack app with appropriate permissions, Terraform installed (version 1.0 or later), and basic familiarity with Terraform configuration.

## Method 1: Using Slack Incoming Webhooks with Terraform Null Resource

The simplest approach uses Slack incoming webhooks combined with Terraform's `null_resource` and `local-exec` provisioner.

First, create an incoming webhook in Slack by going to your Slack workspace settings, selecting Apps, and searching for "Incoming Webhooks." Add the webhook to your desired channel and copy the webhook URL.

```hcl
# variables.tf
# Define the Slack webhook URL as a variable
variable "slack_webhook_url" {
  description = "Slack incoming webhook URL for notifications"
  type        = string
  sensitive   = true
}

# Define the Slack channel for notifications
variable "slack_channel" {
  description = "Slack channel to send notifications to"
  type        = string
  default     = "#infrastructure"
}
```

```hcl
# notifications.tf
# Send a Slack notification after infrastructure changes
resource "null_resource" "slack_notification" {
  # Trigger on every apply by using a timestamp
  triggers = {
    always_run = timestamp()
  }

  # Use local-exec to send a curl request to the Slack webhook
  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST -H 'Content-type: application/json' \
        --data '{"channel": "${var.slack_channel}", "username": "Terraform Bot", "text": "Infrastructure update completed successfully in workspace: ${terraform.workspace}", "icon_emoji": ":terraform:"}' \
        ${var.slack_webhook_url}
    EOT
  }
}
```

## Method 2: Using the Slack Terraform Provider

For more sophisticated integrations, you can use a dedicated Slack provider. While there is no official HashiCorp Slack provider, community providers exist that let you manage Slack resources directly.

```hcl
# main.tf
# Configure the Slack provider
terraform {
  required_providers {
    slack = {
      source  = "pablovarela/slack"
      version = "~> 1.0"
    }
  }
}

# Initialize the Slack provider with your API token
provider "slack" {
  token = var.slack_api_token
}

# Create a dedicated channel for infrastructure notifications
resource "slack_conversation" "infra_notifications" {
  name       = "infra-notifications"
  topic      = "Automated infrastructure change notifications"
  purpose    = "Receive Terraform deployment notifications"
  is_private = false
}
```

## Method 3: Using Terraform Cloud Notifications

If you use Terraform Cloud or Terraform Enterprise, built-in notification support makes Slack integration straightforward.

```hcl
# terraform-cloud.tf
# Configure Terraform Cloud workspace with Slack notifications
resource "tfe_notification_configuration" "slack" {
  name             = "slack-infra-notifications"
  enabled          = true
  destination_type = "slack"

  # Set the Slack webhook URL
  url = var.slack_webhook_url

  # Specify which events trigger notifications
  triggers = [
    "run:created",
    "run:planning",
    "run:needs_attention",
    "run:applying",
    "run:completed",
    "run:errored"
  ]

  # Associate with a workspace
  workspace_id = tfe_workspace.production.id
}

# Define the workspace
resource "tfe_workspace" "production" {
  name         = "production"
  organization = var.tfe_organization
}
```

## Method 4: Custom Notification Script with Detailed Output

For teams that want richer notifications including plan details, you can create a wrapper script.

```bash
#!/bin/bash
# notify-slack.sh
# Script to send detailed Terraform notifications to Slack

WEBHOOK_URL="$1"
CHANNEL="$2"
WORKSPACE="$3"
STATUS="$4"
PLAN_OUTPUT="$5"

# Determine the color based on the status
if [ "$STATUS" = "success" ]; then
  COLOR="#36a64f"  # Green for success
elif [ "$STATUS" = "error" ]; then
  COLOR="#ff0000"  # Red for errors
else
  COLOR="#ffaa00"  # Orange for warnings or in-progress
fi

# Build the Slack message payload with attachments
PAYLOAD=$(cat <<EOF
{
  "channel": "${CHANNEL}",
  "username": "Terraform Bot",
  "attachments": [
    {
      "color": "${COLOR}",
      "title": "Terraform ${STATUS} - ${WORKSPACE}",
      "fields": [
        {
          "title": "Workspace",
          "value": "${WORKSPACE}",
          "short": true
        },
        {
          "title": "Status",
          "value": "${STATUS}",
          "short": true
        },
        {
          "title": "Plan Summary",
          "value": "${PLAN_OUTPUT}",
          "short": false
        }
      ],
      "footer": "Terraform Automation",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

# Send the notification to Slack
curl -s -X POST -H 'Content-type: application/json' \
  --data "${PAYLOAD}" \
  "${WEBHOOK_URL}"
```

Then reference this script in your Terraform configuration:

```hcl
# notification-detailed.tf
# Send detailed notification with plan summary
resource "null_resource" "detailed_slack_notification" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Capture the plan output and send it to Slack
      bash ${path.module}/scripts/notify-slack.sh \
        "${var.slack_webhook_url}" \
        "${var.slack_channel}" \
        "${terraform.workspace}" \
        "success" \
        "Infrastructure apply completed"
    EOT
  }

  # Ensure this runs after all other resources
  depends_on = [
    # Add your main resources here
  ]
}
```

## Method 5: Using CI/CD Pipeline Integration

Many teams run Terraform through CI/CD pipelines. Here is an example using GitHub Actions with Slack notifications.

```yaml
# .github/workflows/terraform.yml
name: Terraform Apply with Slack Notifications

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      # Notify Slack that a run has started
      - name: Notify Slack - Start
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "Terraform apply started for ${{ github.repository }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      # Checkout and run Terraform
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        id: apply
        run: terraform apply -auto-approve

      # Notify Slack on success
      - name: Notify Slack - Success
        if: success()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "Terraform apply succeeded for ${{ github.repository }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      # Notify Slack on failure
      - name: Notify Slack - Failure
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "Terraform apply FAILED for ${{ github.repository }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Best Practices

When integrating Terraform with Slack, keep these best practices in mind. Always store webhook URLs as sensitive variables and never commit them to version control. Use separate channels for different environments so production notifications do not get lost among development noise. Include relevant context in your messages such as the workspace name, the person who triggered the run, and a summary of changes. Rate limit your notifications to avoid flooding channels during large-scale changes. Consider using Slack threads for detailed plan output while keeping the main channel clean with summaries.

## Monitoring Your Integration

Once your integration is in place, you should monitor it to make sure notifications are being delivered reliably. Tools like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-integrate-terraform-with-slack-for-notifications/view) can help you monitor the health of your notification pipeline and alert you if messages stop flowing.

## Conclusion

Integrating Terraform with Slack brings transparency to your infrastructure management process. Whether you choose simple webhooks, Terraform Cloud notifications, or CI/CD pipeline integrations, the key is to provide your team with timely and relevant information about infrastructure changes. Start with a basic webhook integration and iterate based on your team's needs. As your infrastructure grows, consider moving to more sophisticated approaches that include plan details, approval workflows, and cost estimates in your notifications.
