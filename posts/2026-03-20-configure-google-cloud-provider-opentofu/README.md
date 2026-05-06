# How to Configure the Google Cloud Provider in OpenTofu - Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Google Cloud, Infrastructure as Code, IaC, Provider Configuration

Description: Learn how to configure the Google Cloud provider in OpenTofu with project settings, credentials, and default resource configurations.

## Introduction

The Google Cloud provider enables OpenTofu to manage GCP resources. This guide covers provider configuration, authentication options, and project setup for Google Cloud deployments.

## Prerequisites

- OpenTofu v1.6+
- Google Cloud SDK installed
- A GCP project with billing enabled

## Step 1: Basic Provider Configuration

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
```

## Step 2: Multiple Providers for Multi-Region

```hcl
provider "google" {
  project = var.project_id
  region  = "us-central1"
  alias   = "us_central"
}

provider "google" {
  project = var.project_id
  region  = "europe-west1"
  alias   = "europe"
}

# Use specific region providers with a regional resource

resource "google_compute_network" "shared" {
  provider                = google.us_central
  name                    = "multi-region-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_router" "router_us" {
  provider = google.us_central
  name     = "router-us"
  network  = google_compute_network.shared.name

  bgp {
    asn = 64514
  }
}

resource "google_compute_router" "router_eu" {
  provider = google.europe
  name     = "router-eu"
  network  = google_compute_network.shared.name

  bgp {
    asn = 64515
  }
}
```

## Step 3: Define Variables

```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Default GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Default GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment label"
  type        = string
  default     = "dev"
}

variable "team" {
  description = "Team label"
  type        = string
  default     = "platform"
}
```

## Step 4: Enable Required APIs

```hcl
# The Service Usage API must already be enabled in the project.
# Enable required Google Cloud APIs
resource "google_project_service" "compute" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "container" {
  project            = var.project_id
  service            = "container.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  project            = var.project_id
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}
```

## Step 5: Set Default Labels

```hcl
provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = {
    managed_by  = "opentofu"
    environment = var.environment
    team        = var.team
  }
}
```

## Step 6: Deploy

```bash
# Authenticate with gcloud
gcloud auth application-default login

tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully configured the Google Cloud provider in OpenTofu with multi-region support, default labels, and API enablement. Enable only the GCP APIs you need to reduce the attack surface. Use a separate `google-beta` provider block and set `provider = google-beta` on resources that need beta-only features.
