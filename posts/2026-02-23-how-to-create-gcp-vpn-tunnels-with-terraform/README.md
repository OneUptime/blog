# How to Create GCP VPN Tunnels with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, VPN, Cloud VPN, Networking, Hybrid Connectivity, Infrastructure as Code

Description: Complete guide to creating GCP VPN tunnels with Terraform, including HA VPN, Classic VPN, BGP configuration, and connecting to on-premises or other cloud networks.

---

Cloud VPN connects your on-premises network or other cloud environments to your Google Cloud VPC through encrypted IPsec tunnels. It is one of the most common ways to establish hybrid connectivity, and for many organizations it is the first step in their cloud migration journey.

Google Cloud offers two types of VPN: Classic VPN and HA VPN. Classic VPN provides a single tunnel with 99.9% SLA, while HA VPN uses two tunnels across two interfaces for a 99.99% SLA. For new projects, Google recommends HA VPN, and that is what we will focus on primarily.

## Architecture Overview

An HA VPN setup involves these components:

- **HA VPN Gateway** - A Google-managed gateway with two interfaces, each with its own external IP
- **Peer VPN Gateway** - Represents the on-premises or remote VPN device
- **VPN Tunnels** - Encrypted IPsec tunnels connecting the two gateways
- **Cloud Router** - Handles dynamic routing via BGP between the networks
- **Router Interfaces and BGP Peers** - Configure the BGP sessions over each tunnel

## Provider and Network Setup

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

variable "peer_gateway_ip" {
  description = "External IP of the on-premises VPN gateway"
  type        = string
}

variable "peer_asn" {
  description = "BGP ASN of the on-premises network"
  type        = number
  default     = 65001
}

variable "vpn_shared_secret" {
  description = "Pre-shared key for VPN tunnels"
  type        = string
  sensitive   = true
}

# VPC network
resource "google_compute_network" "vpc" {
  name                    = "vpn-vpc"
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

resource "google_compute_subnetwork" "main" {
  name          = "main-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}
```

## HA VPN to On-Premises Network

This is the most common scenario - connecting your GCP VPC to a corporate data center:

```hcl
# Cloud Router with BGP
resource "google_compute_router" "vpn_router" {
  name    = "vpn-router"
  region  = var.region
  network = google_compute_network.vpc.id

  bgp {
    asn               = 64514
    advertise_mode    = "DEFAULT"
    keepalive_interval = 20
  }
}

# HA VPN Gateway (GCP side)
resource "google_compute_ha_vpn_gateway" "gcp_gateway" {
  name    = "gcp-ha-vpn-gateway"
  region  = var.region
  network = google_compute_network.vpc.id
}

# External VPN Gateway (on-premises side)
# This represents a single on-premises device with one IP
resource "google_compute_external_vpn_gateway" "onprem" {
  name            = "onprem-vpn-gateway"
  redundancy_type = "SINGLE_IP_INTERNALLY_REDUNDANT"

  interface {
    id         = 0
    ip_address = var.peer_gateway_ip
  }
}

# Tunnel 1 - from GCP interface 0 to on-premises
resource "google_compute_vpn_tunnel" "tunnel_1" {
  name                  = "ha-vpn-tunnel-1"
  region                = var.region
  vpn_gateway           = google_compute_ha_vpn_gateway.gcp_gateway.id
  peer_external_gateway = google_compute_external_vpn_gateway.onprem.id
  shared_secret         = var.vpn_shared_secret
  router                = google_compute_router.vpn_router.id

  vpn_gateway_interface           = 0
  peer_external_gateway_interface = 0
}

# Tunnel 2 - from GCP interface 1 to on-premises
resource "google_compute_vpn_tunnel" "tunnel_2" {
  name                  = "ha-vpn-tunnel-2"
  region                = var.region
  vpn_gateway           = google_compute_ha_vpn_gateway.gcp_gateway.id
  peer_external_gateway = google_compute_external_vpn_gateway.onprem.id
  shared_secret         = var.vpn_shared_secret
  router                = google_compute_router.vpn_router.id

  vpn_gateway_interface           = 1
  peer_external_gateway_interface = 0
}

# Router interface for tunnel 1
resource "google_compute_router_interface" "tunnel_1_iface" {
  name       = "tunnel-1-interface"
  router     = google_compute_router.vpn_router.name
  region     = var.region
  ip_range   = "169.254.0.1/30"
  vpn_tunnel = google_compute_vpn_tunnel.tunnel_1.name
}

# Router interface for tunnel 2
resource "google_compute_router_interface" "tunnel_2_iface" {
  name       = "tunnel-2-interface"
  router     = google_compute_router.vpn_router.name
  region     = var.region
  ip_range   = "169.254.0.5/30"
  vpn_tunnel = google_compute_vpn_tunnel.tunnel_2.name
}

# BGP peer for tunnel 1
resource "google_compute_router_peer" "tunnel_1_bgp" {
  name                      = "tunnel-1-bgp-peer"
  router                    = google_compute_router.vpn_router.name
  region                    = var.region
  peer_ip_address           = "169.254.0.2"
  peer_asn                  = var.peer_asn
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.tunnel_1_iface.name

  # Enable BFD for fast failover
  bfd {
    session_initialization_mode = "ACTIVE"
    min_receive_interval        = 1000
    min_transmit_interval       = 1000
    multiplier                  = 5
  }
}

# BGP peer for tunnel 2
resource "google_compute_router_peer" "tunnel_2_bgp" {
  name                      = "tunnel-2-bgp-peer"
  router                    = google_compute_router.vpn_router.name
  region                    = var.region
  peer_ip_address           = "169.254.0.6"
  peer_asn                  = var.peer_asn
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.tunnel_2_iface.name

  bfd {
    session_initialization_mode = "ACTIVE"
    min_receive_interval        = 1000
    min_transmit_interval       = 1000
    multiplier                  = 5
  }
}
```

Each tunnel uses a /30 link-local subnet from the 169.254.0.0/16 range. The first IP is the Cloud Router side, and the second is the on-premises peer side. Make sure these match what you configure on your on-premises VPN device.

## HA VPN Between Two GCP Networks

You can also connect two GCP VPCs using HA VPN. This is useful for connecting projects, shared VPCs, or networks in different organizations:

```hcl
# Second VPC network
resource "google_compute_network" "vpc_2" {
  name                    = "vpn-vpc-2"
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

resource "google_compute_subnetwork" "vpc_2_subnet" {
  name          = "vpc-2-subnet"
  ip_cidr_range = "10.1.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc_2.id
}

# Second Cloud Router
resource "google_compute_router" "vpn_router_2" {
  name    = "vpn-router-2"
  region  = var.region
  network = google_compute_network.vpc_2.id

  bgp {
    asn = 64515
  }
}

# Second HA VPN Gateway
resource "google_compute_ha_vpn_gateway" "gcp_gateway_2" {
  name    = "gcp-ha-vpn-gateway-2"
  region  = var.region
  network = google_compute_network.vpc_2.id
}

# Tunnels from VPC 1 to VPC 2
resource "google_compute_vpn_tunnel" "gcp_tunnel_1" {
  name                 = "gcp-to-gcp-tunnel-1"
  region               = var.region
  vpn_gateway          = google_compute_ha_vpn_gateway.gcp_gateway.id
  peer_gcp_gateway     = google_compute_ha_vpn_gateway.gcp_gateway_2.id
  shared_secret        = var.vpn_shared_secret
  router               = google_compute_router.vpn_router.id
  vpn_gateway_interface = 0
}

resource "google_compute_vpn_tunnel" "gcp_tunnel_2" {
  name                 = "gcp-to-gcp-tunnel-2"
  region               = var.region
  vpn_gateway          = google_compute_ha_vpn_gateway.gcp_gateway.id
  peer_gcp_gateway     = google_compute_ha_vpn_gateway.gcp_gateway_2.id
  shared_secret        = var.vpn_shared_secret
  router               = google_compute_router.vpn_router.id
  vpn_gateway_interface = 1
}

# Tunnels from VPC 2 to VPC 1 (reverse direction)
resource "google_compute_vpn_tunnel" "gcp_tunnel_3" {
  name                 = "gcp-to-gcp-tunnel-3"
  region               = var.region
  vpn_gateway          = google_compute_ha_vpn_gateway.gcp_gateway_2.id
  peer_gcp_gateway     = google_compute_ha_vpn_gateway.gcp_gateway.id
  shared_secret        = var.vpn_shared_secret
  router               = google_compute_router.vpn_router_2.id
  vpn_gateway_interface = 0
}

resource "google_compute_vpn_tunnel" "gcp_tunnel_4" {
  name                 = "gcp-to-gcp-tunnel-4"
  region               = var.region
  vpn_gateway          = google_compute_ha_vpn_gateway.gcp_gateway_2.id
  peer_gcp_gateway     = google_compute_ha_vpn_gateway.gcp_gateway.id
  shared_secret        = var.vpn_shared_secret
  router               = google_compute_router.vpn_router_2.id
  vpn_gateway_interface = 1
}
```

With GCP-to-GCP VPN, you use `peer_gcp_gateway` instead of `peer_external_gateway`. You still need tunnels and BGP sessions in both directions.

## Classic VPN (Static Routing)

For simpler setups or compatibility with older VPN devices, Classic VPN with static routes is an option:

```hcl
# Static IP for Classic VPN
resource "google_compute_address" "classic_vpn_ip" {
  name   = "classic-vpn-ip"
  region = var.region
}

# Classic VPN Gateway
resource "google_compute_vpn_gateway" "classic" {
  name    = "classic-vpn-gateway"
  region  = var.region
  network = google_compute_network.vpc.id
}

# Forwarding rules for IPsec traffic
resource "google_compute_forwarding_rule" "esp" {
  name        = "vpn-esp"
  region      = var.region
  ip_protocol = "ESP"
  ip_address  = google_compute_address.classic_vpn_ip.address
  target      = google_compute_vpn_gateway.classic.id
}

resource "google_compute_forwarding_rule" "udp500" {
  name        = "vpn-udp500"
  region      = var.region
  ip_protocol = "UDP"
  port_range  = "500"
  ip_address  = google_compute_address.classic_vpn_ip.address
  target      = google_compute_vpn_gateway.classic.id
}

resource "google_compute_forwarding_rule" "udp4500" {
  name        = "vpn-udp4500"
  region      = var.region
  ip_protocol = "UDP"
  port_range  = "4500"
  ip_address  = google_compute_address.classic_vpn_ip.address
  target      = google_compute_vpn_gateway.classic.id
}

# Classic VPN Tunnel with static routes
resource "google_compute_vpn_tunnel" "classic_tunnel" {
  name          = "classic-vpn-tunnel"
  region        = var.region
  target_vpn_gateway = google_compute_vpn_gateway.classic.id
  shared_secret = var.vpn_shared_secret
  peer_ip       = var.peer_gateway_ip

  # Static routing - specify on-premises CIDR ranges
  local_traffic_selector  = ["10.0.0.0/24"]
  remote_traffic_selector = ["192.168.0.0/16"]

  depends_on = [
    google_compute_forwarding_rule.esp,
    google_compute_forwarding_rule.udp500,
    google_compute_forwarding_rule.udp4500,
  ]
}

# Static route to on-premises network via the tunnel
resource "google_compute_route" "to_onprem" {
  name                = "route-to-onprem"
  network             = google_compute_network.vpc.id
  dest_range          = "192.168.0.0/16"
  priority            = 1000
  next_hop_vpn_tunnel = google_compute_vpn_tunnel.classic_tunnel.id
}
```

Classic VPN requires manual forwarding rules for ESP, UDP 500, and UDP 4500 protocols. It also uses static routes instead of BGP, which means you need to update routes manually when your on-premises network changes.

## Firewall Rules

Do not forget firewall rules to allow traffic between the connected networks:

```hcl
# Allow traffic from on-premises network
resource "google_compute_firewall" "from_onprem" {
  name    = "allow-from-onprem"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  # On-premises network CIDR
  source_ranges = ["192.168.0.0/16"]
}
```

## Outputs

```hcl
output "ha_vpn_gateway_ips" {
  description = "External IPs of the HA VPN gateway interfaces"
  value = [
    google_compute_ha_vpn_gateway.gcp_gateway.vpn_interfaces[0].ip_address,
    google_compute_ha_vpn_gateway.gcp_gateway.vpn_interfaces[1].ip_address,
  ]
}

output "tunnel_1_status" {
  value = google_compute_vpn_tunnel.tunnel_1.detailed_status
}

output "tunnel_2_status" {
  value = google_compute_vpn_tunnel.tunnel_2.detailed_status
}
```

## Best Practices

**Always use HA VPN for new deployments.** The 99.99% SLA and automatic failover are worth the slightly more complex setup.

**Use the same shared secret for both tunnels in an HA pair.** While you can use different secrets, using the same one simplifies management.

**Enable BFD on BGP peers.** It reduces failover time from 40-60 seconds (BGP hold timer) to about 5 seconds.

**Use GLOBAL routing mode on your VPC.** This lets all regions benefit from learned routes, not just the region where the Cloud Router sits.

**Monitor tunnel status.** Set up alerts for `vpn.googleapis.com/tunnel_being_created` and `vpn.googleapis.com/tunnel_established` metrics.

**Keep your on-premises configuration in sync.** The Terraform output for gateway IPs and BGP settings should be shared with your network team to configure the on-premises side.

## Conclusion

VPN tunnels are the workhorse of hybrid connectivity in GCP. HA VPN with BGP gives you resilient, dynamically-routed connections that handle failover automatically. Classic VPN still has its place for simpler scenarios, but HA VPN should be the default choice for production workloads.

For the networking building blocks, see our guides on [Cloud Router](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-router-with-terraform/view) and [Cloud NAT](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-nat-with-terraform/view).
