# How to Use Dynamic Blocks for Route Table Routes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Route Tables, AWS, Networking, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to manage route table entries from variable-driven configurations for flexible network routing.

---

Route tables define how traffic flows through your VPC. As your network grows, route tables accumulate routes for peered VPCs, transit gateways, NAT gateways, VPN connections, and more. Managing all these routes in Terraform becomes repetitive without dynamic blocks. This post shows you how to define routes as data and generate route table entries dynamically.

## The Problem with Manual Route Definitions

A typical route table in a production VPC might look like this without dynamic blocks:

```hcl
# Without dynamic blocks - every route is a separate block
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  route {
    cidr_block                = "10.1.0.0/16"
    vpc_peering_connection_id = aws_vpc_peering_connection.shared_services.id
  }

  route {
    cidr_block                = "10.2.0.0/16"
    vpc_peering_connection_id = aws_vpc_peering_connection.data_platform.id
  }

  route {
    cidr_block         = "172.16.0.0/12"
    transit_gateway_id = aws_ec2_transit_gateway.main.id
  }

  route {
    cidr_block         = "192.168.0.0/16"
    transit_gateway_id = aws_ec2_transit_gateway.main.id
  }

  # More routes for VPN, Direct Connect, etc.
}
```

Adding or removing routes means editing this block directly. Different environments need different routes. And it is hard to see at a glance what the routing policy is.

## Defining Routes as Data

Structure your routes as a variable:

```hcl
# variables.tf
variable "private_routes" {
  description = "Routes for private subnets"
  type = list(object({
    cidr_block                = string
    nat_gateway_id            = optional(string)
    gateway_id                = optional(string)
    vpc_peering_connection_id = optional(string)
    transit_gateway_id        = optional(string)
    network_interface_id      = optional(string)
    vpc_endpoint_id           = optional(string)
    description               = optional(string, "")
  }))
}

variable "public_routes" {
  description = "Routes for public subnets"
  type = list(object({
    cidr_block                = string
    gateway_id                = optional(string)
    vpc_peering_connection_id = optional(string)
    transit_gateway_id        = optional(string)
    description               = optional(string, "")
  }))
}
```

## Using Dynamic Blocks for Route Tables

Generate routes from your variable:

```hcl
# route_tables.tf
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.private_routes

    content {
      cidr_block                = route.value.cidr_block
      nat_gateway_id            = route.value.nat_gateway_id
      gateway_id                = route.value.gateway_id
      vpc_peering_connection_id = route.value.vpc_peering_connection_id
      transit_gateway_id        = route.value.transit_gateway_id
      network_interface_id      = route.value.network_interface_id
      vpc_endpoint_id           = route.value.vpc_endpoint_id
    }
  }

  tags = {
    Name        = "${terraform.workspace}-private-rt"
    Environment = terraform.workspace
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.public_routes

    content {
      cidr_block                = route.value.cidr_block
      gateway_id                = route.value.gateway_id
      vpc_peering_connection_id = route.value.vpc_peering_connection_id
      transit_gateway_id        = route.value.transit_gateway_id
    }
  }

  tags = {
    Name        = "${terraform.workspace}-public-rt"
    Environment = terraform.workspace
  }
}
```

## Building Routes from Infrastructure References

In practice, routes reference resources created in the same Terraform configuration. Use locals to build the route list dynamically:

```hcl
# networking.tf
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
}

# Peering connections
resource "aws_vpc_peering_connection" "shared" {
  vpc_id      = aws_vpc.main.id
  peer_vpc_id = var.shared_services_vpc_id
  auto_accept = true
}

locals {
  # Build public routes
  public_routes = [
    {
      cidr_block = "0.0.0.0/0"
      gateway_id = aws_internet_gateway.main.id
    }
  ]

  # Build private routes from various sources
  private_base_routes = [
    {
      # Default route through NAT gateway
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main.id
    }
  ]

  # Routes for VPC peering connections
  peering_routes = [
    {
      cidr_block                = var.shared_services_cidr
      vpc_peering_connection_id = aws_vpc_peering_connection.shared.id
    }
  ]

  # Routes for transit gateway connections
  transit_routes = var.transit_gateway_id != "" ? [
    for cidr in var.transit_gateway_cidrs : {
      cidr_block         = cidr
      transit_gateway_id = var.transit_gateway_id
    }
  ] : []

  # Combine all private routes
  all_private_routes = concat(
    local.private_base_routes,
    local.peering_routes,
    local.transit_routes
  )
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = local.all_private_routes

    content {
      cidr_block                = route.value.cidr_block
      nat_gateway_id            = lookup(route.value, "nat_gateway_id", null)
      gateway_id                = lookup(route.value, "gateway_id", null)
      vpc_peering_connection_id = lookup(route.value, "vpc_peering_connection_id", null)
      transit_gateway_id        = lookup(route.value, "transit_gateway_id", null)
    }
  }

  tags = {
    Name = "${terraform.workspace}-private-rt"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = local.public_routes

    content {
      cidr_block = route.value.cidr_block
      gateway_id = lookup(route.value, "gateway_id", null)
    }
  }

  tags = {
    Name = "${terraform.workspace}-public-rt"
  }
}
```

## Environment-Specific Routes

Different environments often need different routing. Dev might route through a simpler network while production uses transit gateways and VPN connections:

```hcl
locals {
  env_specific_routes = {
    dev = [
      {
        cidr_block     = "0.0.0.0/0"
        nat_gateway_id = aws_nat_gateway.main.id
      }
      # Dev only routes through NAT, no peering or transit gateway
    ]

    staging = [
      {
        cidr_block     = "0.0.0.0/0"
        nat_gateway_id = aws_nat_gateway.main.id
      },
      {
        # Staging connects to shared services
        cidr_block                = "10.100.0.0/16"
        vpc_peering_connection_id = aws_vpc_peering_connection.shared.id
      }
    ]

    prod = [
      {
        cidr_block     = "0.0.0.0/0"
        nat_gateway_id = aws_nat_gateway.main.id
      },
      {
        # Production connects to shared services
        cidr_block                = "10.100.0.0/16"
        vpc_peering_connection_id = aws_vpc_peering_connection.shared.id
      },
      {
        # Production connects to on-premises via transit gateway
        cidr_block         = "172.16.0.0/12"
        transit_gateway_id = var.transit_gateway_id
      },
      {
        # Production connects to partner network
        cidr_block         = "192.168.0.0/16"
        transit_gateway_id = var.transit_gateway_id
      }
    ]
  }

  selected_routes = lookup(
    local.env_specific_routes,
    terraform.workspace,
    local.env_specific_routes["dev"]
  )
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = local.selected_routes

    content {
      cidr_block                = route.value.cidr_block
      nat_gateway_id            = lookup(route.value, "nat_gateway_id", null)
      gateway_id                = lookup(route.value, "gateway_id", null)
      vpc_peering_connection_id = lookup(route.value, "vpc_peering_connection_id", null)
      transit_gateway_id        = lookup(route.value, "transit_gateway_id", null)
    }
  }

  tags = {
    Name        = "${terraform.workspace}-private-rt"
    Environment = terraform.workspace
  }
}
```

## Multiple Route Tables with Dynamic Routes

When you have multiple route tables - one per subnet or per availability zone - combine resource-level `for_each` with dynamic blocks:

```hcl
variable "subnet_route_configs" {
  description = "Route configurations per subnet type"
  type = map(object({
    routes = list(object({
      cidr_block         = string
      target_type        = string  # "nat", "igw", "peering", "tgw"
      target_id          = string
    }))
  }))
  default = {
    public = {
      routes = [
        {
          cidr_block  = "0.0.0.0/0"
          target_type = "igw"
          target_id   = "auto"  # Will be resolved
        }
      ]
    }
    private = {
      routes = [
        {
          cidr_block  = "0.0.0.0/0"
          target_type = "nat"
          target_id   = "auto"
        },
        {
          cidr_block  = "10.100.0.0/16"
          target_type = "peering"
          target_id   = "auto"
        }
      ]
    }
    database = {
      routes = [
        {
          cidr_block  = "10.100.0.0/16"
          target_type = "peering"
          target_id   = "auto"
        }
        # No internet access for database subnets
      ]
    }
  }
}

# Create a route table for each subnet type
resource "aws_route_table" "subnets" {
  for_each = var.subnet_route_configs

  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = each.value.routes

    content {
      cidr_block = route.value.cidr_block

      # Resolve the target based on type
      gateway_id = route.value.target_type == "igw" ? (
        aws_internet_gateway.main.id
      ) : null

      nat_gateway_id = route.value.target_type == "nat" ? (
        aws_nat_gateway.main.id
      ) : null

      vpc_peering_connection_id = route.value.target_type == "peering" ? (
        aws_vpc_peering_connection.shared.id
      ) : null

      transit_gateway_id = route.value.target_type == "tgw" ? (
        var.transit_gateway_id
      ) : null
    }
  }

  tags = {
    Name        = "${terraform.workspace}-${each.key}-rt"
    SubnetType  = each.key
    Environment = terraform.workspace
  }
}
```

## Using Separate Route Resources

For large or frequently changing route tables, consider using separate `aws_route` resources instead of inline routes. This approach uses `for_each` at the resource level rather than dynamic blocks:

```hcl
locals {
  # Flatten routes across all route tables
  all_routes = flatten([
    for rt_name, rt_config in var.subnet_route_configs : [
      for idx, route in rt_config.routes : {
        key         = "${rt_name}-${idx}"
        rt_name     = rt_name
        cidr_block  = route.cidr_block
        target_type = route.target_type
        target_id   = route.target_id
      }
    ]
  ])
}

resource "aws_route" "all" {
  for_each = { for r in local.all_routes : r.key => r }

  route_table_id         = aws_route_table.subnets[each.value.rt_name].id
  destination_cidr_block = each.value.cidr_block

  gateway_id                = each.value.target_type == "igw" ? aws_internet_gateway.main.id : null
  nat_gateway_id            = each.value.target_type == "nat" ? aws_nat_gateway.main.id : null
  vpc_peering_connection_id = each.value.target_type == "peering" ? aws_vpc_peering_connection.shared.id : null
  transit_gateway_id        = each.value.target_type == "tgw" ? var.transit_gateway_id : null
}
```

The advantage of separate resources is that adding or removing a route does not force Terraform to recreate the entire route table. Each route is managed independently.

## IPv6 Routes

Handle dual-stack routing by including IPv6 routes alongside IPv4:

```hcl
variable "ipv6_routes" {
  description = "IPv6 routes"
  type = list(object({
    ipv6_cidr_block    = string
    gateway_id         = optional(string)
    egress_only_gateway_id = optional(string)
  }))
  default = [
    {
      ipv6_cidr_block = "::/0"
      gateway_id      = null
      egress_only_gateway_id = null
    }
  ]
}

resource "aws_route_table" "dual_stack" {
  vpc_id = aws_vpc.main.id

  # IPv4 routes
  dynamic "route" {
    for_each = local.selected_routes
    content {
      cidr_block     = route.value.cidr_block
      nat_gateway_id = lookup(route.value, "nat_gateway_id", null)
      gateway_id     = lookup(route.value, "gateway_id", null)
    }
  }

  # IPv6 routes
  dynamic "route" {
    for_each = var.ipv6_routes
    content {
      ipv6_cidr_block        = route.value.ipv6_cidr_block
      gateway_id             = route.value.gateway_id
      egress_only_gateway_id = route.value.egress_only_gateway_id
    }
  }

  tags = {
    Name = "${terraform.workspace}-dual-stack-rt"
  }
}
```

## Summary

Dynamic blocks bring clarity and flexibility to route table management in Terraform. By defining routes as structured data and generating route entries dynamically, you make your network configuration environment-aware, auditable, and easy to update. Whether you use inline routes with dynamic blocks or separate route resources with `for_each`, the principle is the same: let data drive your network topology. For more dynamic block patterns, see our post on [dynamic blocks for ingress and egress rules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-ingress-and-egress-rules/view).
