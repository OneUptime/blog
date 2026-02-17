# How to Implement Project-Per-Tenant Multi-Tenancy on Google Cloud Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Multi-Tenancy, SaaS, Project Management, Google Cloud

Description: A practical guide to implementing the project-per-tenant multi-tenancy pattern on Google Cloud Platform for SaaS applications with strong tenant isolation.

---

When building a SaaS application on Google Cloud Platform, one of the biggest architectural decisions you will make is how to isolate tenants from each other. The project-per-tenant model is the strongest isolation pattern available on GCP. Each tenant gets their own Google Cloud project, which means separate IAM boundaries, separate billing, and separate resource quotas.

This approach works well for enterprise SaaS products where tenants demand strict data isolation, have compliance requirements, or are willing to pay a premium for dedicated infrastructure. Let me walk through how to actually implement this.

## Why Project-Per-Tenant?

Before diving into the implementation, let me explain why you would choose this pattern over alternatives. GCP projects are natural isolation boundaries. When each tenant has their own project:

- IAM policies are completely separate, reducing the risk of cross-tenant access
- Billing is naturally separated per tenant
- Quotas and limits apply per project, so one noisy tenant cannot exhaust resources for others
- Audit logs are isolated, simplifying compliance
- You can apply different organization policies per tenant if needed

The trade-off is operational complexity. Managing hundreds or thousands of projects requires solid automation, which is exactly what we will build here.

## Setting Up the Foundation

First, you need a folder structure that organizes tenant projects. I recommend placing all tenant projects under a dedicated folder.

```hcl
# Create a parent folder for all tenant projects
resource "google_folder" "tenants" {
  display_name = "Tenant Projects"
  parent       = "organizations/${var.org_id}"
}

# Create environment-specific sub-folders
resource "google_folder" "tenants_prod" {
  display_name = "Production Tenants"
  parent       = google_folder.tenants.name
}

resource "google_folder" "tenants_staging" {
  display_name = "Staging Tenants"
  parent       = google_folder.tenants.name
}
```

## Building the Tenant Provisioning Module

The core of this pattern is a Terraform module that creates everything a tenant needs. This module should be parameterized so each tenant gets a consistent setup.

```hcl
# modules/tenant-project/variables.tf
variable "tenant_id" {
  description = "Unique identifier for the tenant"
  type        = string
}

variable "tenant_name" {
  description = "Human-readable tenant name"
  type        = string
}

variable "folder_id" {
  description = "Parent folder for the tenant project"
  type        = string
}

variable "billing_account_id" {
  description = "Billing account to associate with the project"
  type        = string
}

variable "region" {
  description = "Primary region for tenant resources"
  type        = string
  default     = "us-central1"
}
```

```hcl
# modules/tenant-project/main.tf
# Create the tenant-specific project
resource "google_project" "tenant" {
  name            = "tenant-${var.tenant_id}"
  project_id      = "tenant-${var.tenant_id}-${random_id.suffix.hex}"
  folder_id       = var.folder_id
  billing_account = var.billing_account_id

  labels = {
    tenant_id   = var.tenant_id
    tenant_name = lower(replace(var.tenant_name, " ", "-"))
    managed_by  = "terraform"
  }
}

resource "random_id" "suffix" {
  byte_length = 2
}

# Enable the APIs this tenant needs
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "cloudsql.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
  ])

  project = google_project.tenant.project_id
  service = each.value
}

# Create a Cloud SQL instance for the tenant
resource "google_sql_database_instance" "tenant_db" {
  name             = "tenant-${var.tenant_id}-db"
  project          = google_project.tenant.project_id
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-2-4096"

    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
    }
  }

  depends_on = [google_project_service.apis]
}

# Create a Cloud Storage bucket for tenant data
resource "google_storage_bucket" "tenant_data" {
  name     = "tenant-${var.tenant_id}-data-${random_id.suffix.hex}"
  project  = google_project.tenant.project_id
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 365
    }
  }
}
```

## Automating Tenant Onboarding

You do not want to manually run Terraform every time a new customer signs up. Instead, build an onboarding service that triggers the provisioning pipeline.

```python
# tenant_onboarding.py - Cloud Function triggered by new tenant signup
import json
import os
from google.cloud import pubsub_v1
from google.cloud import secretmanager

def onboard_tenant(event, context):
    """Triggered by a Pub/Sub message when a new tenant signs up."""
    # Decode the incoming message
    tenant_data = json.loads(event["data"].decode("utf-8"))
    tenant_id = tenant_data["tenant_id"]
    tenant_name = tenant_data["tenant_name"]
    tier = tenant_data.get("tier", "standard")

    print(f"Starting onboarding for tenant: {tenant_id}")

    # Trigger Cloud Build to run the Terraform provisioning
    publisher = pubsub_v1.PublisherClient()
    topic = f"projects/{os.environ['PROJECT_ID']}/topics/terraform-apply"

    # Pass tenant configuration to the build pipeline
    message = json.dumps({
        "tenant_id": tenant_id,
        "tenant_name": tenant_name,
        "tier": tier,
        "action": "create"
    }).encode("utf-8")

    # Publish the message to trigger provisioning
    future = publisher.publish(topic, message)
    result = future.result()
    print(f"Published provisioning request: {result}")

    return {"status": "provisioning_started", "tenant_id": tenant_id}
```

## Managing Networking Across Tenant Projects

Each tenant project needs network connectivity to shared services like your application control plane. Use VPC peering or a shared VPC to accomplish this.

```hcl
# Peer the tenant's VPC with the control plane VPC
resource "google_compute_network" "tenant_vpc" {
  name                    = "tenant-vpc"
  project                 = google_project.tenant.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "tenant_subnet" {
  name          = "tenant-subnet"
  project       = google_project.tenant.project_id
  network       = google_compute_network.tenant_vpc.id
  region        = var.region
  ip_cidr_range = var.tenant_cidr_block
}

# Set up VPC peering between tenant and control plane
resource "google_compute_network_peering" "tenant_to_control" {
  name         = "tenant-to-control-plane"
  network      = google_compute_network.tenant_vpc.id
  peer_network = var.control_plane_vpc_id
}

resource "google_compute_network_peering" "control_to_tenant" {
  name         = "control-plane-to-tenant"
  network      = var.control_plane_vpc_id
  peer_network = google_compute_network.tenant_vpc.id
}
```

One thing to watch out for is IP address space management. Each tenant VPC needs a unique CIDR block. I recommend using a central IPAM (IP Address Management) system - even a simple database table works - to track and allocate IP ranges.

## Handling Tenant Offboarding

Tenant offboarding needs to be just as automated as onboarding. When a tenant churns, you need to clean up their resources, but you also need to retain data for a grace period in case they come back or you need it for compliance.

```hcl
# Before deletion, export data to a long-term archive bucket
resource "google_storage_transfer_job" "tenant_archive" {
  count       = var.tenant_status == "offboarding" ? 1 : 0
  description = "Archive tenant ${var.tenant_id} data before deletion"
  project     = var.archive_project_id

  transfer_spec {
    gcs_data_source {
      bucket_name = google_storage_bucket.tenant_data.name
      path        = "/"
    }
    gcs_data_sink {
      bucket_name = var.archive_bucket_name
      path        = "tenants/${var.tenant_id}/"
    }
  }

  schedule {
    schedule_start_date {
      year  = 2026
      month = 2
      day   = 17
    }
  }
}
```

## Monitoring Across All Tenant Projects

You need visibility into all tenant projects from a central location. Set up a monitoring project that aggregates metrics from all tenant projects.

```hcl
# Create a monitoring scope that includes all tenant projects
resource "google_monitoring_monitored_project" "tenant" {
  for_each      = toset(var.tenant_project_ids)
  metrics_scope = "projects/${var.monitoring_project_id}"
  name          = each.value
}
```

## Cost Considerations

The project-per-tenant model can be more expensive than shared infrastructure because you lose the ability to share resources like database instances. To keep costs manageable:

- Use committed use discounts at the organization level rather than per-project
- Right-size resources based on tenant tier (small tenants get smaller instances)
- Implement auto-scaling where possible
- Use billing budgets per tenant project to catch cost anomalies early

## When to Use This Pattern

This pattern is best suited for:

- B2B SaaS with fewer than a few hundred tenants
- Applications with strict compliance requirements (HIPAA, PCI, SOC2)
- Products where tenants expect dedicated resources
- Scenarios where tenants need different configurations or versions

For consumer-facing SaaS with thousands of tenants, consider namespace-per-tenant or shared infrastructure models instead.

## Wrapping Up

The project-per-tenant model on GCP gives you the strongest isolation guarantees available. The key to making it work at scale is automation. Your tenant provisioning, monitoring, and offboarding all need to be fully automated through infrastructure as code and event-driven workflows. Start with the Terraform modules, build the onboarding pipeline, and layer in monitoring and cost controls as you scale.
