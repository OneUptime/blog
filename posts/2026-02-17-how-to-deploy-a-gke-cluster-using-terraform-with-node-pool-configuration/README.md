# How to Deploy a GKE Cluster Using Terraform with Node Pool Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, GKE, Kubernetes, Node Pools, Infrastructure as Code

Description: Learn how to deploy a Google Kubernetes Engine cluster using Terraform with properly configured node pools, autoscaling, networking, and security settings.

---

Deploying a GKE cluster through the Cloud Console is fine for experimentation, but for production you want it in code. Terraform gives you repeatable, version-controlled GKE deployments that you can review, test, and roll back.

GKE clusters have a lot of configuration options, and getting them right matters. A misconfigured cluster can be insecure, expensive, or both. This guide walks through deploying a production-ready GKE cluster with Terraform, focusing on the decisions that actually matter.

## Prerequisites

Before starting, make sure you have:

- Terraform 1.5 or later installed
- The Google Cloud Terraform provider configured
- The Kubernetes Engine API enabled in your project
- A service account with at least the Kubernetes Engine Admin role

Enable the required APIs:

```bash
# Enable the APIs needed for GKE
gcloud services enable container.googleapis.com compute.googleapis.com
```

## Creating the VPC Network

GKE clusters need a VPC network. While you can use the default network, creating a dedicated VPC is better practice:

```hcl
# network.tf - VPC and subnet for the GKE cluster
resource "google_compute_network" "gke_vpc" {
  name                    = "gke-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "gke_subnet" {
  name          = "gke-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
  network       = google_compute_network.gke_vpc.id
  project       = var.project_id

  # Secondary ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }
}
```

The secondary IP ranges are used by GKE for pod and service IPs. Size them according to your expected workload - the pod range especially needs to be large enough for your maximum number of pods.

## Deploying the GKE Cluster

Here is the cluster configuration:

```hcl
# cluster.tf - GKE cluster configuration
resource "google_container_cluster" "primary" {
  name     = "primary-cluster"
  location = var.region
  project  = var.project_id

  # Use a separately managed node pool - remove the default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  # Network configuration
  network    = google_compute_network.gke_vpc.id
  subnetwork = google_compute_subnetwork.gke_subnet.id

  # Use VPC-native (alias IP) networking
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Enable Workload Identity for secure pod-to-GCP-service authentication
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Private cluster configuration - nodes do not get public IPs
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Control plane authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.authorized_network_cidr
      display_name = "Authorized network"
    }
  }

  # Release channel for automatic upgrades
  release_channel {
    channel = "REGULAR"
  }

  # Enable network policy enforcement
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  # Logging and monitoring configuration
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Maintenance window - schedule upgrades during low-traffic hours
  maintenance_policy {
    recurring_window {
      start_time = "2026-01-01T04:00:00Z"
      end_time   = "2026-01-01T08:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SA,SU"
    }
  }

  # Binary authorization for container image verification
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }
}
```

The key decisions here are:

- **remove_default_node_pool**: Always manage node pools separately. The default node pool cannot be customized enough for production use.
- **private_cluster_config**: Keeps nodes off the public internet. Essential for security.
- **workload_identity_config**: The recommended way for pods to authenticate with GCP services.
- **release_channel**: Automatic upgrades keep your cluster patched.

## Configuring Node Pools

Node pools are where you define the actual compute capacity of your cluster. Most clusters need at least two pools - one for system workloads and one for application workloads:

```hcl
# node_pools.tf - Node pool configurations

# System node pool for kube-system and monitoring workloads
resource "google_container_node_pool" "system" {
  name     = "system-pool"
  location = var.region
  cluster  = google_container_cluster.primary.id
  project  = var.project_id

  # Autoscaling configuration
  autoscaling {
    min_node_count = 1
    max_node_count = 3
  }

  # Node configuration
  node_config {
    machine_type = "e2-standard-2"
    disk_size_gb = 50
    disk_type    = "pd-balanced"

    # Use a custom service account instead of the default compute SA
    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    # Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Shielded instance configuration
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # Labels for node selection
    labels = {
      pool = "system"
    }

    # Taint to keep application pods off system nodes
    taint {
      key    = "dedicated"
      value  = "system"
      effect = "NO_SCHEDULE"
    }
  }

  # Node management
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  # Upgrade settings for zero-downtime upgrades
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }
}

# Application node pool for user workloads
resource "google_container_node_pool" "application" {
  name     = "application-pool"
  location = var.region
  cluster  = google_container_cluster.primary.id
  project  = var.project_id

  autoscaling {
    min_node_count = 2
    max_node_count = 10
  }

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      pool = "application"
    }

    # Resource labels for cost tracking
    resource_labels = {
      team        = "platform"
      environment = var.environment
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }
}
```

## Service Account for Node Pools

Do not use the default compute service account. Create a dedicated one with minimal permissions:

```hcl
# service_account.tf - Dedicated service account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "gke-node-sa"
  display_name = "GKE Node Service Account"
  project      = var.project_id
}

# Grant only the permissions nodes actually need
resource "google_project_iam_member" "gke_node_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```

## Variables and Outputs

```hcl
# variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the cluster"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "authorized_network_cidr" {
  description = "CIDR block allowed to access the cluster control plane"
  type        = string
  default     = "0.0.0.0/0"
}
```

```hcl
# outputs.tf
output "cluster_name" {
  description = "Name of the GKE cluster"
  value       = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  description = "Endpoint for the GKE cluster control plane"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "CA certificate for the cluster"
  value       = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive   = true
}
```

## Connecting kubectl After Deployment

After Terraform creates the cluster, configure kubectl:

```bash
# Get credentials for the cluster
gcloud container clusters get-credentials primary-cluster \
  --region us-central1 \
  --project my-gcp-project

# Verify the connection
kubectl get nodes
```

## Adding a Spot Instance Node Pool

For cost savings on fault-tolerant workloads, add a spot instance pool:

```hcl
# Spot instance node pool for batch and non-critical workloads
resource "google_container_node_pool" "spot" {
  name     = "spot-pool"
  location = var.region
  cluster  = google_container_cluster.primary.id
  project  = var.project_id

  autoscaling {
    min_node_count = 0
    max_node_count = 20
  }

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 50
    spot         = true

    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    labels = {
      pool = "spot"
    }

    # Taint spot nodes so only tolerant workloads schedule here
    taint {
      key    = "cloud.google.com/gke-spot"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
```

## Best Practices

1. **Always remove the default node pool** and manage node pools separately. This gives you full control over node configuration.
2. **Use private clusters.** Nodes should not have public IP addresses.
3. **Enable Workload Identity.** It is the most secure way for pods to access GCP services.
4. **Set up autoscaling** on every node pool. Fixed-size pools waste money during low traffic and cannot handle spikes.
5. **Use separate node pools** for different workload types - system, application, and spot.
6. **Enable auto-repair and auto-upgrade** on all node pools.
7. **Set maintenance windows** to control when upgrades happen.

## Wrapping Up

Deploying GKE with Terraform gives you a repeatable, auditable cluster setup that you can confidently run across environments. The configuration above covers the core decisions - networking, node pools, security, and autoscaling - that make the difference between a cluster that works in development and one that is ready for production traffic. Start with this foundation and customize based on your workload requirements.
