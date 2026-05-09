# How to Configure the Google Cloud Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Provider Configuration, Infrastructure as Code, Google Cloud

Description: Learn how to configure the Google Cloud provider in OpenTofu with project settings, credentials, and regional defaults for managing GCP resources.

## Introduction

The Google Cloud provider (hashicorp/google) enables OpenTofu to manage GCP resources. Configuration covers project selection, region/zone defaults, and authentication, which can use service account keys, Workload Identity Federation, or Application Default Credentials.

## Minimal Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
  required_version = ">= 1.6.0"
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
```

## Authentication Methods

The provider prefers credentials set directly in the provider configuration or via the `GOOGLE_CREDENTIALS`, `GOOGLE_CLOUD_KEYFILE_JSON`, or `GCLOUD_KEYFILE_JSON` environment variables. If none of those are set, it falls back to Application Default Credentials, such as a file referenced by `GOOGLE_APPLICATION_CREDENTIALS`, credentials created by `gcloud auth application-default login`, or the metadata server on Google Cloud.

For CI/CD, one common option is to point Application Default Credentials at a service account key file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GOOGLE_PROJECT="my-project-id"
```

## Full Production Configuration

```hcl
terraform {
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

  default_labels = {
    managed_by  = "opentofu"
    environment = var.environment
    team        = var.team
  }
}

# Beta resources require the google-beta provider and `provider = google-beta` on the resource.

provider "google-beta" {
  project = var.project_id
  region  = var.region

  default_labels = {
    managed_by  = "opentofu"
    environment = var.environment
    team        = var.team
  }
}
```

## Variables

```hcl
variable "project_id"  { type = string }
variable "project_a_id" { type = string }
variable "project_b_id" { type = string }
variable "region"      { type = string; default = "us-central1" }
variable "zone"        { type = string; default = "us-central1-a" }
variable "environment" { type = string }
variable "team"        { type = string }
```

## Multi-Project Setup

```hcl
provider "google" {
  alias   = "project_a"
  project = var.project_a_id
  region  = "us-central1"
}

provider "google" {
  alias   = "project_b"
  project = var.project_b_id
  region  = "europe-west1"
}

resource "google_storage_bucket" "logs" {
  provider = google.project_a
  name     = "logs-${var.project_a_id}"
  location = "US"
}
```

## Conclusion

The GCP provider's `default_labels` block helps keep labelling consistent on resources that support labels without repeating label blocks. If you also use `google-beta`, configure the same defaults there separately. Always pin your provider version in the `required_providers` block and commit the `.terraform.lock.hcl` file to lock exact provider versions for your team.
