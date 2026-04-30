# How to Deploy Cloud Run Services with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Google Cloud, Infrastructure as Code, IaC, Cloud Run, Serverless Containers

Description: Learn how to deploy Google Cloud Run services with traffic splitting, concurrency settings, and IAM access using OpenTofu.

## Introduction

This guide covers how to deploy a Cloud Run service on GCP using OpenTofu with Cloud Run v2, configurable traffic targets, concurrency settings, and IAM access controls.

## Prerequisites

- OpenTofu v1.6+
- Google Cloud SDK installed and authenticated
- GCP project with billing enabled
- Service Usage API enabled in the project so OpenTofu can manage project services

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

## Step 2: Define Variables

```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "hello-cloud-run"
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "container_concurrency" {
  description = "Maximum concurrent requests per instance"
  type        = number
  default     = 80

  validation {
    condition     = var.container_concurrency >= 1 && var.container_concurrency <= 1000
    error_message = "container_concurrency must be between 1 and 1000."
  }
}

variable "invoker_member" {
  description = "IAM principal that can invoke the Cloud Run service"
  type        = string
  default     = "allUsers"
}

variable "traffic_targets" {
  description = "Traffic targets for the Cloud Run service."
  type = list(object({
    type     = string
    percent  = number
    revision = optional(string)
    tag      = optional(string)
  }))
  default = [
    {
      type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
      percent = 100
    }
  ]

  validation {
    condition = alltrue([
      for target in var.traffic_targets :
      contains(
        [
          "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
          "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
        ],
        target.type
      ) &&
      target.percent >= 0 &&
      target.percent <= 100 &&
      floor(target.percent) == target.percent &&
      (
        target.type != "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION" ||
        try(target.revision, null) != null
      )
    ]) && length(var.traffic_targets) > 0 && sum([for target in var.traffic_targets : target.percent]) == 100
    error_message = "traffic_targets must use valid Cloud Run traffic target types and total 100 percent."
  }
}
```

## Step 3: Enable Required APIs

```hcl
# Enable required GCP service APIs

resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}
```

## Step 4: Create Primary Resource

```hcl
# Service account for the Cloud Run revision
resource "google_service_account" "main" {
  account_id   = "sa-${var.environment}"
  display_name = "Cloud Run Service Account for ${var.environment}"
  project      = var.project_id

  depends_on = [google_project_service.required_apis]
}

resource "google_cloud_run_v2_service" "main" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  labels = {
    environment = var.environment
  }

  template {
    service_account                  = google_service_account.main.email
    max_instance_request_concurrency = var.container_concurrency

    containers {
      image = var.container_image
    }
  }

  dynamic "traffic" {
    for_each = var.traffic_targets
    content {
      type     = traffic.value.type
      percent  = traffic.value.percent
      revision = try(traffic.value.revision, null)
      tag      = try(traffic.value.tag, null)
    }
  }

  depends_on = [google_project_service.required_apis]
}
```

## Step 5: Configure IAM Access

```hcl
# Grant invoke access to the Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "invoker" {
  project  = google_cloud_run_v2_service.main.project
  location = google_cloud_run_v2_service.main.location
  name     = google_cloud_run_v2_service.main.name
  role     = "roles/run.invoker"
  member   = var.invoker_member
}
```

## Step 6: Define Outputs

```hcl
output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.main.email
}

output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.main.uri
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}
```

## Step 7: Deploy

```bash
# Authenticate with GCP
gcloud auth application-default login

# Initialize OpenTofu
tofu init

# Preview changes
tofu plan -var="project_id=your-project-id"

# Apply configuration
tofu apply -var="project_id=your-project-id"

# Example: split traffic after the first deployment has created a revision
tofu apply -var="project_id=your-project-id" -var='traffic_targets=[{type="TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",revision="hello-cloud-run-00001-abc",percent=50},{type="TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",percent=50}]'
```

## Best Practices

- Enable only the APIs required for your Cloud Run deployment
- Use service accounts with least-privilege IAM roles
- Grant `roles/run.invoker` only to the principals that need to call the service
- Use labels consistently for cost allocation and resource management
- Store state in a GCS bucket with versioning enabled

## Conclusion

You have successfully configured How to Deploy Cloud Run Services with OpenTofu on GCP using OpenTofu. This configuration follows GCP best practices for security and resource management. Use IAM conditions where you need fine-grained access control, and remember that traffic splitting between revisions requires at least one existing Cloud Run revision.
