# How to Set Up AWS Direct Connect with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Direct Connect, Hybrid Cloud, Private Connectivity, Infrastructure as Code

Description: Learn how to configure AWS Direct Connect resources with OpenTofu, including virtual interfaces, BGP configuration, and Direct Connect Gateway for multi-VPC connectivity.

## Introduction

AWS Direct Connect provides dedicated private network connectivity between on-premises data centers and AWS, bypassing the public internet for more consistent network performance, lower latency, and higher bandwidth. OpenTofu manages the AWS side of the connection-VIFs, BGP configuration, and Direct Connect Gateways-while the physical circuit provisioning is handled by AWS and colocation providers.

## Prerequisites

- OpenTofu v1.6+
- An existing Direct Connect connection (physical circuit) from AWS or a partner
- AWS credentials with Direct Connect and VPC permissions
- For Step 5, dedicated Direct Connect connections if you plan to use a LAG

## Step 1: Create Direct Connect Gateway

```hcl
# DX Gateway enables connectivity to multiple VPCs across regions and accounts

resource "aws_dx_gateway" "main" {
  name            = "${var.project_name}-dx-gateway"
  amazon_side_asn = "64512"  # Private Amazon-side ASN (64512-65534 or 4200000000-4294967294)

  tags = {
    Name = "${var.project_name}-dx-gateway"
  }
}
```

## Step 2: Create Private Virtual Interface

```hcl
# Private VIF connects to a VPC via VGW or DX Gateway
resource "aws_dx_private_virtual_interface" "main" {
  connection_id    = var.dx_connection_id  # Physical DX connection ID
  name             = "${var.project_name}-private-vif"
  vlan             = 100                   # 802.1Q VLAN tag
  address_family   = "ipv4"
  bgp_asn          = 65001                 # Customer-side BGP ASN

  # BGP peering addresses
  amazon_address   = "169.254.100.1/30"   # AWS-side BGP peer IP
  customer_address = "169.254.100.2/30"   # On-premises BGP peer IP

  bgp_auth_key     = var.bgp_auth_key  # MD5 authentication key

  # Connect to DX Gateway (for multi-VPC access)
  dx_gateway_id    = aws_dx_gateway.main.id

  tags = {
    Name = "${var.project_name}-private-vif"
  }
}
```

## Step 3: Connect DX Gateway to Virtual Private Gateways

```hcl
# Attach DX Gateway to VGW in each VPC
resource "aws_dx_gateway_association" "vpc_1" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = var.vgw_vpc_1_id  # Virtual Private Gateway of VPC 1

  allowed_prefixes = [
    "10.0.0.0/16"  # Must match or be wider than the VPC CIDR advertised over DX
  ]
}

resource "aws_dx_gateway_association" "vpc_2" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = var.vgw_vpc_2_id

  allowed_prefixes = [
    "10.1.0.0/16"
  ]
}
```

## Step 4: Create Separate Transit Virtual Interface for Transit Gateway

```hcl
# Transit VIFs require a DX Gateway that is used only for transit gateway associations
resource "aws_dx_gateway" "transit" {
  name            = "${var.project_name}-transit-dx-gateway"
  amazon_side_asn = "65030"  # Must differ from the Transit Gateway ASN

  tags = {
    Name = "${var.project_name}-transit-dx-gateway"
  }
}

# Transit VIF connects to AWS Transit Gateway via a transit-only DX Gateway
resource "aws_dx_transit_virtual_interface" "main" {
  connection_id  = var.dx_connection_id
  name           = "${var.project_name}-transit-vif"
  vlan           = 200
  address_family = "ipv4"
  bgp_asn        = 65001

  amazon_address   = "169.254.200.1/30"
  customer_address = "169.254.200.2/30"
  bgp_auth_key     = var.bgp_auth_key

  dx_gateway_id = aws_dx_gateway.transit.id

  tags = {
    Name = "${var.project_name}-transit-vif"
  }
}

# Associate the transit-only DX Gateway with a Transit Gateway
resource "aws_dx_gateway_association" "tgw" {
  dx_gateway_id         = aws_dx_gateway.transit.id
  associated_gateway_id = var.transit_gateway_id

  allowed_prefixes = [
    "10.0.0.0/8"  # Prefixes advertised to on-premises over the transit VIF
  ]
}
```

## Step 5: Create LAG for Redundancy (Dedicated Connections Only)

```hcl
# Link Aggregation Group combines multiple dedicated connections for redundancy and bandwidth
resource "aws_dx_lag" "main" {
  name                  = "${var.project_name}-lag"
  connections_bandwidth = "10Gbps"
  location              = var.dx_location  # Direct Connect location code
  force_destroy         = false

  tags = {
    Name = "${var.project_name}-lag"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check virtual interface state
aws directconnect describe-virtual-interfaces \
  --virtual-interface-id <vif-id> \
  --query 'virtualInterfaces[0].{State: virtualInterfaceState, BGP: bgpPeers[0].bgpStatus}'
```

## Conclusion

Direct Connect physical provisioning (ordering circuits) is done outside Terraform through AWS or partner portals; OpenTofu manages the logical configuration on top. For production Direct Connect setups, use redundant VIFs on multiple physical connections; for the highest resilience, AWS recommends multiple connections across multiple Direct Connect locations, customer devices, and customer sites. Use a Direct Connect Gateway with virtual private gateways for private-VIF designs, or a separate Direct Connect Gateway with a Transit Gateway association for transit-VIF designs.
