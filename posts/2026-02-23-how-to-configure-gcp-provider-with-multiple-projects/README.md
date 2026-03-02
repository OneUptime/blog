# How to Configure GCP Provider with Multiple Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Google Cloud, Multi-Project, Provider, Infrastructure as Code

Description: Learn how to configure the Terraform Google provider to manage resources across multiple GCP projects using provider aliases and practical organizational patterns.

---

Google Cloud projects are the primary organizational unit for resources and billing. Most organizations run multiple projects - one for production, one for staging, separate ones for shared services like DNS or logging, and maybe project-per-team setups. Terraform handles multi-project configurations through provider aliases, and this post shows you how to set that up properly.

## Why Multiple Projects

GCP projects serve as isolation boundaries. Here is why organizations use several:

- **Resource isolation** - Each project has its own quotas, IAM policies, and billing
- **Environment separation** - Production, staging, and development in separate projects
- **Team autonomy** - Each team manages their own project without stepping on others
- **Billing clarity** - Costs are tracked per project by default
- **Compliance** - Sensitive workloads can be isolated in projects with stricter controls

## Basic Multi-Project Configuration

Define multiple instances of the Google provider, each targeting a different project:

```hcl
# versions.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

# providers.tf

# Default provider - production project
provider "google" {
  project = var.production_project_id
  region  = "us-central1"
}

# Staging project
provider "google" {
  alias   = "staging"
  project = var.staging_project_id
  region  = "us-central1"
}

# Shared services project (DNS, logging, monitoring)
provider "google" {
  alias   = "shared"
  project = var.shared_project_id
  region  = "us-central1"
}
```

```hcl
# variables.tf
variable "production_project_id" {
  description = "GCP project ID for production"
  type        = string
}

variable "staging_project_id" {
  description = "GCP project ID for staging"
  type        = string
}

variable "shared_project_id" {
  description = "GCP project ID for shared services"
  type        = string
}
```

## Using Resources Across Projects

Specify which provider (and therefore which project) each resource belongs to:

```hcl
# Production VPC - goes to default (production) provider
resource "google_compute_network" "prod_vpc" {
  name                    = "production-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "prod_subnet" {
  name          = "prod-subnet-us-central1"
  ip_cidr_range = "10.0.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.prod_vpc.id
}

# Staging VPC - goes to the staging project
resource "google_compute_network" "staging_vpc" {
  provider = google.staging

  name                    = "staging-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "staging_subnet" {
  provider = google.staging

  name          = "staging-subnet-us-central1"
  ip_cidr_range = "10.1.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.staging_vpc.id
}

# DNS zone in shared services project
resource "google_dns_managed_zone" "main" {
  provider = google.shared

  name     = "main-zone"
  dns_name = "example.com."
}
```

## Shared VPC Pattern

GCP Shared VPC lets one project (the host) share its network with other projects (service projects). This is a common enterprise pattern that requires multi-project Terraform:

```hcl
# Provider for the host project (owns the VPC)
provider "google" {
  alias   = "host"
  project = var.host_project_id
  region  = "us-central1"
}

# Provider for the service project (uses the shared VPC)
provider "google" {
  project = var.service_project_id
  region  = "us-central1"
}

# Enable Shared VPC on the host project
resource "google_compute_shared_vpc_host_project" "host" {
  provider = google.host
  project  = var.host_project_id
}

# Attach the service project to the host
resource "google_compute_shared_vpc_service_project" "service" {
  provider        = google.host
  host_project    = var.host_project_id
  service_project = var.service_project_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}

# Create the VPC in the host project
resource "google_compute_network" "shared_vpc" {
  provider = google.host
  project  = var.host_project_id

  name                    = "shared-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "shared_subnet" {
  provider = google.host
  project  = var.host_project_id

  name          = "shared-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.shared_vpc.id
}

# GKE cluster in the service project using the shared VPC
resource "google_container_cluster" "app" {
  # Uses default provider (service project)
  name     = "app-cluster"
  location = "us-central1"

  network    = google_compute_network.shared_vpc.self_link
  subnetwork = google_compute_subnetwork.shared_subnet.self_link

  # Additional GKE config...
  initial_node_count = 3
}
```

## Passing Providers to Modules

Modules that manage resources in multiple projects need provider aliases passed to them:

```hcl
# Root module
provider "google" {
  project = var.app_project_id
  region  = "us-central1"
}

provider "google" {
  alias   = "monitoring"
  project = var.monitoring_project_id
  region  = "us-central1"
}

module "application" {
  source = "./modules/app"

  providers = {
    google            = google
    google.monitoring = google.monitoring
  }

  app_name = "my-service"
}
```

The module declares expected providers:

```hcl
# modules/app/providers.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
      configuration_aliases = [
        google.monitoring
      ]
    }
  }
}

# modules/app/main.tf

# App resources in the app project (default provider)
resource "google_cloud_run_v2_service" "app" {
  name     = var.app_name
  location = "us-central1"

  template {
    containers {
      image = "gcr.io/${var.app_name}/app:latest"
    }
  }
}

# Monitoring resources in the monitoring project
resource "google_monitoring_alert_policy" "app_errors" {
  provider     = google.monitoring
  display_name = "${var.app_name} Error Rate"

  conditions {
    display_name = "Error rate above threshold"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      duration        = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = []
  combiner              = "OR"
}
```

## Cross-Project Data Sources

Read data from one project and use it in another:

```hcl
# Look up a Cloud SQL instance in the database project
data "google_sql_database_instance" "shared_db" {
  provider = google.shared
  name     = "shared-postgres"
}

# Create a VPC peering from the app project to the database project
# (for private IP connectivity)
resource "google_compute_network_peering" "to_db" {
  name         = "app-to-db-peering"
  network      = google_compute_network.app_vpc.self_link
  peer_network = "projects/${var.shared_project_id}/global/networks/db-vpc"
}
```

## Authentication for Multi-Project

The service account or user running Terraform needs permissions in all target projects:

```bash
SA_EMAIL="terraform@${MAIN_PROJECT_ID}.iam.gserviceaccount.com"

# Grant access to each project
for PROJECT in "$PROD_PROJECT" "$STAGING_PROJECT" "$SHARED_PROJECT"; do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/editor"
done
```

For production, use granular roles instead of Editor:

```bash
# Production - full compute and networking
gcloud projects add-iam-policy-binding $PROD_PROJECT \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/compute.admin"

# Shared - only DNS management
gcloud projects add-iam-policy-binding $SHARED_PROJECT \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/dns.admin"

# Monitoring - only monitoring access
gcloud projects add-iam-policy-binding $MONITORING_PROJECT \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/monitoring.admin"
```

## Creating Projects with Terraform

You can even create GCP projects themselves with Terraform. This requires organization-level permissions:

```hcl
provider "google" {
  alias = "org"
  # No project specified - org-level operations
  region = "us-central1"
}

resource "google_project" "new_project" {
  provider = google.org

  name            = "New Application"
  project_id      = "new-app-${random_id.project.hex}"
  org_id          = var.organization_id
  billing_account = var.billing_account_id

  labels = {
    environment = "production"
    team        = "platform"
  }
}

resource "random_id" "project" {
  byte_length = 4
}

# Enable required APIs in the new project
resource "google_project_service" "compute" {
  provider = google.org
  project  = google_project.new_project.project_id
  service  = "compute.googleapis.com"
}

resource "google_project_service" "container" {
  provider = google.org
  project  = google_project.new_project.project_id
  service  = "container.googleapis.com"
}
```

## Organizing Multi-Project Code

For complex multi-project setups, organize your Terraform code by concern rather than by project:

```
infrastructure/
  modules/
    networking/       # VPCs, subnets, peering across projects
    compute/          # GKE clusters, VMs
    data/             # Cloud SQL, BigQuery, GCS
    monitoring/       # Alerting, dashboards
  environments/
    production/
      main.tf         # Composes modules with production project IDs
      providers.tf
      terraform.tfvars
    staging/
      main.tf
      providers.tf
      terraform.tfvars
```

## Summary

Managing multiple GCP projects in Terraform follows the same pattern as any multi-provider setup: define provider aliases with different project IDs, use the `provider` meta-argument on resources, and pass providers to modules with `configuration_aliases`. The key considerations specific to GCP are Shared VPC configurations, cross-project IAM bindings, and API enablement. Start with a clear project structure, grant the minimum required permissions per project, and keep your provider definitions organized.
