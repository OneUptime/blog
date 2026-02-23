# How to Create GCP Cloud Router with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Router, Networking, BGP, Infrastructure as Code

Description: A complete guide to creating GCP Cloud Router with Terraform, covering BGP configuration, custom route advertisements, Cloud NAT integration, and VPN connectivity.

---

Cloud Router is a networking service in Google Cloud that provides dynamic routing using BGP (Border Gateway Protocol). It is the backbone of several GCP networking features - Cloud NAT, Cloud VPN, and Cloud Interconnect all rely on Cloud Router to function. Even if you never touch BGP directly, you will need Cloud Router whenever you set up NAT or VPN in your VPC.

This post walks through creating Cloud Router with Terraform, from simple configurations for Cloud NAT to advanced BGP setups for hybrid connectivity.

## What Cloud Router Actually Does

Cloud Router has two main roles:

1. **Control plane for Cloud NAT** - When used with Cloud NAT, Cloud Router does not actually run BGP. It simply provides the management infrastructure that Cloud NAT needs.

2. **Dynamic routing via BGP** - When used with Cloud VPN or Cloud Interconnect, Cloud Router exchanges routes with your on-premises network using BGP. This means route changes propagate automatically without manual configuration.

## Provider Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

# VPC network
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

resource "google_compute_subnetwork" "primary" {
  name          = "primary-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}
```

Notice the `routing_mode = "GLOBAL"` on the network. This controls whether Cloud Router advertises routes to all regions (GLOBAL) or just the region it is in (REGIONAL). For most setups, GLOBAL is what you want.

## Simple Cloud Router for Cloud NAT

If you just need Cloud NAT, the Cloud Router configuration is minimal:

```hcl
# Simple Cloud Router for Cloud NAT
resource "google_compute_router" "nat_router" {
  name    = "nat-router"
  region  = var.region
  network = google_compute_network.main.id

  # No BGP configuration needed for Cloud NAT
}

# Cloud NAT using this router
resource "google_compute_router_nat" "nat" {
  name                               = "main-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

That is all you need. No BGP ASN, no peering configuration. Cloud NAT just needs a Cloud Router resource to exist.

## Cloud Router with BGP for VPN

When connecting to an on-premises network via VPN, you need to configure BGP:

```hcl
# Cloud Router with BGP configuration for VPN
resource "google_compute_router" "vpn_router" {
  name    = "vpn-router"
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    # Your GCP-side ASN - use a private ASN (64512-65534 or 4200000000-4294967294)
    asn = 64514

    # Advertise mode controls which routes are sent to the peer
    advertise_mode = "DEFAULT"

    # Keepalive interval in seconds
    keepalive_interval = 20
  }
}
```

The `asn` (Autonomous System Number) must be unique within your BGP network. Google recommends using private ASN ranges. The `DEFAULT` advertise mode sends all subnet routes in the network to BGP peers.

## Cloud Router with Custom Route Advertisements

Sometimes you want to advertise specific routes rather than all subnets. This is common in hub-and-spoke topologies:

```hcl
# Cloud Router with custom route advertisements
resource "google_compute_router" "custom_router" {
  name    = "custom-router"
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn            = 64515
    advertise_mode = "CUSTOM"

    # Advertise default subnet routes plus custom prefixes
    advertised_groups = ["ALL_SUBNETS"]

    # Advertise a summary route instead of individual subnets
    advertised_ip_ranges {
      range       = "10.0.0.0/16"
      description = "Summary route for all internal subnets"
    }

    # Advertise a specific service IP range
    advertised_ip_ranges {
      range       = "10.100.0.0/24"
      description = "Shared services subnet"
    }
  }
}
```

With `CUSTOM` advertise mode, you explicitly choose what routes to advertise. `ALL_SUBNETS` sends the default subnet routes, and `advertised_ip_ranges` lets you add custom prefixes. This is useful when you want to advertise a summary route instead of individual /24 subnets.

## Cloud Router with BGP Peers

To complete the BGP setup, you need to configure peers. This is typically done alongside a VPN tunnel:

```hcl
# Cloud Router for HA VPN
resource "google_compute_router" "ha_vpn_router" {
  name    = "ha-vpn-router"
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn               = 64516
    advertise_mode    = "DEFAULT"
    keepalive_interval = 20
  }
}

# HA VPN Gateway
resource "google_compute_ha_vpn_gateway" "gateway" {
  name    = "ha-vpn-gateway"
  region  = var.region
  network = google_compute_network.main.id
}

# External VPN Gateway (represents the on-premises device)
resource "google_compute_external_vpn_gateway" "onprem" {
  name            = "onprem-gateway"
  redundancy_type = "SINGLE_IP_INTERNALLY_REDUNDANT"

  interface {
    id         = 0
    ip_address = "203.0.113.1"  # Your on-premises VPN gateway IP
  }
}

# VPN Tunnel
resource "google_compute_vpn_tunnel" "tunnel_1" {
  name                  = "vpn-tunnel-1"
  region                = var.region
  vpn_gateway           = google_compute_ha_vpn_gateway.gateway.id
  peer_external_gateway = google_compute_external_vpn_gateway.onprem.id
  shared_secret         = var.vpn_shared_secret
  router                = google_compute_router.ha_vpn_router.id

  vpn_gateway_interface           = 0
  peer_external_gateway_interface = 0
}

# Router interface for the tunnel
resource "google_compute_router_interface" "tunnel_1_interface" {
  name       = "vpn-tunnel-1-interface"
  router     = google_compute_router.ha_vpn_router.name
  region     = var.region
  ip_range   = "169.254.1.1/30"
  vpn_tunnel = google_compute_vpn_tunnel.tunnel_1.name
}

# BGP peer for the tunnel
resource "google_compute_router_peer" "tunnel_1_peer" {
  name                      = "vpn-tunnel-1-peer"
  router                    = google_compute_router.ha_vpn_router.name
  region                    = var.region
  peer_ip_address           = "169.254.1.2"
  peer_asn                  = 65001  # On-premises ASN
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.tunnel_1_interface.name

  # BFD (Bidirectional Forwarding Detection) for faster failover
  bfd {
    session_initialization_mode = "ACTIVE"
    min_receive_interval        = 1000
    min_transmit_interval       = 1000
    multiplier                  = 5
  }
}

variable "vpn_shared_secret" {
  type      = string
  sensitive = true
}
```

The `169.254.x.x/30` addresses are link-local IPs used for the BGP session between Cloud Router and the on-premises peer. Each tunnel needs a unique /30 range.

BFD (Bidirectional Forwarding Detection) is optional but recommended. It detects tunnel failures faster than BGP keepalives alone, reducing failover time from minutes to seconds.

## Multi-Region Cloud Router Setup

For organizations with workloads in multiple regions, you need a Cloud Router in each region:

```hcl
# Define multiple regions
variable "regions" {
  type = map(object({
    subnet_cidr = string
    asn         = number
  }))
  default = {
    "us-central1" = {
      subnet_cidr = "10.0.0.0/24"
      asn         = 64520
    }
    "europe-west1" = {
      subnet_cidr = "10.1.0.0/24"
      asn         = 64521
    }
    "asia-east1" = {
      subnet_cidr = "10.2.0.0/24"
      asn         = 64522
    }
  }
}

# Subnets in each region
resource "google_compute_subnetwork" "regional" {
  for_each      = var.regions
  name          = "${each.key}-subnet"
  ip_cidr_range = each.value.subnet_cidr
  region        = each.key
  network       = google_compute_network.main.id
}

# Cloud Router in each region
resource "google_compute_router" "regional" {
  for_each = var.regions
  name     = "${each.key}-router"
  region   = each.key
  network  = google_compute_network.main.id

  bgp {
    asn            = each.value.asn
    advertise_mode = "DEFAULT"
  }
}

# Cloud NAT in each region
resource "google_compute_router_nat" "regional" {
  for_each                           = var.regions
  name                               = "${each.key}-nat"
  router                             = google_compute_router.regional[each.key].name
  region                             = each.key
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

Using `for_each` keeps the configuration DRY and makes it trivial to add new regions.

## Outputs

```hcl
output "nat_router_id" {
  description = "ID of the NAT Cloud Router"
  value       = google_compute_router.nat_router.id
}

output "vpn_router_id" {
  description = "ID of the VPN Cloud Router"
  value       = google_compute_router.ha_vpn_router.id
}

output "regional_router_ids" {
  description = "IDs of regional Cloud Routers"
  value       = { for k, v in google_compute_router.regional : k => v.id }
}
```

## Best Practices

**Use separate Cloud Routers for NAT and VPN.** While you can use one router for both, separating them keeps things cleaner and avoids unintended interactions.

**Plan your ASN allocation.** If you have multiple routers, each needs a different ASN (unless they are in different networks). Document your ASN assignments.

**Set the VPC routing mode to GLOBAL.** This ensures routes learned by Cloud Router in one region are available in all regions. Without it, routes are only available in the Cloud Router's region.

**Enable BFD for VPN tunnels.** The faster failure detection significantly improves failover times for HA VPN.

**Use `for_each` for multi-region setups.** It keeps your code maintainable and makes adding regions a one-line change.

## Conclusion

Cloud Router is the foundation for GCP's dynamic networking features. Whether you are setting up Cloud NAT for internet access, Cloud VPN for hybrid connectivity, or Cloud Interconnect for dedicated links, Cloud Router is involved. Understanding its configuration options - especially BGP ASN, route advertisements, and peering - is essential for building robust network architectures on GCP.

For the next step, see how to use Cloud Router with [Cloud NAT](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-nat-with-terraform/view) or [VPN Tunnels](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-vpn-tunnels-with-terraform/view).
