# How to Deploy a GKE Cluster with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Google Cloud, Infrastructure as Code, IaC, GKE, Kubernetes

Description: Learn how to deploy a production-ready Google Kubernetes Engine cluster with node pools, workload identity, and monitoring using OpenTofu.

## Introduction

This guide covers how to deploy a GKE Standard cluster with OpenTofu using production-ready configurations for networking, node pools, workload identity, and monitoring.

## Prerequisites

- OpenTofu v1.6+
- Google Cloud SDK installed and authenticated
- GCP project with billing enabled

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
variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "prod-gke-cluster"
}

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

variable "network_name" {
  description = "VPC network name"
  type        = string
  default     = "gke-vpc"
}

variable "subnetwork_name" {
  description = "Subnetwork name"
  type        = string
  default     = "gke-subnet"
}

variable "subnet_cidr" {
  description = "Primary CIDR range for the GKE subnet"
  type        = string
  default     = "10.10.0.0/20"
}

variable "pods_range_name" {
  description = "Secondary range name for Pods"
  type        = string
  default     = "gke-pods"
}

variable "pods_cidr" {
  description = "Secondary CIDR range for Pods"
  type        = string
  default     = "10.20.0.0/16"
}

variable "services_range_name" {
  description = "Secondary range name for Services"
  type        = string
  default     = "gke-services"
}

variable "services_cidr" {
  description = "Secondary CIDR range for Services"
  type        = string
  default     = "10.30.0.0/20"
}

variable "node_machine_type" {
  description = "Machine type for the GKE node pool"
  type        = string
  default     = "e2-standard-4"
}

variable "node_count" {
  description = "Number of nodes per zone in the primary node pool"
  type        = number
  default     = 1
}
```

## Step 3: Enable Required APIs

```hcl
# Enable required GCP service APIs

resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "serviceusage.googleapis.com"
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}
```

## Step 4: Create Primary Resource

```hcl
# Custom VPC for the GKE cluster
resource "google_compute_network" "gke" {
  name                    = var.network_name
  auto_create_subnetworks = false
  project      = var.project_id

  depends_on = [google_project_service.required_apis]
}

# Subnetwork with secondary ranges for Pods and Services
resource "google_compute_subnetwork" "gke" {
  name          = var.subnetwork_name
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.gke.id
  project       = var.project_id

  secondary_ip_range {
    range_name    = var.pods_range_name
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = var.services_range_name
    ip_cidr_range = var.services_cidr
  }
}

# Custom node service account
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.environment}-gke-nodes"
  display_name = "GKE nodes for ${var.environment}"
  project      = var.project_id

  depends_on = [google_project_service.required_apis]
}

# Minimum role required for GKE node service accounts
resource "google_project_iam_member" "gke_nodes" {
  project = var.project_id
  role    = "roles/container.defaultNodeServiceAccount"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Regional GKE Standard cluster with Workload Identity Federation for GKE
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  network    = google_compute_network.gke.id
  subnetwork = google_compute_subnetwork.gke.id

  networking_mode          = "VPC_NATIVE"
  remove_default_node_pool = true
  initial_node_count       = 1
  deletion_protection      = false

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"
  }

  resource_labels = {
    environment = var.environment
  }

  depends_on = [google_project_service.required_apis]
}

# Separately managed node pool
resource "google_container_node_pool" "primary" {
  name       = "${var.cluster_name}-primary"
  project    = var.project_id
  location   = var.region
  cluster    = google_container_cluster.primary.id
  node_count = var.node_count

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type    = var.node_machine_type
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      environment = var.environment
    }
  }

  depends_on = [google_project_iam_member.gke_nodes]
}
```

## Step 5: Configure Monitoring

```hcl
# Add these settings inside google_container_cluster.primary
logging_service    = "logging.googleapis.com/kubernetes"
monitoring_service = "monitoring.googleapis.com/kubernetes"

logging_config {
  enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
}

monitoring_config {
  enable_components = [
    "SYSTEM_COMPONENTS",
    "APISERVER",
    "SCHEDULER",
    "CONTROLLER_MANAGER",
    "POD",
    "DEPLOYMENT",
    "STATEFULSET",
    "DAEMONSET",
    "HPA",
    "STORAGE",
  ]

  managed_prometheus {
    enabled = true
  }
}
```

## Step 6: Define Outputs

```hcl
output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "cluster_location" {
  description = "GKE cluster region"
  value       = google_container_cluster.primary.location
}

output "cluster_endpoint" {
  description = "GKE control plane endpoint"
  value       = google_container_cluster.primary.endpoint
}

output "node_service_account_email" {
  description = "Node service account email"
  value       = google_service_account.gke_nodes.email
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}
```

## Step 7: Deploy

```bash
# Configure Application Default Credentials for the provider
gcloud auth application-default login

# Bootstrap API management for a new project
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com \
  --project=your-project-id

# Initialize OpenTofu
tofu init

# Preview changes
tofu plan -var="project_id=your-project-id"

# Apply configuration
tofu apply -var="project_id=your-project-id"

# Configure kubectl for the new cluster
gcloud container clusters get-credentials prod-gke-cluster --location=us-central1 --project=your-project-id
```

## Best Practices

- Enable only required GCP APIs to minimize attack surface
- Use service accounts with least-privilege IAM roles
- Enable audit logging for all GCP resources
- Use labels consistently for cost allocation and resource management
- Store state in a GCS bucket with versioning enabled

## Conclusion

You have successfully configured a GKE Standard cluster with a custom node pool, Workload Identity Federation for GKE, and GKE-managed monitoring using OpenTofu. This configuration follows GCP best practices for security, monitoring, and resource management. Always use IAM conditions for fine-grained access control and enable Cloud Audit Logs for compliance and security investigation.
