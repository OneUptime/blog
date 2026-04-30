# How to Enable IPv6 in Google Cloud VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, VPC, Google Cloud, Dual-Stack, Cloud Networking

Description: Enable IPv6 in Google Cloud VPC networks, configure dual-stack subnets with internal and external IPv6 ranges, and understand GCP's unique IPv6 architecture.

## Introduction

Google Cloud Platform (GCP) supports IPv6 in VPC networks through subnet-level IPv6 ranges. GCP enables IPv6 per-subnet with the choice of external IPv6 (globally routable from the internet) or internal IPv6 (ULA, only within VPC). GCP VMs can receive dual-stack addresses with both IPv4 and IPv6.

## Enable IPv6 on GCP Subnet

```bash
PROJECT="my-project"
REGION="us-east1"
VPC_NAME="vpc-main"
SUBNET_NAME="subnet-web"

# Create VPC first (if not exists)
# Internal IPv6 subnets require a ULA /48 on the VPC network.

gcloud compute networks create "$VPC_NAME" \
    --subnet-mode=custom \
    --enable-ula-internal-ipv6 \
    --project="$PROJECT"

# Create subnet with external IPv6 (globally routable)
gcloud compute networks subnets create "$SUBNET_NAME" \
    --network="$VPC_NAME" \
    --region="$REGION" \
    --range="10.0.1.0/24" \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL \
    --project="$PROJECT"

# Create subnet with internal IPv6 (ULA, private)
gcloud compute networks subnets create subnet-private \
    --network="$VPC_NAME" \
    --region="$REGION" \
    --range="10.0.2.0/24" \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=INTERNAL \
    --project="$PROJECT"

# View subnet IPv6 configuration
gcloud compute networks subnets describe "$SUBNET_NAME" \
    --region="$REGION" \
    --format="json(ipCidrRange, ipv6CidrRange, stackType, ipv6AccessType)" \
    --project="$PROJECT"
```

## Terraform GCP VPC with IPv6

```hcl
# gcp_vpc_ipv6.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-east1"
}

resource "google_compute_network" "main" {
  name                    = "vpc-main"
  auto_create_subnetworks = false
  enable_ula_internal_ipv6 = true
}

# External IPv6 subnet (globally routable)
resource "google_compute_subnetwork" "web" {
  name          = "subnet-web"
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id

  # Enable dual-stack with external IPv6
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "EXTERNAL"

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Internal IPv6 subnet (ULA only)
resource "google_compute_subnetwork" "app" {
  name          = "subnet-app"
  ip_cidr_range = "10.0.2.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id

  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"
}

output "web_subnet_ipv6" {
  value = google_compute_subnetwork.web.ipv6_cidr_range
}

output "app_subnet_ipv6" {
  value = google_compute_subnetwork.app.ipv6_cidr_range
}
```

## GCP IPv6 Architecture Concepts

```text
GCP IPv6 Types:
  External IPv6 - GCP-assigned globally routable IPv6 range
    → Subnet gets a /64 external IPv6 range
    → VM interfaces get a /96 from that subnet range
    → Used for internet-facing workloads

  Internal IPv6 - ULA (Unique Local Addresses)
    → VPC network gets a /48 ULA range first
    → Each internal IPv6 subnet gets a /64 from that /48
    → VM interfaces get an internal /96 from the subnet range
    → Good for backend services not exposed to internet
    → Unique per-subnet, not globally routable

Stack Types:
  IPV4_ONLY    - Only IPv4 (default)
  IPV4_IPV6    - Both IPv4 and IPv6 (dual-stack)
  IPV6_ONLY    - Only IPv6 (use DNS64/NAT64 for IPv4 internet access)
```

## Verify VPC IPv6 Configuration

```bash
# List all subnets with IPv6 status
gcloud compute networks subnets list \
    --network="$VPC_NAME" \
    --format="table(name, region, ipCidrRange, ipv6CidrRange, stackType, ipv6AccessType)" \
    --project="$PROJECT"

# Check GCP-assigned IPv6 range for subnet
gcloud compute networks subnets describe "$SUBNET_NAME" \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="get(ipv6CidrRange)"
# Returns something like: 2600:1900:4000:abcd::/64
```

## Conclusion

GCP VPC IPv6 is configured per-subnet using `stack_type = "IPV4_IPV6"` and `ipv6_access_type` of either `EXTERNAL` (globally routable) or `INTERNAL` (ULA). External IPv6 subnets receive a `/64` prefix, and VM interfaces get a `/96` from that subnet range. Internal IPv6 requires assigning a `/48` ULA range to the VPC network first, after which each internal IPv6 subnet receives a `/64` from that network range. After enabling IPv6 on a subnet, VMs in that subnet can be configured to receive IPv6 addresses via their network interface settings.
