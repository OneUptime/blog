# How to Use Dynamic Blocks for Route Table Routes in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, Routing, Dynamic Blocks, VPC, Networking

Description: Learn how to use dynamic blocks in OpenTofu to define AWS route table routes from variable lists, supporting flexible multi-destination routing configurations.

## Introduction

AWS route tables can contain many routes pointing to different gateways, NAT gateways, VPC peering connections, and transit gateways. Rather than defining each route as a static block, dynamic blocks let you manage routes as data and generate the configuration automatically. When using inline `route` blocks with `aws_route_table`, do not mix them with standalone `aws_route` resources, and remember that an empty dynamic collection does not remove existing inline routes; use `route = []` when you need to clear them.

## Dynamic Routes in AWS Route Tables

```hcl
variable "private_routes" {
  description = "Routes to add to the private route table"
  type = list(object({
    cidr_block                = string
    gateway_id                = optional(string)
    nat_gateway_id            = optional(string)
    vpc_peering_connection_id = optional(string)
    transit_gateway_id        = optional(string)
  }))
  default = []
}

resource "aws_route_table" "private" {
  vpc_id = var.vpc_id

  # Generate one route block per destination
  dynamic "route" {
    for_each = var.private_routes
    content {
      cidr_block                = route.value.cidr_block
      gateway_id                = route.value.gateway_id
      nat_gateway_id            = route.value.nat_gateway_id
      vpc_peering_connection_id = route.value.vpc_peering_connection_id
      transit_gateway_id        = route.value.transit_gateway_id
    }
  }

  tags = {
    Name = "private-route-table"
  }
}
```

## Building Routes from Multiple Sources

Combine routes from multiple sources (peering connections, NAT gateways) into a single route table.

```hcl
locals {
  # Routes for VPC peering connections
  peering_routes = [
    for peering in var.vpc_peering_connections : {
      cidr_block                = peering.remote_cidr
      vpc_peering_connection_id = peering.connection_id
      nat_gateway_id            = null
      gateway_id                = null
      transit_gateway_id        = null
    }
  ]

  # Default route through NAT gateway
  nat_routes = var.enable_nat_gateway ? [
    {
      cidr_block                = "0.0.0.0/0"
      nat_gateway_id            = aws_nat_gateway.main.id
      vpc_peering_connection_id = null
      gateway_id                = null
      transit_gateway_id        = null
    }
  ] : []

  # Merge all routes
  all_private_routes = concat(local.peering_routes, local.nat_routes)
}

resource "aws_route_table" "private" {
  vpc_id = var.vpc_id

  dynamic "route" {
    for_each = local.all_private_routes
    content {
      cidr_block                = route.value.cidr_block
      nat_gateway_id            = route.value.nat_gateway_id
      vpc_peering_connection_id = route.value.vpc_peering_connection_id
      gateway_id                = route.value.gateway_id
      transit_gateway_id        = route.value.transit_gateway_id
    }
  }

  tags = { Name = "private-rt" }
}
```

## Per-AZ Route Tables with Dynamic Routes

In a multi-AZ setup, each private subnet gets its own route table pointing to its AZ's NAT gateway.

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "additional_routes" {
  description = "Additional routes for all private route tables"
  type = list(object({
    cidr_block         = string
    transit_gateway_id = string
  }))
  default = []
}

resource "aws_route_table" "private_per_az" {
  for_each = toset(var.availability_zones)

  vpc_id = var.vpc_id

  # Default route to this AZ's NAT gateway
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.per_az[each.key].id
  }

  # Additional routes from variable (e.g., to Transit Gateway)
  dynamic "route" {
    for_each = var.additional_routes
    content {
      cidr_block         = route.value.cidr_block
      transit_gateway_id = route.value.transit_gateway_id
    }
  }

  tags = {
    Name = "private-rt-${each.key}"
  }
}
```

## Conclusion

Dynamic blocks for route table routes let you build flexible, data-driven routing configurations. This pattern is especially useful in hub-and-spoke architectures where many spoke VPCs need routes back to a central network, or when managing VPN and peering routes that vary by environment.
