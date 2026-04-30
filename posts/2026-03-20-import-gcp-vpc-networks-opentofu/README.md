# How to Import GCP VPC Networks into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, GCP, VPC, Import, Networking

Description: Learn how to import existing GCP VPC networks, subnetworks, firewall rules, and Cloud Routers into OpenTofu state management.

## Introduction

GCP VPC networks consist of the network resource, subnetworks per region, firewall rules, and optionally Cloud NAT and Cloud Routers. This guide covers importing the complete GCP networking stack.

## Step 1: Inventory the VPC

```bash
PROJECT="my-project-id"
NETWORK="my-vpc-network"

# Get network details

gcloud compute networks describe $NETWORK --project=$PROJECT --format=json

# List subnetworks
gcloud compute networks subnets list \
  --network=$NETWORK \
  --project=$PROJECT \
  --format="table(name,region,ipCidrRange,privateIpGoogleAccess)"

# List firewall rules
gcloud compute firewall-rules list \
  --filter="network=$NETWORK" \
  --project=$PROJECT \
  --format="table(name,direction,priority,sourceRanges,targetTags,allowed)"
```

## Step 2: Write Matching HCL

```hcl
resource "google_compute_network" "main" {
  name                    = "my-vpc-network"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  description             = "Main VPC network"
}

resource "google_compute_subnetwork" "app" {
  name                     = "app-subnet"
  project                  = var.project_id
  region                   = "us-central1"
  network                  = google_compute_network.main.id
  ip_cidr_range            = "10.10.1.0/24"
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.20.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.30.0.0/20"
  }
}

resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  project = var.project_id
  network = google_compute_network.main.name

  direction = "INGRESS"
  priority  = 1000

  source_ranges = ["10.0.0.0/8"]

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }
}
```

## Import Blocks

```hcl
# import.tf
# Accepted shorthand network import format: PROJECT/NETWORK_NAME
import {
  to = google_compute_network.main
  id = "my-project-id/my-vpc-network"
}

# Accepted shorthand subnetwork import format: PROJECT/REGION/SUBNETWORK_NAME
import {
  to = google_compute_subnetwork.app
  id = "my-project-id/us-central1/app-subnet"
}

# Accepted shorthand firewall import format: PROJECT/RULE_NAME
import {
  to = google_compute_firewall.allow_internal
  id = "my-project-id/allow-internal"
}
```

## Importing Cloud Router and NAT

```hcl
resource "google_compute_router" "router" {
  name    = "app-router"
  project = var.project_id
  region  = "us-central1"
  network = google_compute_network.main.id

  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "nat" {
  name    = "app-nat"
  project = var.project_id
  router  = google_compute_router.router.name
  region  = "us-central1"

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

import {
  to = google_compute_router.router
  id = "my-project-id/us-central1/app-router"
}

# Accepted shorthand Cloud NAT import format: PROJECT/REGION/ROUTER_NAME/NAT_NAME
import {
  to = google_compute_router_nat.nat
  id = "my-project-id/us-central1/app-router/app-nat"
}
```

## Conclusion

The Google provider accepts shorthand import IDs such as `PROJECT/RESOURCE_NAME`, `PROJECT/REGION/RESOURCE_NAME`, and `PROJECT/REGION/ROUTER_NAME/NAT_NAME`, and it also accepts the full `projects/...` resource-path forms shown in the provider documentation. If you import incrementally, start with the network and then import related subnetworks, routers/NAT, and firewall rules so referenced resources already exist in state. Secondary IP ranges on subnets (used for GKE pods and services) must be specified exactly as they exist to avoid drift.
