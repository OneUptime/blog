# How to Deploy a GKE Cluster with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, GKE, Kubernetes, Infrastructure as Code

Description: Learn how to deploy a Google Kubernetes Engine (GKE) cluster with OpenTofu including VPC-native networking, node pools, Workload Identity, and private cluster configuration.

## Introduction

Google Kubernetes Engine (GKE) is GCP's managed Kubernetes service. OpenTofu deploys GKE clusters with VPC-native networking, private nodes, node auto-provisioning, and Workload Identity for secure pod-level GCP access.

## Provider Configuration

```hcl
# versions.tf

terraform {
  required_version = ">= 1.6.0"
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
```

## GKE Cluster

```hcl
# cluster.tf
resource "google_container_cluster" "main" {
  name     = "${var.name}-${var.environment}"
  location = var.region  # Regional cluster for HA

  # Remove default node pool; use separately managed node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.nodes.name

  # VPC-native (alias IP) networking
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Private cluster - nodes have no public IPs
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false  # Keep public endpoint for kubectl
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.admin_cidr
      display_name = "Admin access"
    }
  }

  # Enable control plane logging
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
  }

  release_channel {
    channel = "REGULAR"
  }

  deletion_protection = false
}
```

## Node Pool

```hcl
# nodepool.tf
resource "google_container_node_pool" "general" {
  name       = "general"
  cluster    = google_container_cluster.main.name
  location   = var.region
  node_count = var.node_count

  autoscaling {
    min_node_count = var.min_node_count
    max_node_count = var.max_node_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.machine_type
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    # Enable Workload Identity on nodes
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    labels = {
      environment = var.environment
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}
```

## GKE Node Service Account

```hcl
# iam.tf
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.name}-gke-nodes"
  display_name = "GKE Node Service Account"
}

# Minimum permissions for GKE nodes
resource "google_project_iam_member" "gke_nodes" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/artifactregistry.reader",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```

## Outputs

```hcl
# outputs.tf
output "cluster_name"     { value = google_container_cluster.main.name }
output "cluster_endpoint" { value = google_container_cluster.main.endpoint }
output "region"           { value = var.region }
output "cluster_ca_cert"  {
  value     = google_container_cluster.main.master_auth[0].cluster_ca_certificate
  sensitive = true
}
```

## Configure kubectl

```bash
# Get kubeconfig for the new cluster
gcloud container clusters get-credentials \
  $(tofu output -raw cluster_name) \
  --region $(tofu output -raw region) \
  --project YOUR_PROJECT_ID

# Verify connectivity
kubectl get nodes
```

## Conclusion

GKE with VPC-native networking, private nodes, and Workload Identity is the recommended production configuration. Remove the default node pool and manage node pools separately for more control. Enable the REGULAR release channel for automatic patch upgrades. Use Workload Identity instead of node-level service accounts to grant pods access to GCP services with minimal permissions.
