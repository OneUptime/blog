# How to Build a Hub-and-Spoke Network with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Networking, Hub-and-Spoke, AWS, Transit Gateway, Infrastructure Patterns

Description: Learn how to build a hub-and-spoke network topology on AWS using Terraform with Transit Gateway, shared services, and centralized traffic inspection.

---

As organizations grow their cloud presence, networking becomes one of the biggest challenges. You end up with dozens of VPCs, each needing connectivity to shared services, the internet, and sometimes each other. A hub-and-spoke network topology brings order to this chaos by funneling all traffic through a central hub.

In this guide, we will build a hub-and-spoke network on AWS using Transit Gateway and Terraform. This pattern is fundamental to enterprise cloud networking and works hand-in-hand with landing zone architectures.

## What Is Hub-and-Spoke?

The concept is simple. You have one central VPC (the hub) that contains shared resources like firewalls, DNS servers, and VPN connections. All other VPCs (the spokes) connect to the hub. Spokes do not connect directly to each other. Instead, traffic between spokes routes through the hub, giving you a single point for inspection and policy enforcement.

## Architecture Components

- **Hub VPC**: Contains shared services, NAT gateways, firewalls
- **Spoke VPCs**: Application workloads, each isolated
- **Transit Gateway**: The glue connecting everything
- **Route tables**: Control what traffic flows where

## Transit Gateway Setup

AWS Transit Gateway acts as a regional network router. It is the backbone of our hub-and-spoke architecture:

```hcl
# The central transit gateway
resource "aws_ec2_transit_gateway" "main" {
  description                     = "${var.project_name} transit gateway"
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"

  tags = {
    Name = "${var.project_name}-tgw"
  }
}

# Route table for spoke-to-hub traffic
resource "aws_ec2_transit_gateway_route_table" "spoke" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "${var.project_name}-spoke-rtb"
  }
}

# Route table for hub traffic
resource "aws_ec2_transit_gateway_route_table" "hub" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "${var.project_name}-hub-rtb"
  }
}
```

## Hub VPC

The hub VPC hosts shared services that all spokes need access to:

```hcl
# Hub VPC with shared services
resource "aws_vpc" "hub" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-hub"
    Role = "hub"
  }
}

# Public subnets for NAT gateways and internet-facing resources
resource "aws_subnet" "hub_public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.hub.id
  cidr_block              = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-hub-public-${count.index}"
  }
}

# Private subnets for shared services
resource "aws_subnet" "hub_private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.hub.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-hub-private-${count.index}"
  }
}

# Subnets specifically for Transit Gateway attachments
resource "aws_subnet" "hub_tgw" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.hub.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-hub-tgw-${count.index}"
  }
}

# Attach hub VPC to Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "hub" {
  subnet_ids         = aws_subnet.hub_tgw[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.hub.id

  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "${var.project_name}-hub-attachment"
  }
}
```

## Spoke VPC Module

Each spoke is created from a reusable module:

```hcl
# modules/spoke_vpc/main.tf
resource "aws_vpc" "spoke" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-${var.spoke_name}"
    Role = "spoke"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.spoke.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-${var.spoke_name}-private-${count.index}"
  }
}

# TGW attachment subnets
resource "aws_subnet" "tgw" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.spoke.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-${var.spoke_name}-tgw-${count.index}"
  }
}

# Attach spoke to Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "spoke" {
  subnet_ids         = aws_subnet.tgw[*].id
  transit_gateway_id = var.transit_gateway_id
  vpc_id             = aws_vpc.spoke.id

  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "${var.project_name}-${var.spoke_name}-attachment"
  }
}

# Route all traffic from spoke to Transit Gateway
resource "aws_route" "spoke_to_tgw" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  transit_gateway_id     = var.transit_gateway_id
}
```

## Route Table Associations

This is where the traffic control happens. Spoke VPCs get associated with the spoke route table, and the hub gets its own:

```hcl
# Associate hub attachment with hub route table
resource "aws_ec2_transit_gateway_route_table_association" "hub" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.hub.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.hub.id
}

# Associate each spoke attachment with the spoke route table
resource "aws_ec2_transit_gateway_route_table_association" "spokes" {
  for_each = var.spoke_attachments

  transit_gateway_attachment_id  = each.value
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.spoke.id
}

# Propagate spoke routes to hub route table so hub knows how to reach spokes
resource "aws_ec2_transit_gateway_route_table_propagation" "spokes_to_hub" {
  for_each = var.spoke_attachments

  transit_gateway_attachment_id  = each.value
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.hub.id
}

# Default route from spokes to hub for internet access
resource "aws_ec2_transit_gateway_route" "spoke_default" {
  destination_cidr_block         = "0.0.0.0/0"
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.hub.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.spoke.id
}
```

## Deploying Multiple Spokes

In the root module, create as many spokes as you need:

```hcl
module "spoke_production" {
  source             = "./modules/spoke_vpc"
  project_name       = var.project_name
  spoke_name         = "production"
  vpc_cidr           = "10.1.0.0/16"
  availability_zones = var.availability_zones
  transit_gateway_id = aws_ec2_transit_gateway.main.id
}

module "spoke_staging" {
  source             = "./modules/spoke_vpc"
  project_name       = var.project_name
  spoke_name         = "staging"
  vpc_cidr           = "10.2.0.0/16"
  availability_zones = var.availability_zones
  transit_gateway_id = aws_ec2_transit_gateway.main.id
}

module "spoke_development" {
  source             = "./modules/spoke_vpc"
  project_name       = var.project_name
  spoke_name         = "development"
  vpc_cidr           = "10.3.0.0/16"
  availability_zones = var.availability_zones
  transit_gateway_id = aws_ec2_transit_gateway.main.id
}
```

## Centralized NAT Gateway

Instead of every spoke running its own NAT gateway, you can centralize internet egress through the hub:

```hcl
# Centralized NAT gateways in the hub
resource "aws_nat_gateway" "hub" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.hub_public[count.index].id

  tags = {
    Name = "${var.project_name}-hub-nat-${count.index}"
  }
}

# Route internet-bound traffic from hub private subnets through NAT
resource "aws_route" "hub_nat" {
  count                  = length(var.availability_zones)
  route_table_id         = aws_route_table.hub_private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.hub[count.index].id
}
```

## Network Firewall Integration

For centralized traffic inspection, you can add AWS Network Firewall in the hub:

```hcl
resource "aws_networkfirewall_firewall" "hub" {
  name                = "${var.project_name}-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.main.arn
  vpc_id              = aws_vpc.hub.id

  dynamic "subnet_mapping" {
    for_each = aws_subnet.hub_firewall[*].id
    content {
      subnet_id = subnet_mapping.value
    }
  }
}
```

This gives you a single point to enforce network security policies across all your environments. For a deeper look at shared networking resources, check out [building a shared services VPC with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-shared-services-vpc-with-terraform/view).

## Wrapping Up

The hub-and-spoke pattern with Transit Gateway is the standard way to manage multi-VPC networking in AWS. It gives you centralized control over routing, security, and shared services while keeping workloads isolated in their own VPCs. The Terraform code we walked through makes it easy to add new spokes as your organization grows. Just add another module block, run apply, and the new VPC is connected to everything it needs.
