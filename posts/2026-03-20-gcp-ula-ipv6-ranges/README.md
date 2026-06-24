# How to Configure GCP VPC Network ULA Internal IPv6 Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, ULA, Internal IPv6, RFC 4193, Google Cloud, VPC

Description: Understand and configure Unique Local Addresses (ULA) for internal IPv6 in Google Cloud VPC, including how GCP assigns fd::/8 prefixes and when to use ULA vs globally routable addresses.

## Introduction

Google Cloud's internal IPv6 subnets use Unique Local Addresses (ULA). In Google Cloud, you first assign a VPC network a `/48` ULA range from Google's `fd20::/20` space, which sits within RFC 4193's locally assigned ULA space. When you create a subnet with `ipv6-access-type=INTERNAL`, GCP automatically assigns that subnet a `/64` from the VPC's `/48`. These addresses are only routable within the VPC and connected networks - they cannot reach or be reached from the public internet. ULA is ideal for backend services, databases, and inter-service communication that should not be internet-accessible.

## Create Subnets with ULA IPv6

```bash
PROJECT="my-project"
REGION="us-east1"

# Enable ULA internal IPv6 on the VPC network.
# GCP assigns a /48 from fd20::/20 unless you specify one.
gcloud compute networks update vpc-main \
    --project="$PROJECT" \
    --enable-ula-internal-ipv6

# View the VPC's ULA /48 prefix
gcloud compute networks describe vpc-main \
    --project="$PROJECT" \
    --format="flattened(internalIpv6Range)"
# Returns: internalIpv6Range: fd20:abcd:1234::/48  (example VPC ULA range)

# Create internal (ULA) IPv6 subnet

gcloud compute networks subnets create subnet-db \
    --project="$PROJECT" \
    --network=vpc-main \
    --region="$REGION" \
    --range=10.0.3.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=INTERNAL

# View the subnet's ULA /64 prefix
gcloud compute networks subnets describe subnet-db \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="get(ipv6CidrRange)"
# Returns: fd20:abcd:1234:3::/64  (example subnet ULA range)

# Create multiple internal subnets - each gets a unique ULA /64
gcloud compute networks subnets create subnet-app \
    --project="$PROJECT" \
    --network=vpc-main \
    --region=us-west1 \
    --range=10.1.1.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=INTERNAL

gcloud compute networks subnets describe subnet-app \
    --region=us-west1 \
    --project="$PROJECT" \
    --format="get(ipv6CidrRange)"
# Returns a different /64 from the same VPC ULA /48
```

## Understand ULA Prefix Assignment

```bash
# GCP ULA prefix assignment:
# - GCP assigns or validates a unique /48 per VPC from the fd20::/20 range
# - Each subnet in the VPC gets a /64 from that /48
# - VMs in the subnet get a /96 from the /64
#
# Example VPC ULA hierarchy:
#   VPC:     fd20:abcd:1234::/48   (GCP-assigned)
#   Subnet1: fd20:abcd:1234:1::/64
#   Subnet2: fd20:abcd:1234:2::/64
#   VM1:     fd20:abcd:1234:1:8000::/96

# List all subnets and their ULA ranges
gcloud compute networks subnets list \
    --project="$PROJECT" \
    --filter="ipv6AccessType=INTERNAL" \
    --format="table(name, region, ipv6CidrRange, ipv6AccessType)"

# ULA address characteristics in GCP:
# - Google Cloud assigns VPC ULA prefixes from fd20::/20
# - The VPC's /48 is unique within Google Cloud
# - Each subnet receives a /64 and each VM interface receives a /96
# - ULA addresses are not routable on the public internet
# - IPv6 routing works within the VPC and across properly configured peerings
```

## Routing with ULA Addresses

```bash
# ULA addresses route automatically within the VPC
# No additional routes needed for intra-VPC communication

# For VPC peering with IPv6, create a peering configuration on both networks
# and set the peering stack type to IPV4_IPV6.
PEER_PROJECT="peer-project"

gcloud compute networks peerings create peer-vpc-a-b \
    --project="$PROJECT" \
    --network=vpc-main \
    --peer-project="$PEER_PROJECT" \
    --peer-network=vpc-peer \
    --stack-type=IPV4_IPV6 \
    --export-custom-routes \
    --import-custom-routes

gcloud compute networks peerings create peer-vpc-b-a \
    --project="$PEER_PROJECT" \
    --network=vpc-peer \
    --peer-project="$PROJECT" \
    --peer-network=vpc-main \
    --stack-type=IPV4_IPV6 \
    --export-custom-routes \
    --import-custom-routes

# Internal ULA IPv6 addresses are not internet-routable.
# For Google APIs over IPv6, enable Private Google Access on the subnet.

# Firewall rule to allow traffic from the peered VPC's ULA /48
PEER_ULA_RANGE="fd20:beef:cafe::/48"

gcloud compute firewall-rules create allow-ula-internal \
    --project="$PROJECT" \
    --network=vpc-main \
    --direction=INGRESS \
    --source-ranges="$PEER_ULA_RANGE" \
    --rules=all
```

## Terraform ULA Subnets

```hcl
# ula_subnets.tf

variable "project_id" {}

resource "google_compute_network" "main" {
  name                     = "vpc-main"
  auto_create_subnetworks  = false
  project                  = var.project_id
  enable_ula_internal_ipv6 = true
}

# Database subnet - internal ULA only (most secure)
resource "google_compute_subnetwork" "db" {
  name          = "subnet-db"
  ip_cidr_range = "10.0.3.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id
  project       = var.project_id

  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"  # ULA addresses
}

# App subnet - internal ULA
resource "google_compute_subnetwork" "app" {
  name          = "subnet-app"
  ip_cidr_range = "10.0.2.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id
  project       = var.project_id

  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"

  # Allow VMs to reach Google APIs over IPv6
  private_ipv6_google_access = "ENABLE_OUTBOUND_VM_ACCESS_TO_GOOGLE"
}

# Output the ULA ranges assigned by GCP
output "db_ula_range" {
  value = google_compute_subnetwork.db.ipv6_cidr_range
}

output "app_ula_range" {
  value = google_compute_subnetwork.app.ipv6_cidr_range
}
```

## Testing ULA Connectivity

```bash
# Test connectivity between VMs using ULA addresses
# SSH into VM in subnet-app
gcloud compute ssh vm-app --zone=us-east1-b --project="$PROJECT"

# Get ULA address of target VM in subnet-db
DB_IPV6=$(gcloud compute instances describe vm-db \
    --zone=us-east1-b \
    --project="$PROJECT" \
    --format="get(networkInterfaces[0].ipv6Address)")

# Test connectivity over ULA IPv6
ping -6 -c 3 "$DB_IPV6"
nc -zv -6 "$DB_IPV6" 5432

# Internal ULA IPv6 addresses cannot reach the public internet directly
ping -6 -c 3 2001:4860:4860::8888  # This fails because ULA addresses are not internet-routable
```

## Conclusion

GCP ULA internal IPv6 is enabled by assigning the VPC network a `/48` from Google's `fd20::/20` ULA space, then creating subnets with `ipv6-access-type=INTERNAL` so each subnet receives a `/64`. Google Cloud guarantees the VPC-level `/48` is unique within Google Cloud, and VM interfaces receive internal `/96` ranges from each subnet's `/64`. ULA addresses route freely within the VPC and across properly configured peerings, but the ULA addresses themselves are not internet-routable. Enable `private_ipv6_google_access` on ULA subnets to allow VMs to reach Google APIs over IPv6 without external addresses.
