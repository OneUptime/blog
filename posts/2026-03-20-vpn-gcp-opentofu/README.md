# How to Configure GCP Cloud VPN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud VPN, Networking, HA VPN, Infrastructure as Code

Description: Learn how to configure Google Cloud VPN (HA VPN) using OpenTofu - setting up HA VPN gateways, peer gateways, VPN tunnels, and BGP sessions for production-ready connectivity.

## Introduction

GCP Cloud VPN connects on-premises networks or other clouds to GCP VPCs via IPsec tunnels. GCP offers two types: Classic VPN (deprecated) and HA VPN (recommended). HA VPN uses two interfaces for 99.99% SLA. OpenTofu manages `google_compute_ha_vpn_gateway`, `google_compute_external_vpn_gateway`, and `google_compute_vpn_tunnel`.

## HA VPN Gateway (GCP Side)

```hcl
resource "google_compute_ha_vpn_gateway" "main" {
  region  = var.gcp_region
  name    = "${var.environment}-ha-vpn"
  network = google_compute_network.main.id

  # Stack type: IPV4_ONLY or IPV4_IPV6
  stack_type = "IPV4_ONLY"
}
```

## External VPN Gateway (On-Premises)

```hcl
# Single peer device with two interfaces (for HA)

resource "google_compute_external_vpn_gateway" "on_prem" {
  name            = "on-prem-vpn-gateway"
  redundancy_type = "TWO_IPS_REDUNDANCY"  # or SINGLE_IP_INTERNALLY_REDUNDANT / FOUR_IPS_REDUNDANCY

  interface {
    id         = 0
    ip_address = var.on_prem_vpn_ip1
  }

  interface {
    id         = 1
    ip_address = var.on_prem_vpn_ip2
  }
}
```

## Cloud Router (for BGP)

```hcl
resource "google_compute_router" "vpn_router" {
  name    = "${var.environment}-vpn-router"
  network = google_compute_network.main.id
  region  = var.gcp_region

  bgp {
    asn               = 65001  # GCP ASN
    advertise_mode    = "CUSTOM"
    advertised_groups = ["ALL_SUBNETS"]

    # Advertise specific ranges (must be CIDR-formatted strings)
    advertised_ip_ranges {
      range = "10.100.0.0/16"
    }
  }
}
```

## VPN Tunnels (Two for HA)

```hcl
# Tunnel 1: GCP interface 0 → On-prem interface 0
resource "google_compute_vpn_tunnel" "tunnel1" {
  name                  = "${var.environment}-tunnel1"
  region                = var.gcp_region
  vpn_gateway           = google_compute_ha_vpn_gateway.main.id
  vpn_gateway_interface = 0  # GCP gateway interface 0

  peer_external_gateway           = google_compute_external_vpn_gateway.on_prem.id
  peer_external_gateway_interface = 0  # On-prem interface 0

  shared_secret = var.vpn_psk_tunnel1
  router        = google_compute_router.vpn_router.id

  ike_version = 2
}

# Tunnel 2: GCP interface 1 → On-prem interface 1
resource "google_compute_vpn_tunnel" "tunnel2" {
  name                  = "${var.environment}-tunnel2"
  region                = var.gcp_region
  vpn_gateway           = google_compute_ha_vpn_gateway.main.id
  vpn_gateway_interface = 1

  peer_external_gateway           = google_compute_external_vpn_gateway.on_prem.id
  peer_external_gateway_interface = 1

  shared_secret = var.vpn_psk_tunnel2
  router        = google_compute_router.vpn_router.id

  ike_version = 2
}
```

## BGP Sessions (Cloud Router Interfaces)

```hcl
# Router interface for tunnel 1
resource "google_compute_router_interface" "tunnel1" {
  name       = "${var.environment}-router-if-tunnel1"
  router     = google_compute_router.vpn_router.name
  region     = var.gcp_region
  ip_range   = "169.254.0.1/30"  # Link-local BGP IP pair
  vpn_tunnel = google_compute_vpn_tunnel.tunnel1.name
}

# BGP peer for tunnel 1
resource "google_compute_router_peer" "tunnel1" {
  name                      = "${var.environment}-bgp-peer-tunnel1"
  router                    = google_compute_router.vpn_router.name
  region                    = var.gcp_region
  peer_ip_address           = "169.254.0.2"  # On-prem BGP IP
  peer_asn                  = var.on_prem_bgp_asn
  interface                 = google_compute_router_interface.tunnel1.name
  advertised_route_priority = 100
}

# Router interface for tunnel 2
resource "google_compute_router_interface" "tunnel2" {
  name       = "${var.environment}-router-if-tunnel2"
  router     = google_compute_router.vpn_router.name
  region     = var.gcp_region
  ip_range   = "169.254.1.1/30"
  vpn_tunnel = google_compute_vpn_tunnel.tunnel2.name
}

resource "google_compute_router_peer" "tunnel2" {
  name            = "${var.environment}-bgp-peer-tunnel2"
  router          = google_compute_router.vpn_router.name
  region          = var.gcp_region
  peer_ip_address = "169.254.1.2"
  peer_asn        = var.on_prem_bgp_asn
  interface       = google_compute_router_interface.tunnel2.name
  advertised_route_priority = 200  # Higher value = lower preference (backup)
}
```

## Outputs

```hcl
output "ha_vpn_interface0_ip" {
  value       = google_compute_ha_vpn_gateway.main.vpn_interfaces[0].ip_address
  description = "GCP HA VPN interface 0 public IP"
}

output "ha_vpn_interface1_ip" {
  value       = google_compute_ha_vpn_gateway.main.vpn_interfaces[1].ip_address
  description = "GCP HA VPN interface 1 public IP"
}
```

## Conclusion

GCP HA VPN with OpenTofu requires four tunnel-related resources: HA VPN gateway, external VPN gateway, VPN tunnels, and Cloud Router BGP sessions. Always create two tunnels (one per HA VPN interface) to achieve the 99.99% availability SLA. Use BGP with Cloud Router for dynamic route exchange - it automatically handles route updates as your on-premises or GCP networks change. Set different BGP route priorities on the two tunnels to make one primary and one backup.
