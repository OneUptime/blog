# How to Set Up GCP VPC Peering with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Peering, Networking, OpenTofu, Infrastructure, Connectivity

Description: Learn how to configure GCP VPC Peering with OpenTofu to connect two VPC networks using private RFC1918 IP addresses without traffic traversing the internet.

## Overview

GCP VPC Peering enables private connectivity between two VPC networks (in the same or different projects). Peered VMs communicate using internal IP addresses with no internet transit. OpenTofu manages both sides of the peering relationship.

## Step 1: Create Two VPC Networks

```hcl
# main.tf - Two VPCs to peer

resource "google_compute_network" "vpc_a" {
  project                 = var.project_a_id
  name                    = "vpc-network-a"
  auto_create_subnetworks = false
}

resource "google_compute_network" "vpc_b" {
  project                 = var.project_b_id
  name                    = "vpc-network-b"
  auto_create_subnetworks = false
}

# Subnets in each VPC (CIDR ranges must not overlap)
resource "google_compute_subnetwork" "subnet_a" {
  project       = var.project_a_id
  name          = "subnet-a"
  network       = google_compute_network.vpc_a.self_link
  region        = "us-central1"
  ip_cidr_range = "10.0.1.0/24"
}

resource "google_compute_subnetwork" "subnet_b" {
  project       = var.project_b_id
  name          = "subnet-b"
  network       = google_compute_network.vpc_b.self_link
  region        = "us-central1"
  ip_cidr_range = "10.1.1.0/24"  # Different CIDR from subnet_a
}
```

## Step 2: Create Peering in Both Directions

```hcl
# VPC peering must be established from BOTH sides
# Private IPv4 subnet routes are exchanged automatically after both
# peering configurations exist.
# Side A: VPC A peers with VPC B
resource "google_compute_network_peering" "peering_a_to_b" {
  name         = "peering-a-to-b"
  network      = google_compute_network.vpc_a.self_link
  peer_network = google_compute_network.vpc_b.self_link
}

# Side B: VPC B peers with VPC A
resource "google_compute_network_peering" "peering_b_to_a" {
  name         = "peering-b-to-a"
  network      = google_compute_network.vpc_b.self_link
  peer_network = google_compute_network.vpc_a.self_link
}
```

## Step 3: Allow Traffic with Firewall Rules

```hcl
# Firewall rule to allow traffic from VPC B's subnet into VPC A
resource "google_compute_firewall" "allow_from_vpc_b" {
  project = var.project_a_id
  name    = "allow-from-vpc-b"
  network = google_compute_network.vpc_a.name

  allow {
    protocol = "tcp"
    ports    = ["8080", "443"]
  }

  # Allow only from VPC B's subnet CIDR
  source_ranges = [google_compute_subnetwork.subnet_b.ip_cidr_range]
}
```

## Step 4: Verify Peering Status

```hcl
output "peering_a_state" {
  value       = google_compute_network_peering.peering_a_to_b.state
  description = "VPC A peering state - should be ACTIVE"
}

output "peering_b_state" {
  value       = google_compute_network_peering.peering_b_to_a.state
  description = "VPC B peering state - should be ACTIVE"
}
```

## Peering Limitations

VPC peering is **not transitive**: if VPC-A peers with VPC-B and VPC-B peers with VPC-C, VMs in VPC-A **cannot** communicate with VMs in VPC-C. If VPC-A and VPC-C also need connectivity, create a separate peering connection between them.

## Summary

GCP VPC Peering with OpenTofu enables private connectivity between VPCs with low latency and the same throughput and availability as traffic within the same VPC network. Always create peering from both sides and ensure subnet CIDR ranges don't overlap. Add appropriate firewall rules since peering only provides routing, not automatic traffic permission.
