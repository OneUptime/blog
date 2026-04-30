# How to Create GCP Cloud VPN Tunnels with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud VPN, Networking, Hybrid Cloud, Infrastructure as Code

Description: Learn how to create GCP Cloud VPN tunnels and HA VPN gateways for hybrid connectivity using OpenTofu.

## Introduction

GCP Cloud VPN connects your on-premises or other cloud networks to GCP VPCs over IPsec VPN tunnels. HA VPN can provide 99.99% availability when you configure a tunnel on each HA VPN gateway interface. OpenTofu manages gateways, tunnels, routers, and BGP sessions as code.

## Creating an HA VPN Gateway

```hcl
resource "google_compute_ha_vpn_gateway" "main" {
  name    = "${var.app_name}-ha-vpn-${var.environment}"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id
}
```

## Creating an External VPN Gateway

Represents the on-premises VPN device.

```hcl
resource "google_compute_external_vpn_gateway" "onprem" {
  name            = "ext-vpn-onprem"
  project         = var.project_id
  redundancy_type = "TWO_IPS_REDUNDANCY"  # for HA pairs

  interface {
    id         = 0
    ip_address = var.onprem_vpn_ip_1
  }

  interface {
    id         = 1
    ip_address = var.onprem_vpn_ip_2
  }
}
```

## Cloud Router for BGP

```hcl
resource "google_compute_router" "vpn" {
  name    = "${var.app_name}-vpn-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn               = 64514  # GCP side BGP ASN
    advertise_mode    = "CUSTOM"
    advertised_groups = ["ALL_SUBNETS"]
  }
}
```

## Creating VPN Tunnels

```hcl
# Tunnel 1 – connects interface 0 to on-premises device interface 0

resource "google_compute_vpn_tunnel" "tunnel_1" {
  name                            = "${var.app_name}-tunnel-1"
  project                         = var.project_id
  region                          = var.region
  vpn_gateway                     = google_compute_ha_vpn_gateway.main.id
  vpn_gateway_interface           = 0  # HA gateway interface
  peer_external_gateway           = google_compute_external_vpn_gateway.onprem.id
  peer_external_gateway_interface = 0
  shared_secret                   = var.vpn_shared_secret
  router                          = google_compute_router.vpn.id
  ike_version                     = 2
}

# Tunnel 2 – redundant path
resource "google_compute_vpn_tunnel" "tunnel_2" {
  name                            = "${var.app_name}-tunnel-2"
  project                         = var.project_id
  region                          = var.region
  vpn_gateway                     = google_compute_ha_vpn_gateway.main.id
  vpn_gateway_interface           = 1
  peer_external_gateway           = google_compute_external_vpn_gateway.onprem.id
  peer_external_gateway_interface = 1
  shared_secret                   = var.vpn_shared_secret
  router                          = google_compute_router.vpn.id
  ike_version                     = 2
}
```

## Router Interfaces and BGP Peers

```hcl
resource "google_compute_router_interface" "tunnel_1" {
  name       = "if-tunnel-1"
  project    = var.project_id
  router     = google_compute_router.vpn.name
  region     = var.region
  ip_range   = "169.254.1.1/30"  # link-local BGP IP
  vpn_tunnel = google_compute_vpn_tunnel.tunnel_1.name
}

resource "google_compute_router_peer" "tunnel_1" {
  name                      = "bgp-peer-tunnel-1"
  project                   = var.project_id
  router                    = google_compute_router.vpn.name
  region                    = var.region
  peer_ip_address           = "169.254.1.2"
  peer_asn                  = 65000  # on-premises BGP ASN
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.tunnel_1.name
}

resource "google_compute_router_interface" "tunnel_2" {
  name       = "if-tunnel-2"
  project    = var.project_id
  router     = google_compute_router.vpn.name
  region     = var.region
  ip_range   = "169.254.2.1/30"  # link-local BGP IP
  vpn_tunnel = google_compute_vpn_tunnel.tunnel_2.name
}

resource "google_compute_router_peer" "tunnel_2" {
  name                      = "bgp-peer-tunnel-2"
  project                   = var.project_id
  router                    = google_compute_router.vpn.name
  region                    = var.region
  peer_ip_address           = "169.254.2.2"
  peer_asn                  = 65000  # on-premises BGP ASN
  advertised_route_priority = 100
  interface                 = google_compute_router_interface.tunnel_2.name
}
```

## Outputs

```hcl
output "gateway_ip_1" {
  value = google_compute_ha_vpn_gateway.main.vpn_interfaces[0].ip_address
}

output "gateway_ip_2" {
  value = google_compute_ha_vpn_gateway.main.vpn_interfaces[1].ip_address
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

GCP HA VPN provides highly available hybrid connectivity by using a tunnel on each HA VPN gateway interface. OpenTofu manages the entire stack - HA gateways, external gateways, Cloud Router, BGP configuration, and tunnel resources - in a reproducible and auditable way.
