# How to Configure GCP Cloud NAT with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Cloud NAT, NAT, Google Cloud, VPC, Outbound

Description: Configure Google Cloud NAT to provide outbound IPv6 internet access for VMs with internal IPv6 (ULA) addresses, including NAT64 for IPv6-only VMs to reach IPv4 destinations.

## Introduction

Google Cloud NAT supports two IPv6 scenarios: outbound IPv6 NAT for VMs with internal ULA IPv6 addresses that need to reach IPv6 internet destinations, and NAT64 for IPv6-only VMs that need to reach IPv4-only destinations. VMs with external IPv6 addresses do not need Cloud NAT for IPv6 outbound access. Cloud NAT for IPv6 is configured on a Cloud Router with the `--nat-all-subnet-ip-ranges` and endpoint independent mapping options.

## Configure Cloud NAT for IPv6 Outbound

```bash
PROJECT="my-project"
REGION="us-east1"

# Step 1: Create Cloud Router

gcloud compute routers create router-main \
    --project="$PROJECT" \
    --region="$REGION" \
    --network=vpc-main \
    --description="Main router for NAT"

# Step 2: Configure NAT with IPv6 support
gcloud compute routers nats create nat-main \
    --project="$PROJECT" \
    --router=router-main \
    --region="$REGION" \
    --nat-all-subnet-ip-ranges \
    --auto-allocate-nat-external-ips \
    --enable-endpoint-independent-mapping \
    --enable-logging \
    --log-filter=ERRORS_ONLY

# The --nat-all-subnet-ip-ranges flag includes IPv6 ranges from dual-stack subnets
# VMs with internal IPv6 addresses can now reach IPv6 internet destinations

# Verify NAT configuration
gcloud compute routers nats describe nat-main \
    --router=router-main \
    --region="$REGION" \
    --project="$PROJECT"
```

## Configure NAT64 for IPv6-Only VMs

```bash
# NAT64 translates IPv6 packets to IPv4, allowing IPv6-only VMs to reach IPv4 destinations
# This is used with IPv6-only subnets that have DNS64 configured

# Step 1: Create IPv6-only subnet
gcloud compute networks subnets create subnet-ipv6only \
    --project="$PROJECT" \
    --network=vpc-main \
    --region="$REGION" \
    --stack-type=IPV6_ONLY \
    --ipv6-access-type=INTERNAL

# Step 2: Create Cloud Router (if not existing)
# (router-main already created above)

# Step 3: Configure NAT with NAT64 enabled
gcloud compute routers nats create nat-nat64 \
    --project="$PROJECT" \
    --router=router-main \
    --region="$REGION" \
    --nat-all-subnet-ip-ranges \
    --auto-allocate-nat-external-ips \
    --enable-endpoint-independent-mapping \
    --type=PRIVATE

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

# Cloud Router
resource "google_compute_router" "main" {
  name    = "router-main"
  region  = var.region
  network = google_compute_network.main.id
  project = var.project_id
}

# Cloud NAT with IPv6 support
resource "google_compute_router_nat" "main" {
  name                               = "nat-main"
  router                             = google_compute_router.main.name
  region                             = var.region
  project                            = var.project_id
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # Required for correct IPv6 NAT behavior
  enable_endpoint_independent_mapping = true

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Output NAT external IPs used
output "nat_ips" {
  value = google_compute_router_nat.main.nat_ips
}
```

## Test IPv6 Outbound via Cloud NAT

```bash
# SSH into a VM with internal IPv6
gcloud compute ssh vm-internal \
    --project="$PROJECT" \
    --zone=us-east1-b

# Inside the VM, test outbound IPv6 connectivity via NAT
ping6 -c 3 2001:4860:4860::8888  # Google DNS IPv6

# Check what external IPv6 the VM appears as after NAT
curl -6 https://ipv6.icanhazip.com

# This should return the Cloud NAT external IPv6 address, not the VM's ULA address

# Test DNS resolution (should work via Cloud DNS)
dig AAAA google.com
```

## Monitoring Cloud NAT IPv6 Usage

```bash
# View NAT gateway logs
gcloud logging read \
    "resource.type=nat_gateway AND jsonPayload.connection.protocol=UDP" \
    --project="$PROJECT" \
    --limit=50

# Check NAT port usage
gcloud compute routers get-status router-main \
    --project="$PROJECT" \
    --region="$REGION" \
    --format="json(result.natGatewayStatuses)"

# View NAT port usage metrics in Cloud Monitoring
# Metric: router.googleapis.com/nat/port_usage
gcloud monitoring metrics list \
    --filter="metric.type=router.googleapis.com/nat/port_usage" \
    --project="$PROJECT"
```

## Conclusion

Cloud NAT provides outbound IPv6 internet access for VMs with internal (ULA) IPv6 addresses by configuring `--nat-all-subnet-ip-ranges` on the NAT gateway, which automatically includes IPv6 ranges from dual-stack subnets. For IPv6-only VMs, NAT64 translates outbound IPv6 packets to IPv4. In Terraform, use `source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"` to include IPv6 ranges. VMs with external IPv6 addresses bypass Cloud NAT for direct internet access. Test outbound IPv6 NAT by curling `ipv6.icanhazip.com` and checking that the returned address matches the NAT gateway's external IP.
