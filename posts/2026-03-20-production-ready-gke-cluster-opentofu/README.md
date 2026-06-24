# How to Build a Production-Ready GKE Cluster on GCP with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GKE, Google Kubernetes Engine, Production, Kubernetes, Infrastructure as Code

Description: Learn how to build a production-ready GKE cluster on GCP with OpenTofu, including private cluster configuration, Workload Identity, node auto-provisioning, and Binary Authorization.

## Introduction

A production-ready GKE cluster should be private (no public node IPs), use Workload Identity Federation for GKE for pod-level Google Cloud authentication, have node auto-provisioning, and enable security features like Binary Authorization and Shielded GKE Nodes. This guide configures the cluster-side pieces for these features with OpenTofu.

## VPC for GKE

```hcl
resource "google_compute_network" "gke" {
  name                    = "gke-${var.environment}-network"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "gke" {
  name          = "gke-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.gke.id
  project       = var.project_id

  # Secondary ranges for pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}
```

## GKE Cluster

```hcl
resource "google_container_cluster" "main" {
  name     = "gke-${var.environment}-cluster"
  location = var.region
  project  = var.project_id

  # Remove default node pool, create managed ones below
  remove_default_node_pool = true
  initial_node_count       = 1

  # Private cluster (no public node IPs)
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false  # keep control plane accessible
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  network    = google_compute_network.gke.id
  subnetwork = google_compute_subnetwork.gke.id

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Workload Identity Federation for GKE
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Security features
  enable_shielded_nodes = true

  binary_authorization {
    # This enables cluster-side enforcement; configure the project policy separately.
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  release_channel {
    channel = "REGULAR"  # automatic patch and minor version upgrades
  }

  # Monitoring
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "APISERVER", "SCHEDULER"]
  }

  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  addons_config {
    network_policy_config {
      disabled = false
    }
  }

  # Network policy
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  # Cluster autoscaling with node auto-provisioning
  cluster_autoscaling {
    enabled             = true
    autoscaling_profile = "OPTIMIZE_UTILIZATION"

    resource_limits {
      resource_type = "cpu"
      minimum       = 4
      maximum       = 100
    }

    resource_limits {
      resource_type = "memory"
      minimum       = 16
      maximum       = 400
    }

    auto_provisioning_defaults {
      oauth_scopes = [
        "https://www.googleapis.com/auth/cloud-platform"
      ]

      service_account = google_service_account.gke_nodes.email

      shielded_instance_config {
        enable_secure_boot          = true
        enable_integrity_monitoring = true
      }
    }
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [initial_node_count]
  }
}
```

## System Node Pool

```hcl
resource "google_container_node_pool" "system" {
  name     = "system"
  cluster  = google_container_cluster.main.name
  location = var.region
  project  = var.project_id

  initial_node_count = 1

  autoscaling {
    min_node_count = 2
    max_node_count = 5
  }

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config {
      mode = "GKE_METADATA"  # enables Workload Identity Federation for GKE
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      "node-type" = "system"
    }

    taint {
      key    = "CriticalAddonsOnly"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
  }

  lifecycle {
    ignore_changes = [initial_node_count]
  }
}
```

## Node Service Account

```hcl
resource "google_service_account" "gke_nodes" {
  account_id   = "gke-${var.environment}-nodes"
  display_name = "GKE Node Pool Service Account"
  project      = var.project_id
}

# Minimum role required for GKE node service accounts

resource "google_project_iam_member" "gke_nodes_default_role" {
  project = var.project_id
  role    = "roles/container.defaultNodeServiceAccount"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```

## Summary

A production-ready GKE cluster uses private nodes (no public IPs), Workload Identity Federation for GKE for pod-level Google Cloud authentication, Calico network policies, Binary Authorization enforcement with a project policy configured for actual image admission control, Shielded GKE Nodes with secure boot and integrity monitoring, and the REGULAR release channel for automatic patch and minor version upgrades. A dedicated system node pool with a taint keeps regular application workloads off those nodes, while node auto-provisioning can create additional pools for pending workloads.
