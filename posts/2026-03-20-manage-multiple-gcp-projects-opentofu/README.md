# How to Manage Multiple GCP Projects with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Multiple Projects, Provider Aliases, Infrastructure as Code, Google Cloud

Description: Learn how to configure OpenTofu to deploy resources across multiple GCP projects using provider aliases, enabling a hub-and-spoke or multi-environment GCP architecture.

## Introduction

GCP uses projects as the fundamental isolation boundary. Large organizations maintain separate projects for each environment, team, or application domain. OpenTofu manages this through multiple `google` provider aliases, each targeting a different project.

## Multiple Provider Configuration

```hcl
# versions.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

# Default provider - production project
provider "google" {
  project = var.prod_project_id
  region  = "us-central1"
}

# Dev project alias
provider "google" {
  alias   = "dev"
  project = var.dev_project_id
  region  = "us-central1"
}

# Shared VPC host project alias
provider "google" {
  alias   = "shared_vpc"
  project = var.shared_vpc_project_id
  region  = "us-central1"
}
```

## Deploying Resources to Specific Projects

```hcl
# Deploy to the production project (default provider)
resource "google_compute_network" "prod_vpc" {
  name                    = "prod-vpc"
  auto_create_subnetworks = false
}

# Deploy to the dev project
resource "google_compute_network" "dev_vpc" {
  provider                = google.dev
  name                    = "dev-vpc"
  auto_create_subnetworks = false
}

# Deploy to the shared VPC host project
resource "google_compute_network" "shared_vpc" {
  provider                = google.shared_vpc
  name                    = "shared-vpc"
  auto_create_subnetworks = false
}
```

## Using Shared VPC

```hcl
# Enable Shared VPC in the host project
resource "google_compute_shared_vpc_host_project" "host" {
  provider = google.shared_vpc
  project  = var.shared_vpc_project_id
}

# Attach service projects to the host
resource "google_compute_shared_vpc_service_project" "prod" {
  provider        = google.shared_vpc
  host_project    = var.shared_vpc_project_id
  service_project = var.prod_project_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}
```

## Authentication

```bash
# Application Default Credentials (recommended locally)
gcloud auth application-default login

# Service account key or external credential configuration file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"

# Workload Identity Federation for GKE (preferred for GKE)
# No explicit credential file needed - ADC uses the GKE metadata server

# For GitHub Actions
# Use Workload Identity Federation instead of service account keys
```

## Per-Project State Backends

```hcl
# Each project gets its own state path in a central GCS bucket
terraform {
  backend "gcs" {
    bucket = "my-opentofu-state-central"
    prefix = "projects/prod/networking"
  }
}
```

## Passing Providers to Modules

```hcl
module "prod_gke" {
  source = "./modules/gke"
  providers = {
    google = google      # Production project
  }
  cluster_name = "prod-gke"
}

module "dev_gke" {
  source = "./modules/gke"
  providers = {
    google = google.dev  # Dev project
  }
  cluster_name = "dev-gke"
}
```

## Conclusion

Managing multiple GCP projects in OpenTofu uses the same pattern as other cloud providers: multiple provider blocks with aliases, each configured with a different project ID. For cross-project connectivity, use Shared VPC resources and pass provider aliases to modules through the `providers` meta-argument. Centralize state in a single GCS bucket with per-project prefixes for consistent state management.
