# How to Configure GKE Cluster Autoscaler with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Cluster Autoscaler, Kubernetes, OpenTofu, Autoscaling, Infrastructure

Description: Learn how to configure GKE Cluster Autoscaler with OpenTofu to automatically add or remove nodes based on pending pod scheduling requirements.

## Overview

GKE Cluster Autoscaler automatically adjusts the number of nodes in a node pool based on pod resource requests and scheduling constraints. It scales up when pods can't be scheduled due to resource constraints and scales down when nodes are underutilized.

## Step 1: Enable Cluster Autoscaler on Node Pool

```hcl
# main.tf - Node pool with autoscaling enabled

resource "google_container_node_pool" "autoscaling_pool" {
  name     = "autoscaling-pool"
  location = "us-central1"
  cluster  = google_container_cluster.cluster.name

  # Autoscaling configuration
  autoscaling {
    min_node_count  = 2   # Minimum nodes per zone (regional cluster)
    max_node_count  = 20  # Maximum nodes per zone
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = "n2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Step 2: Configure Cluster Autoscaler Profile

```hcl
# GKE cluster with autoscaler profile configuration
resource "google_container_cluster" "cluster" {
  name     = "autoscaling-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # Cluster autoscaler profile
  cluster_autoscaling {
    enabled = false  # Disable Node Auto Provisioning (we manage pools manually)

    # Autoscaler profile affects scale-down aggressiveness
    autoscaling_profile = "OPTIMIZE_UTILIZATION"  # vs "BALANCED"
  }
}
```

## Step 3: Node Auto Provisioning (NAP)

```hcl
# Node Auto Provisioning - let GKE create node pools automatically
resource "google_container_cluster" "nap_cluster" {
  name     = "nap-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  cluster_autoscaling {
    enabled = true  # Enable Node Auto Provisioning

    resource_limits {
      resource_type = "cpu"
      minimum       = 1
      maximum       = 100
    }

    resource_limits {
      resource_type = "memory"
      minimum       = 4
      maximum       = 400
    }

    # NAP node defaults
    auto_provisioning_defaults {
      oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]
      service_account = google_service_account.node_sa.email

      management {
        auto_repair  = true
        auto_upgrade = true
      }
    }
  }
}
```

## Step 4: Scale Down Configuration

```hcl
# Use a PodDisruptionBudget to limit voluntary evictions during scale-down
# The autoscaler respects PodDisruptionBudgets when removing nodes

# Example pod disruption budget to protect critical services
resource "kubernetes_pod_disruption_budget_v1" "app_pdb" {
  metadata {
    name      = "app-pdb"
    namespace = "production"
  }

  spec {
    min_available = "50%"  # Keep at least 50% of pods running during scale-down

    selector {
      match_labels = {
        app = "my-application"
      }
    }
  }
}
```

## Summary

GKE Cluster Autoscaler with OpenTofu dynamically adjusts node count based on pod scheduling needs. Configure min/max bounds per node pool, choose between BALANCED and OPTIMIZE_UTILIZATION profiles, and use PodDisruptionBudgets to help protect workloads during scale-down operations. Node Auto Provisioning extends this by automatically creating new node pools with appropriate machine types.
