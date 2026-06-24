# How to Configure IPv6 Subnets in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Subnets, Dual-Stack, Google Cloud, VPC

Description: Create and configure Google Cloud VPC subnets with IPv6 support, choose between external and internal IPv6 access types, and understand GCP's /96 subnet allocation.

## Introduction

Google Cloud supports IPv6 subnets only on custom mode VPC networks. When a subnet uses `stack-type=IPV4_IPV6` or `stack-type=IPV6_ONLY`, Google Cloud assigns the subnet a `/64` IPv6 range, and VM network interfaces receive `/96` IPv6 ranges from that subnet. The `ipv6-access-type` determines whether addresses are globally routable (`EXTERNAL`) or privately routed within Google Cloud VPC networks (`INTERNAL`). Internal IPv6 subnets also require the VPC network to have a `/48` ULA range assigned first. Existing IPv4-only subnets can be converted to dual-stack without recreating them.

## Create IPv6-Enabled Subnets

```bash
PROJECT="my-gcp-project"

# IPv6 subnets require a custom-mode VPC network.
# Run this once per VPC before creating INTERNAL IPv6 subnets.
gcloud compute networks update vpc-main \
    --enable-ula-internal-ipv6 \
    --project="$PROJECT"

# External dual-stack subnet (public IPv6)

gcloud compute networks subnets create subnet-public \
    --network=vpc-main \
    --region=us-east1 \
    --range=10.0.1.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL \
    --project="$PROJECT"

# Internal dual-stack subnet (private IPv6)
gcloud compute networks subnets create subnet-internal \
    --network=vpc-main \
    --region=us-east1 \
    --range=10.0.2.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=INTERNAL \
    --project="$PROJECT"

# IPv6-only subnet
gcloud compute networks subnets create subnet-ipv6only \
    --network=vpc-main \
    --region=us-east1 \
    --stack-type=IPV6_ONLY \
    --ipv6-access-type=INTERNAL \
    --project="$PROJECT"

# View assigned IPv4 and IPv6 ranges
gcloud compute networks subnets describe subnet-public \
    --region=us-east1 \
    --project="$PROJECT" \
    --format="table(name, stackType, ipCidrRange, internalIpv6Prefix, externalIpv6Prefix, ipv6AccessType)"
```

## Update Existing Subnet to Add IPv6

```bash
# Enable IPv6 on existing IPv4-only subnet
gcloud compute networks subnets update existing-subnet \
    --region=us-east1 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL \
    --project="$PROJECT"

# Verify the update
gcloud compute networks subnets describe existing-subnet \
    --region=us-east1 \
    --project="$PROJECT" \
    --format="json(stackType, internalIpv6Prefix, externalIpv6Prefix, ipv6AccessType)"
```

## Terraform Subnets with IPv6 Options

```hcl
# subnets_ipv6.tf

variable "project_id" {}

resource "google_compute_network" "main" {
  name                    = "vpc-main"
  auto_create_subnetworks = false
  project                 = var.project_id

  # Required for INTERNAL IPv6 subnets.
  enable_ula_internal_ipv6 = true
}

# Public web subnet with external IPv6
resource "google_compute_subnetwork" "web" {
  name          = "subnet-web"
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id
  project       = var.project_id

  # Dual-stack with globally routable IPv6
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "EXTERNAL"

  # Enable Private Google Access for IPv6
  private_ipv6_google_access = "ENABLE_OUTBOUND_VM_ACCESS_TO_GOOGLE"

  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = 1.0
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Backend app subnet with internal IPv6
resource "google_compute_subnetwork" "app" {
  name          = "subnet-app"
  ip_cidr_range = "10.0.2.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id
  project       = var.project_id

  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"

  # Private Google Access for IPv6 (reach Google APIs over IPv6)
  private_ipv6_google_access = "ENABLE_OUTBOUND_VM_ACCESS_TO_GOOGLE"
}

# Database subnet with internal IPv6
resource "google_compute_subnetwork" "db" {
  name          = "subnet-db"
  ip_cidr_range = "10.0.3.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id
  project       = var.project_id

  # Internal IPv6 for security
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"
}
```

## Understanding GCP IPv6 Subnet Allocation

```bash
# GCP subnet IPv6 allocation:
# When you create an external IPv6 subnet, GCP assigns a /64 prefix
# Each VM network interface in the subnet gets a /96 from that /64
# Example:
#   Subnet gets: 2600:1900:4000:1234::/64
#   VM 1 gets:   2600:1900:4000:1234::/96

# For internal IPv6:
# GCP assigns a /48 ULA range from fd20::/20 to the VPC network
# Each internal IPv6 subnet gets an unused /64 from that /48
# Example:
#   VPC gets:    fd20:1234:5678::/48
#   Subnet gets: fd20:1234:5678:1::/64
#   VM 1 gets:   fd20:1234:5678:1::/96

# View the allocated prefix for your subnet
gcloud compute networks subnets describe subnet-public \
    --region=us-east1 \
    --project="$PROJECT" \
    --format="get(externalIpv6Prefix, internalIpv6Prefix, ipv6AccessType)"
```

## Private Google Access for IPv6

```bash
# Enable Private IPv6 Google Access on subnet
# This allows VMs to reach Google APIs over IPv6 without external IP
gcloud compute networks subnets update subnet-internal \
    --region=us-east1 \
    --private-ipv6-google-access-type=enable-outbound-vm-access \
    --project="$PROJECT"

# Verify
gcloud compute networks subnets describe subnet-internal \
    --region=us-east1 \
    --project="$PROJECT" \
    --format="get(privateIpv6GoogleAccess)"
```

## Conclusion

GCP dual-stack subnets require two settings: `stack-type=IPV4_IPV6` and `ipv6-access-type` (EXTERNAL or INTERNAL). Each IPv6-enabled subnet receives a `/64` IPv6 range, and VM interfaces receive `/96` allocations from that subnet. External subnets use globally routable IPv6 ranges, while internal subnets use `/64` ranges taken from the VPC network's `/48` ULA allocation. Enable `private_ipv6_google_access` to allow VMs to reach Google APIs over IPv6 without public addresses. Existing IPv4-only subnets can be upgraded to dual-stack without recreation using `gcloud compute networks subnets update`.
