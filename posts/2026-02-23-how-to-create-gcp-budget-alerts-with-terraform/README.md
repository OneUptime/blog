# How to Create GCP Budget Alerts with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Budget Alerts, Cost Management, FinOps

Description: Learn how to create Google Cloud Platform budget alerts using Terraform to monitor project spending and trigger notifications at defined thresholds.

---

Google Cloud billing budgets allow you to monitor spending across projects and billing accounts. Managing these budgets through Terraform ensures they are consistently deployed and version-controlled. This guide covers creating GCP budget alerts for projects, services, and labels with Terraform.

## Prerequisites

Enable the Cloud Billing Budget API:

```hcl
resource "google_project_service" "billing_budget" {
  project = var.project_id
  service = "billingbudgets.googleapis.com"
}
```

## Basic Project Budget

Create a monthly budget for a GCP project:

```hcl
# Get billing account information
data "google_billing_account" "main" {
  display_name = "My Billing Account"
  open         = true
}

# Create a budget for the project
resource "google_billing_budget" "project_budget" {
  billing_account = data.google_billing_account.main.id
  display_name    = "Project Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "5000"
    }
  }

  # Alert at 50%, 80%, and 100%
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # Forecasted alert at 100%
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  # Send alerts to email
  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
    disable_default_iam_recipients = false
  }
}

# Create notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Finance Team Email"
  type         = "email"

  labels = {
    email_address = "finance@company.com"
  }
}
```

## Service-Specific Budget

Create budgets filtered by specific GCP services:

```hcl
# Compute Engine budget
resource "google_billing_budget" "compute" {
  billing_account = data.google_billing_account.main.id
  display_name    = "Compute Engine Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
    services = ["services/6F81-5844-456A"]  # Compute Engine service ID
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
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}

# Cloud SQL budget
resource "google_billing_budget" "cloud_sql" {
  billing_account = data.google_billing_account.main.id
  display_name    = "Cloud SQL Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
    services = ["services/9662-B51E-5089"]  # Cloud SQL service ID
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "1500"
    }
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}
```

## Label-Based Budgets

Filter budgets by resource labels:

```hcl
resource "google_billing_budget" "team_budget" {
  for_each = {
    platform = { limit = 2000 }
    backend  = { limit = 2500 }
    data     = { limit = 3000 }
  }

  billing_account = data.google_billing_account.main.id
  display_name    = "${each.key}-team-budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
    labels = {
      team = each.key
    }
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(each.value.limit)
    }
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}
```

## Budget with Pub/Sub Notifications

Use Pub/Sub for programmatic budget notifications:

```hcl
# Create a Pub/Sub topic for budget alerts
resource "google_pubsub_topic" "budget_alerts" {
  name    = "budget-alerts"
  project = var.project_id
}

# Budget with Pub/Sub notification
resource "google_billing_budget" "with_pubsub" {
  billing_account = data.google_billing_account.main.id
  display_name    = "Budget with Pub/Sub"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "5000"
    }
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    pubsub_topic = google_pubsub_topic.budget_alerts.id
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}

# Cloud Function to process budget alerts
resource "google_cloudfunctions_function" "budget_handler" {
  name        = "budget-alert-handler"
  description = "Processes budget alert notifications"
  runtime     = "python310"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions.name
  source_archive_object = google_storage_bucket_object.function_code.name
  entry_point           = "handle_budget_alert"

  event_trigger {
    event_type = "google.pubsub.topic.publish"
    resource   = google_pubsub_topic.budget_alerts.id
  }
}
```

## Auto-Adjusting Budget Based on Historical Spending

```hcl
resource "google_billing_budget" "auto_adjusting" {
  billing_account = data.google_billing_account.main.id
  display_name    = "Auto-adjusting Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  # Use last month's spending as the budget
  amount {
    last_period_amount {}
  }

  # Alert if spending exceeds 120% of last month
  threshold_rules {
    threshold_percent = 1.2
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}
```

## Multi-Project Budget

Create budgets spanning multiple projects:

```hcl
resource "google_billing_budget" "multi_project" {
  billing_account = data.google_billing_account.main.id
  display_name    = "All Production Projects Budget"

  budget_filter {
    projects = [
      "projects/prod-web",
      "projects/prod-api",
      "projects/prod-data",
    ]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "15000"
    }
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name,
      google_monitoring_notification_channel.slack.name,
    ]
  }
}

# Slack notification channel
resource "google_monitoring_notification_channel" "slack" {
  display_name = "Cost Alerts Slack"
  type         = "slack"

  labels = {
    channel_name = "#cost-alerts"
  }

  sensitive_labels {
    auth_token = var.slack_auth_token
  }
}
```

## Best Practices

Create budgets at both the billing account and project levels. Use label-based filtering to track costs by team or application. Set both actual and forecasted threshold alerts. Use Pub/Sub for programmatic responses to budget alerts. Review budgets quarterly and adjust based on growth. Combine email notifications with Slack or PagerDuty for team visibility. Apply budgets to all projects including development and testing.

## Conclusion

GCP budget alerts managed through Terraform provide consistent, automated cost monitoring across your Google Cloud environment. With support for project filtering, service filtering, label-based budgets, and Pub/Sub integration, you can build a comprehensive cost management system. Terraform ensures these budgets are deployed consistently and can be updated as your infrastructure evolves.

For related guides, see [How to Create AWS Budget Alerts with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-aws-budget-alerts-with-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
