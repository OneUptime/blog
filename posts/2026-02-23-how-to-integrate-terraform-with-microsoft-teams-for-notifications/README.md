# How to Integrate Terraform with Microsoft Teams for Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Microsoft Teams, DevOps, Notifications, Infrastructure as Code, Automation

Description: Learn how to integrate Terraform with Microsoft Teams to send automated notifications about infrastructure changes, deployments, and alerts to your Teams channels.

---

Microsoft Teams is a widely used collaboration platform in enterprise environments. Integrating Terraform with Teams allows your infrastructure team to receive real-time notifications about changes, approvals, and errors without leaving their communication hub. This guide covers multiple methods to set up this integration effectively.

## Why Send Terraform Notifications to Microsoft Teams?

Many organizations standardize on Microsoft Teams as their primary communication tool. When infrastructure changes happen through Terraform, relevant stakeholders need to be informed quickly. Sending notifications to Teams channels ensures that everyone from developers to operations engineers stays in the loop about infrastructure modifications.

Benefits include centralized visibility into infrastructure changes, faster incident response when applies fail, audit trail of who changed what and when, and reduced context switching for teams already using Teams.

## Prerequisites

You will need a Microsoft Teams workspace with permission to create incoming webhooks, Terraform installed (version 1.0 or later), and access to the Teams channel where you want to send notifications.

## Setting Up Microsoft Teams Incoming Webhook

The first step is creating an incoming webhook connector in your Teams channel. Navigate to the channel where you want notifications, click the three dots menu, select "Connectors" or "Workflows," and add an incoming webhook. Name it "Terraform Bot" and copy the webhook URL.

## Method 1: Simple Webhook Notifications

The most straightforward approach uses Terraform's `null_resource` with a `local-exec` provisioner to send messages to the Teams webhook.

```hcl
# variables.tf
# Define variables for Teams integration
variable "teams_webhook_url" {
  description = "Microsoft Teams incoming webhook URL"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "The deployment environment name"
  type        = string
  default     = "production"
}
```

```hcl
# teams-notification.tf
# Send a notification to Microsoft Teams after apply
resource "null_resource" "teams_notification" {
  # Trigger notification on every apply
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -H "Content-Type: application/json" \
        -d '{
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          "themeColor": "0076D7",
          "summary": "Terraform Apply Completed",
          "sections": [{
            "activityTitle": "Terraform Infrastructure Update",
            "activitySubtitle": "Environment: ${var.environment}",
            "facts": [{
              "name": "Workspace",
              "value": "${terraform.workspace}"
            }, {
              "name": "Status",
              "value": "Completed Successfully"
            }, {
              "name": "Timestamp",
              "value": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
            }],
            "markdown": true
          }]
        }' \
        "${var.teams_webhook_url}"
    EOT
  }
}
```

## Method 2: Adaptive Card Notifications

Microsoft Teams supports Adaptive Cards, which provide richer formatting and interactive elements. Here is how to send an Adaptive Card from Terraform.

```hcl
# adaptive-card-notification.tf
# Send a rich Adaptive Card notification to Teams
resource "null_resource" "teams_adaptive_card" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -H "Content-Type: application/json" \
        -d '{
          "type": "message",
          "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "contentUrl": null,
            "content": {
              "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
              "type": "AdaptiveCard",
              "version": "1.4",
              "body": [
                {
                  "type": "TextBlock",
                  "size": "Large",
                  "weight": "Bolder",
                  "text": "Terraform Deployment Update"
                },
                {
                  "type": "FactSet",
                  "facts": [
                    {
                      "title": "Environment",
                      "value": "${var.environment}"
                    },
                    {
                      "title": "Workspace",
                      "value": "${terraform.workspace}"
                    },
                    {
                      "title": "Status",
                      "value": "Applied Successfully"
                    }
                  ]
                }
              ]
            }
          }]
        }' \
        "${var.teams_webhook_url}"
    EOT
  }
}
```

## Method 3: Terraform Cloud with Teams Integration

Terraform Cloud and Terraform Enterprise support Microsoft Teams as a notification destination natively.

```hcl
# tfc-teams-notification.tf
# Configure Terraform Cloud to send notifications to Teams
resource "tfe_notification_configuration" "teams" {
  name             = "teams-infrastructure-notifications"
  enabled          = true
  destination_type = "microsoft-teams"

  # Set the Teams webhook URL
  url = var.teams_webhook_url

  # Define which events trigger notifications
  triggers = [
    "run:created",
    "run:planning",
    "run:needs_attention",
    "run:applying",
    "run:completed",
    "run:errored"
  ]

  # Associate with the target workspace
  workspace_id = tfe_workspace.main.id
}

# Define the workspace
resource "tfe_workspace" "main" {
  name         = "production-infrastructure"
  organization = var.tfe_organization

  # Enable auto-apply for non-destructive changes
  auto_apply = false
}
```

## Method 4: Custom Notification Script

For detailed notifications with plan summaries, create a reusable notification script.

```bash
#!/bin/bash
# notify-teams.sh
# Sends formatted Terraform notifications to Microsoft Teams

WEBHOOK_URL="$1"
ENVIRONMENT="$2"
STATUS="$3"
DETAILS="$4"
INITIATED_BY="$5"

# Set color based on status
case "$STATUS" in
  "success") COLOR="00FF00" ;;
  "failed")  COLOR="FF0000" ;;
  "pending") COLOR="FFAA00" ;;
  *)         COLOR="0076D7" ;;
esac

# Build the message card payload
PAYLOAD=$(cat <<EOF
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "${COLOR}",
  "summary": "Terraform ${STATUS} - ${ENVIRONMENT}",
  "sections": [{
    "activityTitle": "Terraform Infrastructure Update",
    "activitySubtitle": "Initiated by: ${INITIATED_BY}",
    "facts": [
      {"name": "Environment", "value": "${ENVIRONMENT}"},
      {"name": "Status", "value": "${STATUS}"},
      {"name": "Details", "value": "${DETAILS}"},
      {"name": "Time", "value": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")"}
    ],
    "markdown": true
  }],
  "potentialAction": [{
    "@type": "OpenUri",
    "name": "View in Terraform Cloud",
    "targets": [{
      "os": "default",
      "uri": "https://app.terraform.io"
    }]
  }]
}
EOF
)

# Send the notification
curl -s -H "Content-Type: application/json" \
  -d "${PAYLOAD}" \
  "${WEBHOOK_URL}"
```

```hcl
# use-notification-script.tf
# Use the custom notification script in Terraform
resource "null_resource" "detailed_teams_notification" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      bash ${path.module}/scripts/notify-teams.sh \
        "${var.teams_webhook_url}" \
        "${var.environment}" \
        "success" \
        "Infrastructure apply completed with no errors" \
        "${var.initiated_by}"
    EOT
  }
}
```

## Method 5: Using Power Automate for Advanced Workflows

For organizations using the Microsoft ecosystem, Power Automate can create sophisticated notification workflows.

```hcl
# power-automate-trigger.tf
# Trigger a Power Automate flow from Terraform
variable "power_automate_url" {
  description = "Power Automate HTTP trigger URL"
  type        = string
  sensitive   = true
}

resource "null_resource" "power_automate_trigger" {
  triggers = {
    always_run = timestamp()
  }

  # Send data to Power Automate which can then route to Teams
  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -d '{
          "environment": "${var.environment}",
          "workspace": "${terraform.workspace}",
          "status": "completed",
          "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
        }' \
        "${var.power_automate_url}"
    EOT
  }
}
```

Power Automate can then format the message, add approval steps, route to different channels based on the environment, or trigger additional workflows.

## CI/CD Pipeline Integration

Here is an example of integrating Teams notifications into an Azure DevOps pipeline running Terraform.

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Initialize Terraform
  - task: TerraformCLI@0
    displayName: 'Terraform Init'
    inputs:
      command: 'init'

  # Run Terraform Plan
  - task: TerraformCLI@0
    displayName: 'Terraform Plan'
    inputs:
      command: 'plan'
      commandOptions: '-out=tfplan'

  # Run Terraform Apply
  - task: TerraformCLI@0
    displayName: 'Terraform Apply'
    inputs:
      command: 'apply'
      commandOptions: 'tfplan'

  # Send Teams notification on success
  - task: IncomingWebhook@1
    displayName: 'Notify Teams - Success'
    condition: succeeded()
    inputs:
      url: $(TEAMS_WEBHOOK_URL)
      body: |
        {
          "@type": "MessageCard",
          "summary": "Terraform Apply Succeeded",
          "themeColor": "00FF00",
          "sections": [{
            "activityTitle": "Terraform Apply Succeeded",
            "facts": [
              {"name": "Pipeline", "value": "$(Build.DefinitionName)"},
              {"name": "Branch", "value": "$(Build.SourceBranchName)"}
            ]
          }]
        }

  # Send Teams notification on failure
  - task: IncomingWebhook@1
    displayName: 'Notify Teams - Failure'
    condition: failed()
    inputs:
      url: $(TEAMS_WEBHOOK_URL)
      body: |
        {
          "@type": "MessageCard",
          "summary": "Terraform Apply Failed",
          "themeColor": "FF0000",
          "sections": [{
            "activityTitle": "Terraform Apply FAILED",
            "facts": [
              {"name": "Pipeline", "value": "$(Build.DefinitionName)"},
              {"name": "Branch", "value": "$(Build.SourceBranchName)"}
            ]
          }]
        }
```

## Best Practices

Store webhook URLs securely using Terraform variables marked as sensitive or your CI/CD platform's secret management. Create separate channels for different environments to reduce noise. Include actionable information in notifications such as links to the Terraform Cloud run or the CI/CD pipeline. Test your webhook configuration with a simple curl command before embedding it in Terraform. Consider implementing rate limiting to prevent notification fatigue during large infrastructure changes.

## Monitoring Your Notification Pipeline

It is important to monitor your notification pipeline to ensure messages are being delivered. If your Teams webhook stops working, your team could miss critical infrastructure change alerts. Consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-integrate-terraform-with-microsoft-teams-for-notifications/view) to monitor the health of your webhook endpoints.

## Conclusion

Integrating Terraform with Microsoft Teams keeps your enterprise teams informed about infrastructure changes in their primary communication tool. Whether you use simple webhooks, Adaptive Cards, Terraform Cloud native integration, or Power Automate workflows, the goal is to provide timely and actionable notifications. Start with the approach that fits your current setup and evolve as your needs grow.
