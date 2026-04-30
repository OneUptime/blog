# How to Configure GKE Node Pools with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Node Pool, Kubernetes, OpenTofu, GCP, Infrastructure

Description: Learn how to configure GKE node pools with OpenTofu for workload isolation, GPU support, spot instances, and autoscaling across different machine types.

## Overview

GKE Node Pools allow you to run different VM types within a single cluster. You can have separate pools for general workloads, memory-intensive applications, GPU workloads, and cost-optimized spot instances. OpenTofu manages multiple pools with different configurations.

## Step 1: General Purpose Node Pool

```hcl
# main.tf - General purpose node pool

resource "google_container_node_pool" "general_pool" {
  name     = "general-pool"
  location = "us-central1"
  cluster  = google_container_cluster.primary.name

  autoscaling {
    min_node_count = 2
    max_node_count = 20
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = "n2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    # Requires Workload Identity enabled on the cluster
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      pool = "general"
    }

    # No taints - accepts all pods by default

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Step 2: Memory-Optimized Pool for Databases

```hcl
# High-memory node pool for stateful workloads
resource "google_container_node_pool" "memory_pool" {
  name     = "memory-pool"
  location = "us-central1"
  cluster  = google_container_cluster.primary.name

  autoscaling {
    min_node_count = 1
    max_node_count = 5
  }

  node_config {
    machine_type = "n2-highmem-8"  # High memory optimized
    disk_size_gb = 200
    disk_type    = "pd-ssd"

    labels = {
      pool        = "memory"
      workload    = "database"
    }

    # Taint to prevent regular pods from scheduling here
    taint {
      key    = "workload"
      value  = "memory-intensive"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Step 3: Spot Pool for Batch Workloads

```hcl
# Cost-optimized Spot node pool for batch jobs
resource "google_container_node_pool" "spot_pool" {
  name     = "spot-pool"
  location = "us-central1"
  cluster  = google_container_cluster.primary.name

  autoscaling {
    min_node_count = 0  # Scale to zero when not needed
    max_node_count = 50
  }

  node_config {
    machine_type = "n2-standard-4"
    spot         = true  # Use Spot VMs for cost savings

    labels = {
      pool = "spot"
    }

    taint {
      key    = "cloud.google.com/gke-spot"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Step 4: GPU Node Pool for ML Workloads

```hcl
# GPU node pool for machine learning inference
resource "google_container_node_pool" "gpu_pool" {
  name     = "gpu-pool"
  location = "us-central1"
  cluster  = google_container_cluster.primary.name
  node_locations = ["us-central1-a"]  # GPU availability varies by zone

  autoscaling {
    min_node_count = 0
    max_node_count = 5
  }

  node_config {
    machine_type = "n1-standard-8"

    guest_accelerator {
      type  = "nvidia-tesla-t4"
      count = 1
      gpu_driver_installation_config {
        gpu_driver_version = "LATEST"
      }
    }

    labels = {
      accelerator = "nvidia-tesla-t4"
    }

    taint {
      key    = "nvidia.com/gpu"
      value  = "present"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Summary

GKE Node Pools with OpenTofu enable workload isolation through node labels, taints, and machine type specialization. Separate pools for general, memory-intensive, spot, and GPU workloads let you right-size compute for each workload type while maintaining cost efficiency through pool-level autoscaling.
