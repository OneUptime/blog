# How to Create GKE Standard Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Kubernetes, GCP, OpenTofu, Container, Infrastructure

Description: Learn how to create production-ready GKE Standard clusters with OpenTofu including VPC-native networking, private nodes, and workload identity configuration.

## Overview

GKE Standard clusters give you full control over node configuration, machine types, and cluster settings. OpenTofu manages the complete cluster lifecycle including VPC-native networking, private nodes, and security hardening.

## Step 1: Create a VPC-Native GKE Cluster

```hcl
# main.tf - Production-ready GKE Standard cluster

resource "google_container_cluster" "primary" {
  name     = "production-gke-cluster"
  location = "us-central1"  # Regional cluster for HA

  # Remove default node pool - manage separately
  remove_default_node_pool = true
  initial_node_count       = 1

  # VPC-native (alias IP) networking
  networking_mode = "VPC_NATIVE"
  network         = google_compute_network.vpc.name
  subnetwork      = google_compute_subnetwork.gke_subnet.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Workload Identity for secure GCP API access from pods
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Private cluster - nodes have no external IPs
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false  # Keep master endpoint public for kubectl
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Authorized networks for master API endpoint
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "203.0.113.0/24"
      display_name = "Corporate VPN"
    }
  }

  # Binary Authorization for image security
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Enable logging and monitoring
  logging_service    = "logging.googleapis.com/kubernetes"
  monitoring_service = "monitoring.googleapis.com/kubernetes"

  # Release channel for managed upgrades
  release_channel {
    channel = "REGULAR"
  }
}
```

## Step 2: Create a Node Pool

```hcl
# Separate node pool with auto-repair and auto-upgrade
resource "google_container_node_pool" "primary_nodes" {
  name       = "primary-node-pool"
  location   = "us-central1"
  cluster    = google_container_cluster.primary.name
  initial_node_count = 1  # Per zone for regional cluster (3 zones = 3 nodes initially)

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }

  node_config {
    preemptible  = false
    machine_type = "n2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    # Workload Identity on nodes
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Shielded nodes
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    labels = {
      env  = "production"
      team = "platform"
    }
  }
}
```

## Step 3: Outputs

```hcl
output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "cluster_ca_certificate" {
  value     = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
  sensitive = true
}
```

## Summary

GKE Standard clusters with OpenTofu provide fully customizable Kubernetes clusters. Private nodes, workload identity, VPC-native networking, and shielded VMs form a security baseline. Use regional clusters for HA and release channels for automated Kubernetes version management.
