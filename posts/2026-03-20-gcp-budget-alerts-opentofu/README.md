# How to Create GCP Budget Alerts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Billing, Budget Alerts, Infrastructure as Code

Description: Learn how to create GCP billing budgets and alerts with OpenTofu to monitor and control Google Cloud spending across projects and services.

GCP Billing Budgets alert your team when spending exceeds thresholds and can publish Pub/Sub notifications that you can use to automate actions like disabling billing when critical limits are reached. Managing budgets in OpenTofu ensures all projects have cost guardrails from day one.

## Provider Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project               = var.project_id
  billing_project       = var.project_id
  user_project_override = true
}

data "google_project" "current" {
  project_id = var.project_id
}
```

## Project Budget

```hcl
resource "google_billing_budget" "project_budget" {
  billing_account = var.billing_account_id
  display_name    = "Production Project Budget"

  # Filter to a specific project
  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10000"  # $10,000/month
    }
  }

  # Alert at 50%
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert at 90%
  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert at 100%
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert when forecasted to exceed 110%
  threshold_rules {
    threshold_percent = 1.1
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    pubsub_topic   = google_pubsub_topic.budget_alerts.id
    schema_version = "1.0"

    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name,
    ]

    # Keep default Billing Account Admin/User email recipients enabled
    disable_default_iam_recipients = false
  }
}
```

## Email Notification Channel

```hcl
resource "google_monitoring_notification_channel" "email" {
  display_name = "Engineering FinOps Email"
  type         = "email"

  labels = {
    email_address = "finops@example.com"
  }
}
```

## Pub/Sub Budget Alert Handler

```hcl
resource "google_pubsub_topic" "budget_alerts" {
  name = "billing-budget-alerts"
}

resource "google_pubsub_subscription" "budget_handler" {
  name  = "budget-alert-handler"
  topic = google_pubsub_topic.budget_alerts.id

  push_config {
    push_endpoint = var.budget_handler_url
  }
}
```

## Service-Specific Budget

```hcl
resource "google_billing_budget" "bigquery_budget" {
  billing_account = var.billing_account_id
  display_name    = "BigQuery Monthly Budget"

  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
    services = ["services/24E6-581D-38E5"]  # BigQuery service ID
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "2000"
    }
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [google_monitoring_notification_channel.email.name]
    pubsub_topic                     = google_pubsub_topic.budget_alerts.id
    schema_version                   = "1.0"
  }
}
```

## Multiple Project Budgets

```hcl
locals {
  project_budgets = {
    "production"  = { project_id = var.prod_project_id, amount = 50000 }
    "staging"     = { project_id = var.staging_project_id, amount = 5000 }
    "development" = { project_id = var.dev_project_id, amount = 2000 }
  }
}

data "google_project" "budget_projects" {
  for_each   = local.project_budgets
  project_id = each.value.project_id
}

resource "google_billing_budget" "projects" {
  for_each = local.project_budgets

  billing_account = var.billing_account_id
  display_name    = "${each.key} project budget"

  budget_filter {
    projects = ["projects/${data.google_project.budget_projects[each.key].number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(each.value.amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.9
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [google_monitoring_notification_channel.email.name]
  }
}
```

## Conclusion

GCP Billing Budgets in OpenTofu provide automated spending visibility across all your projects. Route budget alerts to email notification channels and Pub/Sub topics for programmatic handling (for example, sending Slack messages or disabling billing with a separate handler). Set forecasted alerts to catch trends before the budget is breached, and use service-specific budgets to identify which GCP services are driving unexpected costs.
