# How to Manage Slack Channels with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Slack, Channel, Collaboration, ChatOps

Description: Learn how to manage Slack channels, channel memberships, and workspace configuration using OpenTofu for reproducible collaboration infrastructure.

## Introduction

The Slack provider for OpenTofu manages channels, channel memberships, and usergroup configurations. Managing Slack channels as code is particularly useful when spinning up new environments that require a standard set of alert and operations channels, or when onboarding new projects that need a consistent channel structure.

## Provider Configuration

```hcl
terraform {
  required_providers {
    slack = {
      source  = "pablovarela/slack"
      version = "~> 1.0"
    }
  }
}

provider "slack" {
  # Bot OAuth token with scopes for conversations, users, and usergroups,
  # such as channels:manage, groups:write, channels:read, groups:read,
  # users:read, users:read.email, usergroups:read, and usergroups:write.
  token = var.slack_bot_token
}
```

## Creating Channels

```hcl
# Standard project channels

locals {
  project_name = var.project_name  # e.g., "payment-service"

  channels = {
    alerts       = { description = "${local.project_name} - Production alerts and incidents" }
    deployments  = { description = "${local.project_name} - Deployment notifications" }
    development  = { description = "${local.project_name} - Development discussion" }
  }
}

resource "slack_conversation" "project_channels" {
  for_each    = local.channels
  name        = "${var.project_name}-${each.key}"
  topic       = each.value.description
  is_private  = false
  action_on_destroy = "archive"
}
```

## Environment-Specific Alert Channels

```hcl
resource "slack_conversation" "prod_alerts" {
  name              = "alerts-${var.project_name}-prod"
  topic             = "Production alerts for ${var.project_name} - CRITICAL: on-call required"
  purpose           = "Automated alerts from production monitoring"
  is_private        = false
  action_on_destroy = "archive"
}

resource "slack_conversation" "staging_alerts" {
  name              = "alerts-${var.project_name}-staging"
  topic             = "Staging alerts for ${var.project_name}"
  is_private        = false
  action_on_destroy = "archive"
}
```

## Setting Channel Topic and Purpose

```hcl
# Channel for infrastructure operations
resource "slack_conversation" "infra_ops" {
  name    = "infra-operations"
  topic   = "Infrastructure operations - use /incident to declare incidents"
  purpose = "Coordination channel for infrastructure changes and incidents"

  is_private        = false
  action_on_destroy = "archive"
}
```

## User Group Management

```hcl
data "slack_user" "engineers" {
  for_each = toset(var.engineer_emails)
  email    = each.value
}

resource "slack_usergroup" "platform_team" {
  name        = "platform-team"
  handle      = "platform-team"
  description = "Platform engineering team"

  users = [for user in data.slack_user.engineers : user.id]
}
```

## Connecting Channels to Monitoring

```hcl
# Create alert channel and configure New Relic to send alerts there
resource "slack_conversation" "alerts" {
  name              = "${var.service_name}-alerts"
  is_private        = false
  action_on_destroy = "archive"
}

# Store channel ID for use by monitoring tools
resource "aws_ssm_parameter" "slack_alert_channel" {
  name  = "/${var.environment}/${var.service_name}/slack-alert-channel"
  type  = "String"
  value = slack_conversation.alerts.id
}

# Slack destinations must already exist in New Relic after OAuth setup in the UI.
data "newrelic_notification_destination" "slack" {
  exact_name = var.newrelic_slack_destination_name
}

resource "newrelic_notification_channel" "slack_alerts" {
  name           = "${var.service_name}-slack-alerts"
  type           = "SLACK"
  destination_id = data.newrelic_notification_destination.slack.id
  product        = "IINT"

  property {
    key   = "channelId"
    value = slack_conversation.alerts.id
  }
}
```

## Module for Standard Project Channels

```hcl
# modules/project-slack/main.tf
variable "project_name" { type = string }
variable "team_emails"  { type = list(string) }

resource "slack_conversation" "alerts" {
  name              = "${var.project_name}-alerts"
  is_private        = false
  action_on_destroy = "archive"
}

resource "slack_conversation" "deployments" {
  name              = "${var.project_name}-deploys"
  is_private        = false
  action_on_destroy = "archive"
}

output "alert_channel_id"      { value = slack_conversation.alerts.id }
output "deployment_channel_id" { value = slack_conversation.deployments.id }
```

## Conclusion

Managing Slack channels with OpenTofu is most valuable when combined with monitoring tool configuration in the same apply - creating alert channels and wiring downstream tooling to those channel IDs in a single operation. With New Relic, the Slack destination itself must be authenticated in the UI first, then OpenTofu can attach a notification channel to the Slack channel ID you created. Use the module pattern to create a standard set of channels for every new project, ensuring consistent naming conventions and descriptions across your workspace.
