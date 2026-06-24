# How to Configure GCP Cloud NAT with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Cloud NAT, NAT, Google Cloud, VPC, Outbound

Description: Configure Google Cloud NAT to provide outbound IPv6 internet access for VMs with internal IPv6 (ULA) addresses, including NAT64 for IPv6-only VMs to reach IPv4 destinations.

## Introduction

Google Cloud NAT supports IPv6 through Public NAT NAT64, which lets IPv6-only Compute Engine VMs reach IPv4 internet destinations. VMs with external IPv6 addresses can reach IPv6 internet destinations directly and do not use Cloud NAT for that traffic. For NAT64, configure Cloud NAT on a Cloud Router with `--nat64-all-v6-subnet-ip-ranges` or `--nat64-custom-v6-subnet-ip-ranges`, and configure DNS64 for IPv6-only VMs.

## Configure Cloud NAT for IPv6 Outbound (NAT64)

```bash
PROJECT="my-project"
REGION="us-east1"

# Step 1: Create Cloud Router

gcloud compute routers create router-main \
    --project="$PROJECT" \
    --region="$REGION" \
    --network=vpc-main \
    --description="Main router for NAT"

# Step 2: Configure NAT64 for all IPv6 subnet ranges in the region
gcloud compute routers nats create nat-main \
    --project="$PROJECT" \
    --router=router-main \
    --region="$REGION" \
    --nat64-all-v6-subnet-ip-ranges \
    --auto-allocate-nat-external-ips \
    --enable-logging \
    --log-filter=ERRORS_ONLY

# The --nat64-all-v6-subnet-ip-ranges flag enables NAT64 for IPv6 subnet ranges
# IPv6-only VMs can now reach IPv4 internet destinations after DNS64 is configured

# Verify NAT configuration
gcloud compute routers nats describe nat-main \
    --router=router-main \
    --region="$REGION" \
    --project="$PROJECT"
```

## Configure NAT64 for IPv6-Only VMs

```bash
# NAT64 translates IPv6 packets to IPv4, allowing IPv6-only VMs to reach IPv4 destinations
# Use this subnet-scoped example instead of the all-subnets NAT64 example above
# If you use INTERNAL IPv6, the VPC network must already have an internal /48 ULA range assigned

# Step 1: Create IPv6-only subnet
gcloud compute networks subnets create subnet-ipv6only \
    --project="$PROJECT" \
    --network=vpc-main \
    --region="$REGION" \
    --stack-type=IPV6_ONLY \
    --ipv6-access-type=INTERNAL

# Step 2: Create a DNS64 policy for the VPC network
gcloud dns policies create dns64-policy \
    --project="$PROJECT" \
    --description="DNS64 for IPv6-only VMs" \
    --networks=vpc-main \
    --enable-dns64-all-queries

# Step 3: Create Cloud Router (if not existing)
# (router-main already created above)

# Step 4: Configure Public NAT64 for the IPv6-only subnet
gcloud compute routers nats create nat-nat64 \
    --project="$PROJECT" \
    --router=router-main \
    --region="$REGION" \
    --nat64-custom-v6-subnet-ip-ranges=subnet-ipv6only \
    --auto-allocate-nat-external-ips \
    --enable-logging \
    --log-filter=ERRORS_ONLY

# Check NAT64 status
gcloud compute routers get-status router-main \
    --project="$PROJECT" \
    --region="$REGION"
```

## Terraform Cloud NAT with IPv6

```hcl
# cloud_nat_ipv6.tf

variable "project_id" {}
variable "region" { default = "us-east1" }
variable "network" { default = "vpc-main" }

# Cloud Router
resource "google_compute_router" "main" {
  name    = "router-main"
  region  = var.region
  network = var.network
  project = var.project_id
}

# Public NAT with IPv4 NAT44 and IPv6 NAT64 support
resource "google_compute_router_nat" "main" {
  name                                 = "nat-main"
  router                               = google_compute_router.main.name
  region                               = var.region
  project                              = var.project_id
  nat_ip_allocate_option               = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat   = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  source_subnetwork_ip_ranges_to_nat64 = "ALL_IPV6_SUBNETWORKS"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# DNS64 must be configured separately for IPv6-only VMs

# Output NAT gateway identifier
output "nat_id" {
  value = google_compute_router_nat.main.id
}
```

## Test IPv6 Outbound via Cloud NAT

```bash
# Connect to an IPv6-only VM using your preferred access method

# Inside the VM, verify that DNS64 synthesizes an AAAA record for an IPv4-only destination
dig AAAA ipv4.icanhazip.com

# Test NAT64 connectivity to an IPv4-only destination
curl -6 https://ipv4.icanhazip.com

# This should return the Cloud NAT external IPv4 address
```

## Monitoring Cloud NAT IPv6 Usage

```bash
# View NAT gateway logs
gcloud logging read \
    'resource.type="nat_gateway"' \
    --project="$PROJECT" \
    --limit=50

# Check NAT IP usage
gcloud compute routers get-nat-ip-info router-main \
    --project="$PROJECT" \
    --region="$REGION"

# View NAT usage metrics in Cloud Monitoring Metrics Explorer
# Per-VM metric: compute.googleapis.com/nat/port_usage
# Per-gateway metric: router.googleapis.com/nat/allocated_ports
```

## Conclusion

Cloud NAT supports IPv6 on Google Cloud through Public NAT NAT64. Use `--nat64-all-v6-subnet-ip-ranges` or `--nat64-custom-v6-subnet-ip-ranges` to enable NAT64 for IPv6 subnet ranges, and configure DNS64 so IPv6-only VMs can resolve IPv4-only destinations. In Terraform, add `source_subnetwork_ip_ranges_to_nat64 = "ALL_IPV6_SUBNETWORKS"` when you want one gateway to serve IPv6 NAT64 alongside IPv4 NAT44. VMs with external IPv6 addresses reach IPv6 destinations directly, while NAT64 traffic uses the Cloud NAT gateway's external IPv4 addresses. Test NAT64 by curling `ipv4.icanhazip.com` and checking that the returned address matches the NAT gateway's external IPv4.
