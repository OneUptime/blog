# How to Configure GCP VPC Peering IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Peering, IPv6, Route Exchange, Dual-Stack, Internal

Description: Configure GCP VPC peering to exchange IPv6 routes between peered VPC networks for private IPv6 connectivity.

## Introduction

GCP VPC Network Peering provides private IPv6 connectivity between peered VPC networks. IPv6 subnet routes are exchanged when both sides of the peering use the `IPV4_IPV6` stack type. If you also need to exchange custom IPv6 routes, such as prefixes learned through Cloud Router from HA VPN or Interconnect, enable custom route import and export on both peering configurations.

## Prerequisites

- Two custom mode VPC networks with IPv6-enabled or dual-stack subnets
- If you use internal IPv6 addresses, the VPC network has a ULA internal IPv6 range assigned
- An existing GCP account with appropriate IAM permissions
- Firewall rules in both VPC networks that allow the required IPv6 traffic

## Step 1: Verify IPv6 Prerequisites

```bash
# Verify the VPC network has a ULA internal IPv6 range when using INTERNAL IPv6
gcloud compute networks describe my-network \
    --format="value(internalIpv6Range)"

# List subnet IPv6 settings
gcloud compute networks subnets list \
    --network=my-network \
    --format="table(name,region,stackType,ipv6AccessType,ipv6CidrRange)"
```

## Step 2: Enable IPv6 on the VPC and Subnet

```bash
# Enable a ULA /48 on the VPC network if you plan to use internal IPv6
gcloud compute networks update my-network \
    --enable-ula-internal-ipv6

# Enable IPv6 on subnet
gcloud compute networks subnets update my-subnet \
    --region=us-central1 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=INTERNAL

# Verify
gcloud compute networks subnets describe my-subnet \
    --region=us-central1 \
    --format="value(stackType,ipv6AccessType,ipv6CidrRange)"
```

## Step 3: Configure VPC Peering

```bash
# Create the peering from network-a to network-b
gcloud compute networks peerings create peering-a-to-b \
    --network=network-a \
    --peer-project=PROJECT_B \
    --peer-network=network-b \
    --stack-type=IPV4_IPV6

# Create the matching peering from network-b to network-a
gcloud compute networks peerings create peering-b-to-a \
    --network=network-b \
    --peer-project=PROJECT_A \
    --peer-network=network-a \
    --stack-type=IPV4_IPV6
```

## Step 4: Enable IPv6 Route Exchange

```bash
# Optional: exchange custom routes in addition to subnet routes
gcloud compute networks peerings update peering-a-to-b \
    --network=network-a \
    --stack-type=IPV4_IPV6 \
    --import-custom-routes \
    --export-custom-routes

gcloud compute networks peerings update peering-b-to-a \
    --network=network-b \
    --stack-type=IPV4_IPV6 \
    --import-custom-routes \
    --export-custom-routes
```

## Step 5: Test IPv6 Connectivity

```bash
# Test from a VM in network-a to a VM in network-b
ping -6 -c 3 <peer-internal-ipv6-address>

# Verify the peering is ACTIVE
gcloud compute networks peerings list \
    --network=network-a

# Verify received routes
gcloud compute networks peerings list-routes peering-a-to-b \
    --network=network-a \
    --region=us-central1 \
    --direction=INCOMING
```

## Step 6: Terraform Example

```hcl
# Terraform for GCP VPC Peering IPv6
resource "google_compute_network_peering" "peer_a_to_b" {
  name                 = "peer-a-to-b"
  network              = google_compute_network.network_a.self_link
  peer_network         = google_compute_network.network_b.self_link
  stack_type           = "IPV4_IPV6"
  import_custom_routes = true
  export_custom_routes = true
}

resource "google_compute_network_peering" "peer_b_to_a" {
  name                 = "peer-b-to-a"
  network              = google_compute_network.network_b.self_link
  peer_network         = google_compute_network.network_a.self_link
  stack_type           = "IPV4_IPV6"
  import_custom_routes = true
  export_custom_routes = true
}
```

## Conclusion

GCP VPC Network Peering IPv6 requires IPv6-enabled subnets and `IPV4_IPV6` on both peering configurations. IPv6 subnet routes are exchanged automatically; if you also need IPv6 routes learned through Cloud Router, enable custom route import and export on both sides. Test connectivity end-to-end after configuration. Use Terraform for declarative, repeatable deployments. Monitor peering state and route exchange with OneUptime's network health checks.
