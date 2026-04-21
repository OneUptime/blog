# How to Create GCP VPC with Custom IPv4 Subnets Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, GCP, VPC, Subnets, IPv4, Infrastructure as Code, Google Cloud

Description: Create a GCP VPC with custom IPv4 subnets using Terraform, covering auto-mode vs custom mode, secondary ranges for GKE, Private Google Access, and VPC flow logs.

## Introduction

GCP VPCs are global resources with regional subnets. Custom mode VPCs give you full control over IPv4 CIDR allocation; auto-mode creates subnets automatically across all regions. Terraform manages both modes.

## Custom Mode VPC

```hcl
# vpc.tf

resource "google_compute_network" "main" {
  name                    = "vpc-prod"
  auto_create_subnetworks = false   # Custom mode
  mtu                     = 1460

  description = "Production VPC"
}
```

## Regional Subnets

```hcl
resource "google_compute_subnetwork" "us_central" {
  name          = "subnet-us-central1"
  ip_cidr_range = "10.192.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.main.id

  private_ip_google_access = true  # Allow Google API access without external IPs

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }

  description = "US Central production subnet"
}

resource "google_compute_subnetwork" "europe_west" {
  name          = "subnet-europe-west1"
  ip_cidr_range = "10.208.0.0/20"
  region        = "europe-west1"
  network       = google_compute_network.main.id

  private_ip_google_access = true
}
```

## Subnet with Secondary Ranges (for GKE)

```hcl
resource "google_compute_subnetwork" "gke" {
  name          = "subnet-gke"
  ip_cidr_range = "10.192.32.0/20"  # Node IPs
  region        = "us-central1"
  network       = google_compute_network.main.id

  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = "10.193.0.0/16"  # Pod IPs (alias IPs)
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = "10.194.0.0/20"  # Service IPs
  }

  private_ip_google_access = true
}
```

## Cloud Router and NAT (for Private Subnet Internet Access in us-central1)

```hcl
resource "google_compute_router" "main" {
  name    = "router-us-central1"
  network = google_compute_network.main.id
  region  = "us-central1"
}

resource "google_compute_router_nat" "main" {
  name                               = "nat-us-central1"
  router                             = google_compute_router.main.name
  region                             = google_compute_router.main.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

## Outputs

```hcl
output "vpc_id" {
  value = google_compute_network.main.id
}

output "subnet_self_links" {
  value = {
    us_central  = google_compute_subnetwork.us_central.self_link
    europe_west = google_compute_subnetwork.europe_west.self_link
  }
}
```

## Conclusion

GCP custom VPCs in Terraform use `auto_create_subnetworks = false` and explicit `google_compute_subnetwork` resources per region. Enable `private_ip_google_access` to allow VMs to reach Google APIs without public IPs. Use secondary ranges for GKE pod and service CIDRs. Add regional Cloud Router + Cloud NAT for private subnet internet egress in each region that needs NAT.
