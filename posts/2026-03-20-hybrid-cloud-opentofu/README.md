# How to Build a Hybrid Cloud Architecture with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Hybrid Cloud, Architecture, OpenTofu, AWS, Azure, GCP, VPN, Direct Connect

Description: Learn how to build a hybrid cloud architecture using OpenTofu that connects on-premises infrastructure to AWS, Azure, or GCP with secure private connectivity.

## Overview

A hybrid cloud architecture extends on-premises networks into cloud providers through dedicated connectivity (AWS Direct Connect, Azure ExpressRoute, GCP Cloud Interconnect) or VPN tunnels. OpenTofu provisions the cloud-side networking components and peering configurations.

## Step 1: AWS VPN Gateway for On-Premises Connectivity

```hcl
# main.tf - AWS Site-to-Site VPN to on-premises

resource "aws_vpn_gateway" "vpn_gw" {
  vpc_id = module.vpc.vpc_id
  tags   = { Name = "hybrid-vpn-gateway" }
}

# Customer gateway (on-premises router)
resource "aws_customer_gateway" "on_prem" {
  bgp_asn    = 65000  # On-premises AS number
  ip_address = var.on_prem_router_ip
  type       = "ipsec.1"
}

resource "aws_vpn_connection" "to_on_prem" {
  vpn_gateway_id      = aws_vpn_gateway.vpn_gw.id
  customer_gateway_id = aws_customer_gateway.on_prem.id
  type                = "ipsec.1"
  static_routes_only  = false  # BGP routing

  tunnel1_ike_versions = ["ikev2"]
  tunnel1_phase1_dh_group_numbers    = [14, 20]
  tunnel1_phase2_dh_group_numbers    = [14, 20]
}

# Propagate VPN routes to private subnets
resource "aws_vpn_gateway_route_propagation" "private" {
  for_each = toset(module.vpc.private_route_table_ids)

  vpn_gateway_id = aws_vpn_gateway.vpn_gw.id
  route_table_id = each.value
}
```

## Step 2: AWS Direct Connect (Production-Grade)

```hcl
# AWS Direct Connect for dedicated bandwidth
resource "aws_dx_gateway" "main" {
  name            = "hybrid-dx-gateway"
  amazon_side_asn = 64512
}

# Associate the Direct Connect gateway with the VPC's virtual private gateway
resource "aws_dx_gateway_association" "to_vpc" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = aws_vpn_gateway.vpn_gw.id
  allowed_prefixes      = [module.vpc.vpc_cidr_block]
}

# Private virtual interface for VPC access
resource "aws_dx_private_virtual_interface" "to_vpc" {
  connection_id    = var.dx_connection_id  # Pre-provisioned by AWS
  name             = "to-production-vpc"
  vlan             = 100
  address_family   = "ipv4"
  bgp_asn          = 65000  # On-premises ASN
  dx_gateway_id    = aws_dx_gateway.main.id
  amazon_address   = "192.168.100.1/30"
  customer_address = "192.168.100.2/30"
}
```

## Step 3: Azure ExpressRoute (Azure Hybrid)

```hcl
# Azure ExpressRoute circuit for on-premises connectivity
resource "azurerm_express_route_circuit" "express_route" {
  name                  = "hybrid-expressroute"
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  service_provider_name = "Equinix"
  peering_location      = "Silicon Valley"
  bandwidth_in_mbps     = 1000

  sku {
    tier   = "Standard"
    family = "MeteredData"
  }
}

# Azure private peering for the ExpressRoute circuit
resource "azurerm_express_route_circuit_peering" "private" {
  peering_type                  = "AzurePrivatePeering"
  express_route_circuit_name    = azurerm_express_route_circuit.express_route.name
  resource_group_name           = azurerm_resource_group.rg.name
  peer_asn                      = 65000
  primary_peer_address_prefix   = "10.0.0.0/30"
  secondary_peer_address_prefix = "10.0.0.4/30"
  vlan_id                       = 200
}

# ExpressRoute gateways must use the special GatewaySubnet
resource "azurerm_subnet" "gateway_subnet" {
  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.255.0/27"]
}

# ExpressRoute Gateway in VNet
resource "azurerm_virtual_network_gateway" "express_route_gw" {
  name                = "expressroute-gateway"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  type = "ExpressRoute"
  sku  = "ErGw1AZ"

  ip_configuration {
    name                          = "gateway-ip"
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway_subnet.id
  }
}

# Link the VNet gateway to the ExpressRoute circuit
resource "azurerm_virtual_network_gateway_connection" "express_route" {
  name                = "expressroute-connection"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  type                       = "ExpressRoute"
  virtual_network_gateway_id = azurerm_virtual_network_gateway.express_route_gw.id
  express_route_circuit_id   = azurerm_express_route_circuit.express_route.id
}
```

## Step 4: GCP Cloud VPN for Hybrid Connectivity

```hcl
# GCP HA VPN for on-premises connectivity
resource "google_compute_ha_vpn_gateway" "vpn_gw" {
  name    = "hybrid-vpn-gateway"
  network = google_compute_network.vpc.id
  region  = "us-central1"
}

resource "google_compute_external_vpn_gateway" "on_prem" {
  name            = "on-premises-vpn"
  redundancy_type = "TWO_IPS_REDUNDANCY"

  interface {
    id         = 0
    ip_address = var.on_prem_vpn_ip1
  }

  interface {
    id         = 1
    ip_address = var.on_prem_vpn_ip2
  }
}

resource "google_compute_router" "vpn_router" {
  name    = "vpn-router"
  network = google_compute_network.vpc.id
  region  = "us-central1"

  bgp {
    asn = 64514
  }
}

# Create one tunnel from each HA VPN gateway interface to the matching peer interface
resource "google_compute_vpn_tunnel" "tunnel1" {
  name                            = "hybrid-tunnel-1"
  region                          = "us-central1"
  vpn_gateway                     = google_compute_ha_vpn_gateway.vpn_gw.id
  peer_external_gateway           = google_compute_external_vpn_gateway.on_prem.id
  peer_external_gateway_interface = 0
  shared_secret                   = var.vpn_shared_secret
  router                          = google_compute_router.vpn_router.id
  vpn_gateway_interface           = 0
}

resource "google_compute_vpn_tunnel" "tunnel2" {
  name                            = "hybrid-tunnel-2"
  region                          = "us-central1"
  vpn_gateway                     = google_compute_ha_vpn_gateway.vpn_gw.id
  peer_external_gateway           = google_compute_external_vpn_gateway.on_prem.id
  peer_external_gateway_interface = 1
  shared_secret                   = var.vpn_shared_secret
  router                          = google_compute_router.vpn_router.id
  vpn_gateway_interface           = 1
}

resource "google_compute_router_interface" "tunnel1" {
  name       = "router-if-tunnel1"
  router     = google_compute_router.vpn_router.name
  region     = "us-central1"
  ip_range   = "169.254.0.1/30"
  vpn_tunnel = google_compute_vpn_tunnel.tunnel1.name
}

resource "google_compute_router_interface" "tunnel2" {
  name       = "router-if-tunnel2"
  router     = google_compute_router.vpn_router.name
  region     = "us-central1"
  ip_range   = "169.254.1.1/30"
  vpn_tunnel = google_compute_vpn_tunnel.tunnel2.name
}

resource "google_compute_router_peer" "tunnel1" {
  name                      = "peer-tunnel1"
  router                    = google_compute_router.vpn_router.name
  region                    = "us-central1"
  interface                 = google_compute_router_interface.tunnel1.name
  peer_ip_address           = "169.254.0.2"
  peer_asn                  = 65000
  advertised_route_priority = 100
}

resource "google_compute_router_peer" "tunnel2" {
  name                      = "peer-tunnel2"
  router                    = google_compute_router.vpn_router.name
  region                    = "us-central1"
  interface                 = google_compute_router_interface.tunnel2.name
  peer_ip_address           = "169.254.1.2"
  peer_asn                  = 65000
  advertised_route_priority = 100
}
```

## Summary

Hybrid cloud architectures built with OpenTofu bridge on-premises infrastructure and cloud environments with secure, private connectivity. VPN tunnels work well for lower-bandwidth or internet-based hybrid connectivity, while dedicated connections (Direct Connect, ExpressRoute, Cloud Interconnect) provide more predictable latency and higher throughput for production workloads. BGP routing enables automatic route propagation when networks change on either side of the connection.
