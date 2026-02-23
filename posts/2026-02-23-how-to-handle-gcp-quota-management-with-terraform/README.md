# How to Handle GCP Quota Management with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Quota Management, Infrastructure as Code, Google Cloud, Resource Management

Description: Practical strategies for managing GCP service quotas with Terraform, including requesting increases and preventing deployment failures.

---

If you have ever hit a quota limit halfway through a Terraform apply, you know how frustrating it can be. Your deployment fails partway, leaving resources in a half-created state, and you are stuck waiting for a quota increase before you can try again. Proper quota management is not the most exciting part of infrastructure work, but it saves you from plenty of headaches.

This post covers how to work with GCP quotas in Terraform - checking current limits, requesting increases programmatically, and building safeguards so you do not get surprised by quota exhaustion.

## Understanding GCP Quotas

GCP quotas exist at multiple levels:

- **Project quotas** - Limits on resources within a project (VMs, IP addresses, etc.)
- **Regional quotas** - Limits that apply per region (CPU cores, GPUs, etc.)
- **Rate quotas** - API call rate limits
- **Allocation quotas** - Hard limits on resource counts

Some quotas can be increased by request, while others are hard limits set by Google.

## Checking Current Quota Usage

Before making infrastructure changes, it is smart to check your current quota usage. The `google_compute_project_metadata` data source does not directly expose quotas, but you can use the Google Cloud client to query them.

```hcl
# data.tf - Query current quota information
data "google_project" "current" {
  project_id = var.project_id
}

# You can query specific compute quotas
data "google_compute_region" "current" {
  name    = var.region
  project = var.project_id
}

# Output regional quota information
output "regional_quotas" {
  description = "Quotas for the selected region"
  value       = data.google_compute_region.current.quotas
}
```

## Requesting Quota Increases with Terraform

The `google_service_usage_consumer_quota_override` resource lets you request quota increases directly from Terraform.

```hcl
# quota.tf - Request quota increases programmatically
terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type    = string
  default = "us-central1"
}

# Enable the Service Usage API (required for quota management)
resource "google_project_service" "service_usage" {
  project = var.project_id
  service = "serviceusage.googleapis.com"

  disable_on_destroy = false
}

# Request a quota override for Compute Engine CPUs
resource "google_service_usage_consumer_quota_override" "cpus_override" {
  provider = google

  project        = var.project_id
  service        = "compute.googleapis.com"
  metric         = "compute.googleapis.com%2Fcpus"
  limit          = "%2Fproject%2Fregion"
  override_value = "100"

  # Apply to a specific region
  dimensions = {
    region = var.region
  }

  force = true

  depends_on = [google_project_service.service_usage]
}
```

Note that the metric and limit values use URL-encoded paths. The `%2F` represents a forward slash. This encoding is required by the Service Usage API.

## Common Quota Overrides

Here are Terraform configurations for the most commonly needed quota increases.

```hcl
# common_quotas.tf - Typical quota increases for production projects

# Increase regional CPU quota
resource "google_service_usage_consumer_quota_override" "regional_cpus" {
  project        = var.project_id
  service        = "compute.googleapis.com"
  metric         = "compute.googleapis.com%2Fcpus"
  limit          = "%2Fproject%2Fregion"
  override_value = "200"
  force          = true

  dimensions = {
    region = var.region
  }
}

# Increase in-use IP addresses quota
resource "google_service_usage_consumer_quota_override" "ip_addresses" {
  project        = var.project_id
  service        = "compute.googleapis.com"
  metric         = "compute.googleapis.com%2Fin_use_addresses"
  limit          = "%2Fproject%2Fregion"
  override_value = "50"
  force          = true

  dimensions = {
    region = var.region
  }
}

# Increase Cloud SQL instances quota
resource "google_service_usage_consumer_quota_override" "sql_instances" {
  project        = var.project_id
  service        = "sqladmin.googleapis.com"
  metric         = "sqladmin.googleapis.com%2Fquota%2FinstancesPerProject"
  limit          = "%2Fproject"
  override_value = "20"
  force          = true
}

# Increase GKE node quota (per zone)
resource "google_service_usage_consumer_quota_override" "gke_nodes" {
  project        = var.project_id
  service        = "container.googleapis.com"
  metric         = "container.googleapis.com%2Finternal%2Fnodes"
  limit          = "%2Fproject%2Fzone"
  override_value = "100"
  force          = true

  dimensions = {
    zone = var.zone
  }
}
```

## Building a Quota Module

For organizations managing multiple projects, a reusable module simplifies quota management.

```hcl
# modules/gcp-quotas/variables.tf
variable "project_id" {
  type        = string
  description = "The GCP project to configure quotas for"
}

variable "quota_overrides" {
  type = map(object({
    service        = string
    metric         = string
    limit          = string
    override_value = string
    dimensions     = optional(map(string), {})
  }))
  description = "Map of quota overrides to apply"
  default     = {}
}
```

```hcl
# modules/gcp-quotas/main.tf
resource "google_service_usage_consumer_quota_override" "overrides" {
  for_each = var.quota_overrides

  project        = var.project_id
  service        = each.value.service
  metric         = each.value.metric
  limit          = each.value.limit
  override_value = each.value.override_value
  dimensions     = each.value.dimensions
  force          = true
}
```

```hcl
# Using the module
module "project_quotas" {
  source     = "./modules/gcp-quotas"
  project_id = var.project_id

  quota_overrides = {
    regional_cpus = {
      service        = "compute.googleapis.com"
      metric         = "compute.googleapis.com%2Fcpus"
      limit          = "%2Fproject%2Fregion"
      override_value = "200"
      dimensions     = { region = "us-central1" }
    }

    ip_addresses = {
      service        = "compute.googleapis.com"
      metric         = "compute.googleapis.com%2Fin_use_addresses"
      limit          = "%2Fproject%2Fregion"
      override_value = "50"
      dimensions     = { region = "us-central1" }
    }
  }
}
```

## Pre-deployment Quota Checks

One effective strategy is to check quotas before deploying infrastructure. You can do this with a `null_resource` that runs a script.

```hcl
# pre_check.tf - Verify quotas before creating resources
resource "null_resource" "quota_check" {
  # Re-run when the desired instance count changes
  triggers = {
    desired_instances = var.instance_count
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Check current CPU usage vs quota
      CURRENT_USAGE=$(gcloud compute regions describe ${var.region} \
        --project=${var.project_id} \
        --format="value(quotas.filter('metric:CPUS').map().extract(usage).flatten())")

      QUOTA_LIMIT=$(gcloud compute regions describe ${var.region} \
        --project=${var.project_id} \
        --format="value(quotas.filter('metric:CPUS').map().extract(limit).flatten())")

      NEEDED=$((${var.instance_count} * ${var.cpus_per_instance}))
      AVAILABLE=$(echo "$QUOTA_LIMIT - $CURRENT_USAGE" | bc)

      if [ "$NEEDED" -gt "$AVAILABLE" ]; then
        echo "ERROR: Need $NEEDED CPUs but only $AVAILABLE available (limit: $QUOTA_LIMIT, used: $CURRENT_USAGE)"
        exit 1
      fi

      echo "Quota check passed: Need $NEEDED CPUs, $AVAILABLE available"
    EOT
  }
}
```

## Handling Quota Errors in CI/CD

When Terraform runs in a CI/CD pipeline, quota errors can be particularly disruptive. Here is a wrapper script that handles quota-related failures gracefully.

```bash
#!/bin/bash
# deploy.sh - Terraform deployment with quota error handling

set -euo pipefail

MAX_RETRIES=3
RETRY_DELAY=60

for i in $(seq 1 $MAX_RETRIES); do
  echo "Deployment attempt $i of $MAX_RETRIES"

  # Run terraform apply and capture output
  if terraform apply -auto-approve 2>&1 | tee /tmp/tf-output.log; then
    echo "Deployment succeeded"
    exit 0
  fi

  # Check if the failure was quota-related
  if grep -q "QUOTA_EXCEEDED\|quotaExceeded\|Quota" /tmp/tf-output.log; then
    echo "Quota error detected. Waiting ${RETRY_DELAY}s before retry..."
    sleep $RETRY_DELAY
    RETRY_DELAY=$((RETRY_DELAY * 2))  # Exponential backoff
  else
    echo "Non-quota error encountered. Exiting."
    exit 1
  fi
done

echo "Max retries reached. Deployment failed."
exit 1
```

## Monitoring Quota Usage

Keeping an eye on quota usage helps you avoid surprises. You can set up alerts in Cloud Monitoring when usage approaches limits.

```hcl
# monitoring.tf - Alert when quota usage exceeds 80%
resource "google_monitoring_alert_policy" "quota_alert" {
  display_name = "GCP Quota Usage Alert"
  combiner     = "OR"

  conditions {
    display_name = "CPU Quota > 80%"

    condition_threshold {
      filter          = "metric.type=\"serviceruntime.googleapis.com/quota/allocation/usage\" AND resource.type=\"consumer_quota\" AND metric.label.quota_metric=\"compute.googleapis.com/cpus\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "60s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [var.notification_channel_id]
}
```

For comprehensive infrastructure monitoring that goes beyond just quotas, [OneUptime](https://oneuptime.com) provides a unified view of your cloud resources, alerting you to issues before they impact your users.

## Best Practices

1. **Request quota increases early** - Do not wait until deployment day. Request increases in your staging environment first.
2. **Version control quota configurations** - Treat quota overrides like any other infrastructure code.
3. **Use separate projects for environments** - This prevents staging from consuming production quotas.
4. **Set up alerting at 80%** - Give yourself time to react before hitting hard limits.
5. **Document quota dependencies** - Make it clear in your Terraform code what quotas each module needs.

## Summary

GCP quota management with Terraform involves checking current usage, requesting increases programmatically with `google_service_usage_consumer_quota_override`, building pre-deployment checks, and setting up monitoring alerts. By treating quotas as code, you reduce the risk of failed deployments and make it easier for your team to understand the resource requirements of your infrastructure.
