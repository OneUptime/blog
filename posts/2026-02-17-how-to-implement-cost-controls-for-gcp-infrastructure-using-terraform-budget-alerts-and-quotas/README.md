# How to Implement Cost Controls for GCP Infrastructure Using Terraform Budget Alerts and Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cost Management, Budget Alerts, Google Cloud Platform

Description: Implement cost controls for GCP infrastructure using Terraform to create budget alerts, set resource quotas, and automate spending enforcement to prevent unexpected cloud bills.

---

Everyone has a GCP cost horror story. An engineer leaves a bunch of GPU instances running over the weekend. A misconfigured autoscaler spins up hundreds of VMs. A BigQuery query scans petabytes instead of partitioned data. The bill comes and it is ten times what you expected.

Budget alerts and quotas are your defense against these scenarios. Budget alerts notify you when spending approaches thresholds. Quotas put hard limits on resource creation. Together, they give you visibility and control over your GCP spending - and with Terraform, you can manage it all as code.

## Setting Up Budget Alerts

GCP billing budgets monitor actual or forecasted spending and send notifications when thresholds are reached. Here is how to create them with Terraform.

First, you need to enable the billing API and know your billing account ID:

```hcl
# variables.tf - Budget-related variables
variable "billing_account_id" {
  description = "GCP billing account ID (format: XXXXXX-XXXXXX-XXXXXX)"
  type        = string
}

variable "project_id" {
  description = "GCP project ID to monitor"
  type        = string
}

variable "monthly_budget_amount" {
  description = "Monthly budget amount in USD"
  type        = number
}

variable "alert_emails" {
  description = "Email addresses to notify for budget alerts"
  type        = list(string)
}
```

Now create a budget with multiple threshold alerts:

```hcl
# budget.tf - Billing budget with threshold alerts

# Data source to get the project number
data "google_project" "current" {
  project_id = var.project_id
}

# Budget for the entire project
resource "google_billing_budget" "project_budget" {
  billing_account = var.billing_account_id
  display_name    = "${var.project_id} Monthly Budget"

  # Scope the budget to a specific project
  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]

    # Optionally filter by specific services
    # services = ["services/24E6-581D-38E5"]  # Compute Engine service ID
  }

  # Set the budget amount
  amount {
    specified_amount {
      currency_code = "USD"
      units         = var.monthly_budget_amount
    }
  }

  # Alert thresholds - get notified at 50%, 80%, 100%, and 120%
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

  # Forecasted spend alert - warns you before you actually hit the limit
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.2
    spend_basis       = "CURRENT_SPEND"
  }

  # Send alerts to email and Pub/Sub
  all_updates_rule {
    monitoring_notification_channels = [
      for channel in google_monitoring_notification_channel.email : channel.id
    ]

    # Also publish to Pub/Sub for automated responses
    pubsub_topic = google_pubsub_topic.budget_alerts.id

    # Include credits in cost calculation
    disable_default_iam_recipients = false
  }
}

# Create notification channels for each email
resource "google_monitoring_notification_channel" "email" {
  for_each     = toset(var.alert_emails)
  project      = var.project_id
  display_name = "Budget Alert - ${each.value}"
  type         = "email"

  labels = {
    email_address = each.value
  }
}
```

## Service-Specific Budgets

Create separate budgets for expensive services to get more targeted alerts:

```hcl
# service-budgets.tf - Per-service budgets for expensive GCP services

variable "service_budgets" {
  description = "Map of service names to their budget amounts"
  type = map(object({
    service_id     = string
    monthly_amount = number
  }))
  default = {
    compute = {
      service_id     = "services/6F81-5844-456A"
      monthly_amount = 500
    }
    bigquery = {
      service_id     = "services/24E6-581D-38E5"
      monthly_amount = 200
    }
    cloud_sql = {
      service_id     = "services/9662-B51E-5089"
      monthly_amount = 300
    }
    gke = {
      service_id     = "services/6F81-5844-456A"
      monthly_amount = 400
    }
  }
}

resource "google_billing_budget" "service_budgets" {
  for_each = var.service_budgets

  billing_account = var.billing_account_id
  display_name    = "${var.project_id} - ${each.key} Budget"

  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
    services = [each.value.service_id]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = each.value.monthly_amount
    }
  }

  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    pubsub_topic                     = google_pubsub_topic.budget_alerts.id
    disable_default_iam_recipients   = false
  }
}
```

## Automated Cost Enforcement

Budget alerts alone only tell you about overspending. To actually stop it, you can automate responses through Pub/Sub and Cloud Functions:

```hcl
# enforcement.tf - Automated budget enforcement

# Pub/Sub topic for budget alert messages
resource "google_pubsub_topic" "budget_alerts" {
  project = var.project_id
  name    = "budget-alerts"
}

# Cloud Function that responds to budget alerts
resource "google_cloudfunctions2_function" "budget_enforcer" {
  project  = var.project_id
  name     = "budget-enforcer"
  location = var.region

  build_config {
    runtime     = "python312"
    entry_point = "enforce_budget"

    source {
      storage_source {
        bucket = google_storage_bucket.functions_source.name
        object = google_storage_bucket_object.enforcer_source.name
      }
    }
  }

  service_config {
    available_memory      = "256Mi"
    timeout_seconds       = 300
    service_account_email = google_service_account.budget_enforcer.email

    environment_variables = {
      PROJECT_ID          = var.project_id
      SLACK_WEBHOOK_URL   = var.slack_webhook_url
      ENFORCEMENT_ENABLED = var.enable_enforcement ? "true" : "false"
    }
  }

  event_trigger {
    event_type = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic = google_pubsub_topic.budget_alerts.id
  }
}

# Service account with permission to manage resources
resource "google_service_account" "budget_enforcer" {
  project      = var.project_id
  account_id   = "budget-enforcer"
  display_name = "Budget Enforcement Function"
}

# Grant permission to stop/delete compute instances
resource "google_project_iam_member" "enforcer_compute" {
  project = var.project_id
  role    = "roles/compute.instanceAdmin.v1"
  member  = "serviceAccount:${google_service_account.budget_enforcer.email}"
}
```

Here is the enforcement function:

```python
# Budget enforcement Cloud Function
# Stops non-essential compute instances when budget is exceeded

import base64
import json
import os
import functions_framework
from google.cloud import compute_v1

@functions_framework.cloud_event
def enforce_budget(cloud_event):
    """Respond to budget alert by stopping non-essential resources."""
    # Decode the Pub/Sub message
    data = base64.b64decode(cloud_event.data["message"]["data"])
    budget_alert = json.loads(data)

    cost_amount = budget_alert.get("costAmount", 0)
    budget_amount = budget_alert.get("budgetAmount", 0)

    if budget_amount == 0:
        return

    ratio = cost_amount / budget_amount

    project_id = os.environ["PROJECT_ID"]
    enforcement_enabled = os.environ.get("ENFORCEMENT_ENABLED") == "true"

    if ratio >= 1.2 and enforcement_enabled:
        # Over 120% of budget - stop non-production instances
        stop_non_essential_instances(project_id)
        notify_slack(f"Budget exceeded 120%. Stopping non-essential instances in {project_id}.")
    elif ratio >= 1.0:
        notify_slack(f"Budget reached 100% in {project_id}. Current spend: ${cost_amount:.2f}")
    elif ratio >= 0.8:
        notify_slack(f"Budget at 80% in {project_id}. Current spend: ${cost_amount:.2f}")

def stop_non_essential_instances(project_id):
    """Stop compute instances labeled as non-essential."""
    client = compute_v1.InstancesClient()

    # List all zones and instances
    agg_list = client.aggregated_list(project=project_id)
    for zone, instances in agg_list:
        if instances.instances:
            for instance in instances.instances:
                labels = instance.labels or {}
                # Only stop instances labeled as non-essential
                if labels.get("essential") != "true":
                    zone_name = zone.split("/")[-1]
                    client.stop(
                        project=project_id,
                        zone=zone_name,
                        instance=instance.name
                    )
                    print(f"Stopped instance: {instance.name} in {zone_name}")
```

## Resource Quotas

Quotas limit how many resources can be created. While GCP has default quotas, you can request lower quotas for cost control:

```hcl
# quotas.tf - Service usage consumer quota overrides

# Limit the number of CPUs in Compute Engine
resource "google_service_usage_consumer_quota_override" "compute_cpus" {
  project        = var.project_id
  service        = "compute.googleapis.com"
  metric         = "compute.googleapis.com/cpus"
  limit          = "/project/region"
  override_value = var.max_cpus_per_region
  force          = true

  dimensions = {
    region = var.region
  }
}

# Limit the number of GPUs (expensive resources)
resource "google_service_usage_consumer_quota_override" "compute_gpus" {
  project        = var.project_id
  service        = "compute.googleapis.com"
  metric         = "compute.googleapis.com/nvidia_t4_gpus"
  limit          = "/project/region"
  override_value = var.max_gpus_per_region
  force          = true

  dimensions = {
    region = var.region
  }
}
```

## Labeling Strategy for Cost Allocation

Labels are essential for understanding where costs come from. Enforce them with Terraform:

```hcl
# labels.tf - Default labels applied to all resources

locals {
  default_labels = {
    environment = var.environment
    team        = var.team
    project     = var.project_name
    managed_by  = "terraform"
    cost_center = var.cost_center
  }
}

# Use these labels on every resource
resource "google_compute_instance" "example" {
  # ... other config ...
  labels = merge(local.default_labels, {
    essential = "true"
    role      = "web-server"
  })
}
```

## BigQuery Cost Controls

BigQuery can be surprisingly expensive. Set per-user and per-project query limits:

```hcl
# bigquery-controls.tf - BigQuery cost controls

# Custom role with limited BigQuery permissions
resource "google_project_iam_custom_role" "bq_cost_controlled" {
  project     = var.project_id
  role_id     = "bigqueryCostControlled"
  title       = "BigQuery Cost Controlled User"
  description = "BigQuery access with cost controls"

  permissions = [
    "bigquery.jobs.create",
    "bigquery.datasets.get",
    "bigquery.tables.getData",
    "bigquery.tables.list",
  ]
}
```

For per-project byte limits, use the BigQuery reservation API:

```hcl
# Set maximum bytes billed per query at the project level
resource "google_bigquery_reservation_assignment" "default" {
  count    = var.enable_bq_reservation ? 1 : 0
  project  = var.project_id
  location = var.bq_location

  assignee = "projects/${var.project_id}"
  reservation = google_bigquery_reservation.default[0].id
  job_type = "QUERY"
}
```

## Monitoring Dashboard

Create a cost monitoring dashboard:

```hcl
# dashboard.tf - Cost monitoring dashboard

resource "google_monitoring_dashboard" "cost" {
  project        = var.project_id
  dashboard_json = jsonencode({
    displayName = "Cost Monitoring"
    gridLayout = {
      columns = 2
      widgets = [
        {
          title = "Daily Spend by Service"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type = \"global\" AND metric.type = \"billing.googleapis.com/billing/gcp/cost\""
                }
              }
            }]
          }
        }
      ]
    }
  })
}
```

## Summary

Cost controls are not optional in the cloud - they are a necessity. This Terraform setup gives you multiple layers of defense: budget alerts for awareness, automated enforcement for emergencies, resource quotas for hard limits, and labels for tracking where money goes. Start with budget alerts at 50%, 80%, and 100% thresholds, add service-specific budgets for your most expensive services, and consider automated enforcement for non-production environments. Your finance team will thank you.
