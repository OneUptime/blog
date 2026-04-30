# How to Configure GCP Cloud VPN IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud VPN, IPv6, IPsec, HA VPN, Dual-Stack, BGP

Description: Configure GCP HA Cloud VPN to support IPv6 tunnels for connecting on-premises networks to GCP over IPv6.

## Introduction

GCP Cloud VPN IPv6 enables private IPv6 connectivity between cloud resources and on-premises or inter-VPC networks by using HA VPN. Cloud VPN supports IPv6 only in HA VPN, not Classic VPN. Proper configuration requires an HA VPN gateway with an IPv6-capable stack type, IPv6-enabled subnets, Cloud Router BGP configuration, and route advertisement.

## Prerequisites

- HA VPN with Cloud Router; Classic VPN does not support IPv6
- VPC network with dual-stack (IPv4 + IPv6) or IPv6-only subnets
- An existing GCP account with appropriate IAM permissions
- A peer VPN gateway configured for IKEv2 and BGP
- IPv6 address space allocated for the connection

## Step 1: Verify IPv6 Prerequisites

```bash
# If you plan to use INTERNAL IPv6 subnets, check that the VPC has a ULA range
gcloud compute networks describe my-network \
    --format="value(internalIpv6Range)"

# Check that the subnets are IPv6-enabled
gcloud compute networks subnets list \
    --network my-network \
    --filter='stackType=IPV4_IPV6 OR stackType=IPV6_ONLY'
```

## Step 2: Enable IPv6 on the VPC and HA VPN Gateway

```bash
# Enable ULA internal IPv6 on the VPC if needed
gcloud compute networks update my-network \
    --enable-ula-internal-ipv6

# Enable IPv6 on subnet
gcloud compute networks subnets update my-subnet \
    --region us-central1 \
    --stack-type IPV4_IPV6 \
    --ipv6-access-type INTERNAL

# Create an HA VPN gateway that supports IPv6 traffic
gcloud compute vpn-gateways create my-ha-vpn \
    --network my-network \
    --region us-central1 \
    --stack-type IPV4_IPV6

# Verify
gcloud compute networks subnets describe my-subnet \
    --region us-central1 \
    --format="value(internalIpv6Prefix)"
```

## Step 3: Configure IPv6 BGP

```bash
# Configure BGP for IPv6 on Cloud Router
gcloud compute routers create my-router \
    --region us-central1 \
    --network my-network \
    --asn 65000

# Add an IPv6 interface for the HA VPN tunnel
gcloud compute routers add-interface my-router \
    --interface-name my-interface \
    --vpn-tunnel my-tunnel \
    --ip-address "fdff:1::1" \
    --mask-length 126 \
    --region us-central1

# Add IPv6 BGP peer
gcloud compute routers add-bgp-peer my-router \
    --region us-central1 \
    --peer-name ipv6-peer \
    --peer-asn 65001 \
    --peer-ip-address "fdff:1::2" \
    --interface my-interface
```

## Step 4: Add IPv6 Routes

```bash
# Advertise a custom IPv6 prefix from Cloud Router
gcloud compute routers update-bgp-peer my-router \
    --region us-central1 \
    --peer-name ipv6-peer \
    --advertisement-mode custom \
    --set-advertisement-ranges '<your-ipv6-prefix>/<prefix-length>'
```

## Step 5: Test IPv6 Connectivity

```bash
# Test from a VM in the VPC
ping -6 -c 3 <on-premises-ipv6-address>

# Verify that the router learned IPv6 routes from the peer
gcloud compute routers list-bgp-routes my-router \
    --region us-central1 \
    --peer ipv6-peer \
    --address-family IPV6 \
    --route-direction INBOUND
```

## Step 6: Terraform Example

```hcl
# Terraform for an IPv6-capable HA VPN gateway and dual-stack subnet
resource "google_compute_network" "main" {
  name                     = "my-network"
  auto_create_subnetworks  = false
  enable_ula_internal_ipv6 = true
}

resource "google_compute_subnetwork" "main" {
  name             = "my-subnet"
  network          = google_compute_network.main.id
  ip_cidr_range    = "10.0.0.0/24"
  region           = var.region
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"
}

resource "google_compute_router" "main" {
  name    = "my-router"
  network = google_compute_network.main.id
  region  = var.region

  bgp {
    asn = 65000
  }
}

resource "google_compute_ha_vpn_gateway" "main" {
  name       = "my-ha-vpn"
  network    = google_compute_network.main.id
  region     = var.region
  stack_type = "IPV4_IPV6"
}
```

## Conclusion

GCP HA VPN IPv6 requires an HA VPN gateway with the `IPV4_IPV6` or `IPV6_ONLY` stack type, IPv6-enabled subnets, and Cloud Router BGP configuration. For dual-stack HA VPN, you can exchange IPv6 routes either with an IPv6 BGP session or by enabling MP-BGP on an IPv4 BGP session. Test connectivity end-to-end after configuration. Use Terraform for declarative, repeatable deployments. Monitor IPv6 BGP session state and route advertisement with OneUptime's network health checks.
