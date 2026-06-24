# How to Manage GCP Committed Use Discounts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Committed Use Discounts, Cost Optimization, Infrastructure as Code

Description: Learn how to purchase and manage GCP Committed Use Discounts with OpenTofu for up to 57% savings on Compute Engine and Cloud SQL workloads.

GCP Committed Use Discounts (CUDs) provide significant discounts in exchange for 1 or 3-year commitments. Depending on the service, those commitments are resource-based or spend-based. Managing the relevant resources in OpenTofu keeps your cost optimization strategy documented.

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
  project = var.project_id
  region  = "us-central1"
}

data "google_project" "current" {}
```

## General-Purpose Commitment (Compute Engine)

```hcl
resource "google_compute_region_commitment" "production" {
  name   = "production-commitment"
  region = "us-central1"
  plan   = "THIRTY_SIX_MONTH"  # TWELVE_MONTH or THIRTY_SIX_MONTH
  type   = "GENERAL_PURPOSE"

  resources {
    type   = "VCPU"
    amount = "32"  # Commit to 32 vCPUs
  }

  resources {
    type   = "MEMORY"
    amount = "131072"  # 128 GB RAM in MB
  }
}
```

## N2 Commitment

```hcl
resource "google_compute_region_commitment" "n2_standard" {
  name   = "n2-standard-commitment"
  region = "us-central1"
  plan   = "TWELVE_MONTH"
  type   = "GENERAL_PURPOSE_N2"

  resources {
    type   = "VCPU"
    amount = "16"
  }

  resources {
    type   = "MEMORY"
    amount = "65536"  # 64 GB RAM in MB
  }
}
```

## GPU Commitment

GPU commitments must be attached to a reservation. In OpenTofu, model the reservation and the commitment together:

```hcl
resource "google_compute_reservation" "a100" {
  name = "a100-reservation"
  zone = "us-central1-a"

  specific_reservation {
    count = 1

    instance_properties {
      machine_type = "a2-highgpu-4g"

      guest_accelerators {
        accelerator_type  = "nvidia-tesla-a100"
        accelerator_count = 4
      }
    }
  }
}

resource "google_compute_region_commitment" "gpu_commitment" {
  name                  = "gpu-commitment"
  region                = "us-central1"
  plan                  = "TWELVE_MONTH"
  type                  = "ACCELERATOR_OPTIMIZED"
  existing_reservations = [google_compute_reservation.a100.self_link]

  resources {
    type   = "VCPU"
    amount = "48"
  }

  resources {
    type   = "MEMORY"
    amount = "348160"  # 340 GB RAM in MB
  }

  resources {
    type             = "ACCELERATOR"
    amount           = "4"
    accelerator_type = "nvidia-tesla-a100"
  }
}
```

## Cloud SQL CUD Spend Tracking

Cloud SQL CUDs are spend-based commitments purchased through Cloud Billing, not `google_compute_region_commitment` resources. You can still use OpenTofu to manage a Cloud SQL budget and alerts:

```hcl
resource "google_billing_budget" "cloud_sql" {
  billing_account = var.billing_account_id
  display_name    = "Cloud SQL Monthly Budget"

  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
    services = ["services/9662-B51E-5089"]  # Cloud SQL service ID
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
}
```

## Viewing Commitments

```bash
# List active commitments
gcloud compute commitments list --regions=us-central1

# Inspect commitment resources
gcloud compute commitments describe production-commitment \
  --region=us-central1 \
  --format="json" | jq '{name, status, startTimestamp, endTimestamp, resources}'
```

For utilization and savings analysis, use the Cloud Billing CUD analysis report.

## Budget Alert for Compute Engine Spend

```hcl
resource "google_pubsub_topic" "budget_alerts" {
  name = "budget-alerts"
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Billing Alerts"
  type         = "email"

  labels = {
    email_address = "billing-alerts@example.com"
  }
}

resource "google_billing_budget" "compute_budget" {
  billing_account = var.billing_account_id
  display_name    = "Compute Engine Monthly Budget"

  budget_filter {
    projects               = ["projects/${data.google_project.current.number}"]
    services               = ["services/6F81-5844-456A"]  # Compute Engine service ID
    credit_types_treatment = "INCLUDE_SPECIFIED_CREDITS"
    credit_types           = ["COMMITTED_USAGE_DISCOUNT"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "20000"
    }
  }

  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.1
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    pubsub_topic                     = google_pubsub_topic.budget_alerts.id
    schema_version                   = "1.0"
    monitoring_notification_channels = [google_monitoring_notification_channel.email.id]
  }
}
```

## Conclusion

Compute Engine resource-based commitments can be modeled in OpenTofu with `google_compute_region_commitment`, while Cloud SQL CUDs are spend-based commitments purchased through Cloud Billing and monitored with budgets and alerts. Review commitment details with `gcloud`, and use the Cloud Billing CUD analysis report to monitor utilization and savings over time.
