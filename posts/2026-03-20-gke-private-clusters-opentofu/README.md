# How to Set Up GKE Private Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Private Cluster, Kubernetes, OpenTofu, GCP, Security

Description: Learn how to create GKE private clusters with OpenTofu where nodes have no public IPs, providing enhanced security for production Kubernetes workloads.

## Overview

GKE Private Clusters assign only internal IP addresses to nodes, preventing direct access from the public internet to your Kubernetes nodes. The control plane communicates with nodes over a VPC peering connection. OpenTofu manages the VPC setup, firewall rules, and cluster configuration.

## Step 1: Create VPC with Required Subnets

```hcl
# main.tf - VPC for GKE private cluster

resource "google_compute_network" "vpc" {
  name                    = "gke-private-vpc"
  auto_create_subnetworks = false
}

# Subnet with secondary ranges for pods and services
resource "google_compute_subnetwork" "gke_subnet" {
  name                     = "gke-private-subnet"
  network                  = google_compute_network.vpc.self_link
  region                   = "us-central1"
  ip_cidr_range            = "10.0.0.0/22"
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.0.16.0/20"
  }
}
```

## Step 2: Create Private GKE Cluster

```hcl
# Private GKE cluster - no external IPs on nodes
resource "google_container_cluster" "private_cluster" {
  name     = "private-gke-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network         = google_compute_network.vpc.name
  subnetwork      = google_compute_subnetwork.gke_subnet.name
  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true   # Nodes get no external IPs
    enable_private_endpoint = false  # Control plane accessible publicly (with authorized networks)
    master_ipv4_cidr_block  = "172.16.0.0/28"  # Control plane CIDR (must not overlap)
  }

  # Restrict who can access the control plane API
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.0.0.0/8"
      display_name = "Internal VPC Networks"
    }
    cidr_blocks {
      cidr_block   = "203.0.113.0/24"
      display_name = "Corporate VPN"
    }
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}
```

## Step 3: Cloud NAT for Outbound Internet Access

```hcl
# Private nodes need Cloud NAT for outbound internet access, such as pulling images from public registries
resource "google_compute_router" "nat_router" {
  name    = "gke-nat-router"
  region  = "us-central1"
  network = google_compute_network.vpc.name
}

resource "google_compute_router_nat" "nat" {
  name                               = "gke-cloud-nat"
  router                             = google_compute_router.nat_router.name
  region                             = "us-central1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.gke_subnet.self_link
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}
```

## Step 4: Private Node Pool

```hcl
resource "google_container_node_pool" "private_nodes" {
  name     = "private-node-pool"
  cluster  = google_container_cluster.private_cluster.name
  location = "us-central1"

  autoscaling {
    min_node_count = 1
    max_node_count = 5
  }

  node_config {
    machine_type = "n2-standard-4"

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Shielded instances for private clusters
    shielded_instance_config {
      enable_secure_boot = true
    }

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}
```

## Summary

GKE Private Clusters with OpenTofu provide node-level network isolation by removing public IPs from all nodes. Add Cloud NAT for outbound internet access to public endpoints (for example, pulling images from public registries), authorized networks to restrict control plane access, and Workload Identity for secure GCP API authentication from pods.
