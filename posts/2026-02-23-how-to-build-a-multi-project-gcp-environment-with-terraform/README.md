# How to Build a Multi-Project GCP Environment with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, GCP, Google Cloud, Multi-Project, Cloud Governance

Description: Learn how to build a multi-project GCP environment with Terraform using folders, organization policies, shared VPC networking, and project factory patterns.

---

Google Cloud Platform uses projects as the fundamental unit of resource organization. Every resource lives in a project, and projects are where you manage billing, APIs, and permissions. When your team grows beyond a handful of people, stuffing everything into one project creates the same problems you get with a single AWS account or Azure subscription. In this post, we will build a well-structured multi-project GCP environment using Terraform.

## Why Multiple Projects?

Projects in GCP serve as security boundaries, billing units, and API quota containers. Separating workloads into different projects gives you cleaner IAM, independent quotas, granular billing, and blast radius containment. If someone accidentally runs a script that spins up 1000 VMs in the dev project, production remains unaffected.

## Architecture Overview

Our multi-project environment includes:

- Organization and folder hierarchy
- Organization policies for governance
- Shared VPC for centralized networking
- Centralized logging and monitoring
- Project factory module for repeatable provisioning
- Billing budgets and alerts

## Folder Hierarchy

Folders in GCP are similar to OUs in AWS. They let you group projects and apply policies.

```hcl
# Reference the organization
data "google_organization" "main" {
  domain = "company.com"
}

# Top-level folders
resource "google_folder" "platform" {
  display_name = "Platform"
  parent       = data.google_organization.main.name
}

resource "google_folder" "workloads" {
  display_name = "Workloads"
  parent       = data.google_organization.main.name
}

resource "google_folder" "sandbox" {
  display_name = "Sandbox"
  parent       = data.google_organization.main.name
}

# Platform sub-folders
resource "google_folder" "networking" {
  display_name = "Networking"
  parent       = google_folder.platform.name
}

resource "google_folder" "security" {
  display_name = "Security"
  parent       = google_folder.platform.name
}

resource "google_folder" "shared_services" {
  display_name = "Shared Services"
  parent       = google_folder.platform.name
}

# Workload sub-folders by environment
resource "google_folder" "workloads_prod" {
  display_name = "Production"
  parent       = google_folder.workloads.name
}

resource "google_folder" "workloads_nonprod" {
  display_name = "Non-Production"
  parent       = google_folder.workloads.name
}
```

## Organization Policies

Organization policies are GCP's equivalent of SCPs. They restrict what can be done across the entire org or specific folders.

```hcl
# Restrict resource locations to approved regions
resource "google_org_policy_policy" "allowed_locations" {
  name   = "${data.google_organization.main.name}/policies/gcp.resourceLocations"
  parent = data.google_organization.main.name

  spec {
    rules {
      values {
        allowed_values = [
          "in:us-locations",
          "in:eu-locations",
        ]
      }
    }
  }
}

# Disable external IP addresses on VMs in production
resource "google_org_policy_policy" "disable_external_ip_prod" {
  name   = "${google_folder.workloads_prod.name}/policies/compute.vmExternalIpAccess"
  parent = google_folder.workloads_prod.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Require OS Login on all VMs
resource "google_org_policy_policy" "require_os_login" {
  name   = "${data.google_organization.main.name}/policies/compute.requireOsLogin"
  parent = data.google_organization.main.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Restrict which services can be used
resource "google_org_policy_policy" "allowed_services" {
  name   = "${google_folder.sandbox.name}/policies/gcp.restrictServiceUsage"
  parent = google_folder.sandbox.name

  spec {
    rules {
      values {
        allowed_values = [
          "compute.googleapis.com",
          "storage.googleapis.com",
          "bigquery.googleapis.com",
          "container.googleapis.com",
        ]
      }
    }
  }
}

# Enforce uniform bucket-level access
resource "google_org_policy_policy" "uniform_bucket_access" {
  name   = "${data.google_organization.main.name}/policies/storage.uniformBucketLevelAccess"
  parent = data.google_organization.main.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Core Projects

Create the foundational projects that support everything else.

```hcl
# Networking host project for Shared VPC
resource "google_project" "host_network" {
  name            = "host-networking"
  project_id      = "company-host-network"
  folder_id       = google_folder.networking.name
  billing_account = var.billing_account_id

  auto_create_network = false

  labels = {
    purpose   = "networking"
    managedby = "terraform"
  }
}

# Enable required APIs on the host project
resource "google_project_service" "host_network_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "dns.googleapis.com",
    "servicenetworking.googleapis.com",
  ])

  project = google_project.host_network.project_id
  service = each.value
}

# Enable Shared VPC on the host project
resource "google_compute_shared_vpc_host_project" "host" {
  project = google_project.host_network.project_id
}

# Logging project
resource "google_project" "logging" {
  name            = "centralized-logging"
  project_id      = "company-logging"
  folder_id       = google_folder.security.name
  billing_account = var.billing_account_id

  auto_create_network = false
}

# Security project
resource "google_project" "security" {
  name            = "security-tooling"
  project_id      = "company-security"
  folder_id       = google_folder.security.name
  billing_account = var.billing_account_id

  auto_create_network = false
}
```

## Shared VPC Networking

Shared VPC lets workload projects use a centrally managed network.

```hcl
# Hub VPC in the host project
resource "google_compute_network" "shared_vpc" {
  project                 = google_project.host_network.project_id
  name                    = "shared-vpc"
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

# Subnets for different workloads
resource "google_compute_subnetwork" "prod_app" {
  project       = google_project.host_network.project_id
  name          = "prod-app-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-central1"
  network       = google_compute_network.shared_vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_subnetwork" "dev_app" {
  project       = google_project.host_network.project_id
  name          = "dev-app-subnet"
  ip_cidr_range = "10.0.2.0/24"
  region        = "us-central1"
  network       = google_compute_network.shared_vpc.id
}

# Cloud NAT for outbound internet access
resource "google_compute_router" "nat_router" {
  project = google_project.host_network.project_id
  name    = "nat-router"
  region  = "us-central1"
  network = google_compute_network.shared_vpc.id
}

resource "google_compute_router_nat" "nat" {
  project = google_project.host_network.project_id
  name    = "cloud-nat"
  router  = google_compute_router.nat_router.name
  region  = "us-central1"

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Attach workload projects as service projects
resource "google_compute_shared_vpc_service_project" "prod_app" {
  host_project    = google_project.host_network.project_id
  service_project = google_project.prod_workload.project_id
}
```

## Centralized Logging

Aggregate logs from all projects into the logging project.

```hcl
# Organization-level log sink
resource "google_logging_organization_sink" "central" {
  name             = "central-log-sink"
  org_id           = data.google_organization.main.org_id
  destination      = "logging.googleapis.com/projects/${google_project.logging.project_id}/locations/global/buckets/org-logs"
  include_children = true

  filter = "severity >= WARNING"
}

# Log bucket in the logging project
resource "google_logging_project_bucket_config" "org_logs" {
  project        = google_project.logging.project_id
  location       = "global"
  retention_days = 365
  bucket_id      = "org-logs"
}

# BigQuery dataset for log analytics
resource "google_bigquery_dataset" "logs" {
  project    = google_project.logging.project_id
  dataset_id = "org_audit_logs"
  location   = "US"

  default_table_expiration_ms = 31536000000  # 1 year
}

# Log sink to BigQuery for analysis
resource "google_logging_organization_sink" "bigquery" {
  name             = "bigquery-audit-sink"
  org_id           = data.google_organization.main.org_id
  destination      = "bigquery.googleapis.com/projects/${google_project.logging.project_id}/datasets/${google_bigquery_dataset.logs.dataset_id}"
  include_children = true

  filter = "logName:\"cloudaudit.googleapis.com\""
}
```

## Project Factory Module

A reusable module that creates new projects with all the baseline configuration.

```hcl
# modules/project-factory/main.tf
variable "project_name" {}
variable "folder_id" {}
variable "billing_account_id" {}
variable "shared_vpc_host_project" {}
variable "subnet_self_link" {}
variable "environment" {}

# Create the project
resource "google_project" "this" {
  name            = var.project_name
  project_id      = "company-${var.project_name}"
  folder_id       = var.folder_id
  billing_account = var.billing_account_id

  auto_create_network = false

  labels = {
    environment = var.environment
    managedby   = "terraform"
  }
}

# Enable standard APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ])

  project = google_project.this.project_id
  service = each.value
}

# Attach to Shared VPC
resource "google_compute_shared_vpc_service_project" "this" {
  host_project    = var.shared_vpc_host_project
  service_project = google_project.this.project_id
}

# Budget alert
resource "google_billing_budget" "this" {
  billing_account = var.billing_account_id
  display_name    = "${var.project_name}-budget"

  budget_filter {
    projects = ["projects/${google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "1000"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }
}

output "project_id" {
  value = google_project.this.project_id
}
```

## Wrapping Up

A multi-project GCP environment with proper folder hierarchy, organization policies, and Shared VPC networking sets you up for long-term success. The project factory pattern ensures every new workload gets the same baseline configuration without manual intervention.

The important thing is to start with this structure early. Retrofitting a flat project structure into a proper hierarchy is much harder than building it right from the beginning.

For monitoring resources across all your GCP projects with unified dashboards and alerting, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-multi-project-gcp-environment-with-terraform/view) for cross-project observability.
