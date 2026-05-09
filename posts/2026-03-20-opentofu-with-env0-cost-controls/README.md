# How to Use OpenTofu with env0 Cost Controls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, env0, Cost Management, FinOps, Cloud Cost Controls

Description: Learn how to configure env0's cost estimation and control features with OpenTofu to enforce budget limits, require approvals for expensive deployments, and track infrastructure costs.

## Introduction

env0 integrates with OpenTofu to provide cost estimation at plan time via Infracost. You can set project-level budgets that fire notifications when exceeded, require manual approval for deployments, and track actual costs through env0's cost API.

## Configuring Cost Estimation in env0

Cost estimation is enabled per project through a project policy and budgets are tracked via the `env0_project_budget` resource. Both can be managed with the env0 Terraform provider:

```hcl
provider "env0" {
  api_key    = var.env0_api_key
  api_secret = var.env0_api_secret
}

resource "env0_project" "production" {
  name        = "Production Infrastructure"
  description = "Production OpenTofu configurations"
}

resource "env0_project_policy" "production" {
  project_id              = env0_project.production.id
  include_cost_estimation = true
}

resource "env0_project_budget" "production" {
  project_id = env0_project.production.id
  amount     = 5000 # USD
  timeframe  = "MONTHLY"

  # Notification thresholds as percentages of the budget
  thresholds = [50, 80, 100]
}
```

Note: cost estimation in env0 requires an Infracost API key, configured at the organization level via the `INFRACOST_API_KEY` variable.

## Cost Credentials via env0 Terraform Provider

To pull actual cloud spend into env0, configure cloud-specific cost credentials. There is no unified `env0_cost_credentials` resource - env0 ships a separate resource per cloud:

```hcl
resource "env0_aws_cost_credentials" "aws" {
  name = "AWS Cost Credentials"
  arn  = aws_iam_role.env0_cost.arn
}
```

For GCP use `env0_gcp_cost_credentials` (BigQuery billing export `secret` and `table_id`); for Azure use `env0_azure_cost_credentials` (`client_id`, `client_secret`, `subscription_id`, `tenant_id`).

## Environment TTL for Cost Savings

env0 supports automatic environment destruction to save costs in non-production environments. Project-level TTL defaults and limits are set on `env0_project_policy`, and individual environments take an absolute ISO timestamp via the `ttl` argument:

```hcl
# Project-wide TTL policy: default 12h, max 1 week
resource "env0_project_policy" "non_prod" {
  project_id  = env0_project.non_prod.id
  default_ttl = "12-h"
  max_ttl     = "1-w"
}

# Feature-branch environment auto-destroyed at a specific time
resource "env0_environment" "feature_branch" {
  name        = "feature-branch"
  project_id  = env0_project.non_prod.id
  template_id = env0_template.app.id
  ttl         = timeadd(timestamp(), "8h") # ISO timestamp 8 hours from now
}

# Production environment: omit ttl for infinite TTL
resource "env0_environment" "production" {
  name        = "production"
  project_id  = env0_project.production.id
  template_id = env0_template.app.id
}
```

For recurring deploy/destroy schedules (for example, destroying staging every weekday evening), use `env0_environment_scheduling` with cron expressions.

## Cost Notification Configuration

Notifications in env0 are managed as endpoints (Slack, Teams, Email, Webhook) that are then assigned to projects with the events that should trigger them. The `budgetExceeded` event fires when a project budget threshold is hit:

```hcl
resource "env0_notification" "slack_costs" {
  name  = "infrastructure-costs"
  type  = "Slack"
  value = var.slack_webhook_url
}

resource "env0_notification_project_assignment" "costs" {
  project_id               = env0_project.production.id
  notification_endpoint_id = env0_notification.slack_costs.id
  event_names              = ["budgetExceeded"]
}
```

## Tagging for Cost Attribution

Ensure resources have cost tags that map to env0 environments:

```hcl
# Add env0 environment context to tags
locals {
  env0_tags = {
    "env0:environment"  = var.env0_environment_name
    "env0:project"      = var.env0_project_name
    "env0:workspace"    = terraform.workspace
  }
}

resource "aws_instance" "app" {
  # ...
  tags = merge(local.env0_tags, var.application_tags)
}
```

## Cost Report Module

```hcl
# Use env0 API to get cost reports programmatically.
# env0 uses HTTP Basic auth with API key id and secret.
data "http" "cost_report" {
  url    = "https://api.env0.com/costs/environments/${var.env0_environment_id}"
  method = "GET"

  request_headers = {
    Authorization = "Basic ${base64encode("${var.env0_api_key}:${var.env0_api_secret}")}"
  }
}

# Response is an array of daily cost records: [{date, total: {AWS, GCP, AZURE}, id, isStale}, ...]
locals {
  cost_records = jsondecode(data.http.cost_report.response_body)
  latest_total = local.cost_records[length(local.cost_records) - 1].total
}

output "latest_aws_cost" {
  value = lookup(local.latest_total, "AWS", 0)
}
```

## Conclusion

env0 cost controls integrate seamlessly with OpenTofu by analyzing plan output before apply. The combination of automatic cost estimation, configurable approval thresholds, and environment TTLs creates a complete FinOps workflow for infrastructure teams. Start with monitoring-only mode to establish cost baselines before enabling approval gates.
