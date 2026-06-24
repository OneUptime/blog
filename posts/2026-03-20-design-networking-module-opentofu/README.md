# How to Design a Networking Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Networking, VPC, Transit Gateway, AWS, Module

Description: Learn how to design a comprehensive networking module for OpenTofu that manages VPC peering, Transit Gateway attachments, and cross-account network connectivity.

## Introduction

A networking module sits above the VPC module and handles inter-VPC connectivity: peering connections, Transit Gateway attachments, and the VPC route updates that make those links usable. For cross-account or inter-Region peering, accepter-side resources must use an aliased AWS provider passed into the module. This is the glue that connects multiple VPCs in a hub-and-spoke or mesh architecture.

## variables.tf

```hcl
variable "name"        { type = string }
variable "environment" { type = string }

# VPC peering connections to establish

variable "vpc_peering_connections" {
  type = map(object({
    requester_vpc_id  = string
    accepter_vpc_id   = string
    accepter_region   = optional(string)
    accepter_owner_id = optional(string)
    auto_accept       = optional(bool, true)
    routes = list(object({
      requester_route_table_id = string
      accepter_route_table_id  = string
      requester_cidr           = string
      accepter_cidr            = string
    }))
  }))
  default = {}
}

# Transit Gateway attachments
variable "transit_gateway_id" { type = string; default = "" }
variable "tgw_attachments" {
  type = map(object({
    vpc_id      = string
    subnet_ids  = list(string)
    routes = list(object({
      route_table_id = string
      cidr_block     = string
    }))
  }))
  default = {}
}

variable "tags" { type = map(string); default = {} }
```

## main.tf

```hcl
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.accepter]
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  tags = merge({ Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)
}

locals {
  remote_accepter_connections = {
    for k, v in var.vpc_peering_connections : k => v
    if (
      (v.accepter_owner_id != null && v.accepter_owner_id != data.aws_caller_identity.current.account_id) ||
      (v.accepter_region != null && v.accepter_region != data.aws_region.current.name)
    )
  }
}

# VPC Peering Connections
resource "aws_vpc_peering_connection" "connections" {
  for_each = var.vpc_peering_connections

  vpc_id        = each.value.requester_vpc_id
  peer_vpc_id   = each.value.accepter_vpc_id
  peer_region   = each.value.accepter_region
  peer_owner_id = each.value.accepter_owner_id
  auto_accept   = contains(keys(local.remote_accepter_connections), each.key) ? false : each.value.auto_accept

  tags = merge(local.tags, { Name = "${var.name}-peering-${each.key}" })
}

# Accept cross-account or inter-Region peering in the accepter account/Region.
# Pass aws.accepter from the caller for these connections.
resource "aws_vpc_peering_connection_accepter" "remote" {
  provider = aws.accepter

  for_each = local.remote_accepter_connections

  vpc_peering_connection_id = aws_vpc_peering_connection.connections[each.key].id
  auto_accept               = true
  tags                      = merge(local.tags, { Name = "${var.name}-peering-accepter-${each.key}" })
}

# Accept same-account, same-Region peering when auto_accept is disabled.
resource "aws_vpc_peering_connection_accepter" "same_region_manual" {
  for_each = {
    for k, v in var.vpc_peering_connections : k => v
    if !(
      (v.accepter_owner_id != null && v.accepter_owner_id != data.aws_caller_identity.current.account_id) ||
      (v.accepter_region != null && v.accepter_region != data.aws_region.current.name)
    ) && !v.auto_accept
  }

  vpc_peering_connection_id = aws_vpc_peering_connection.connections[each.key].id
  auto_accept               = true
  tags                      = merge(local.tags, { Name = "${var.name}-peering-accepter-${each.key}" })
}

# Routes for peering connections
locals {
  requester_peering_routes = flatten([
    for conn_name, conn in var.vpc_peering_connections : [
      for route in conn.routes : {
        key                       = "${conn_name}-requester-${route.requester_route_table_id}-${route.accepter_cidr}"
        route_table_id            = route.requester_route_table_id
        destination_cidr          = route.accepter_cidr
        vpc_peering_connection_id = aws_vpc_peering_connection.connections[conn_name].id
      }
    ]
  ])

  same_region_accepter_peering_routes = flatten([
    for conn_name, conn in var.vpc_peering_connections : [
      for route in conn.routes : {
        key                       = "${conn_name}-accepter-${route.accepter_route_table_id}-${route.requester_cidr}"
        route_table_id            = route.accepter_route_table_id
        destination_cidr          = route.requester_cidr
        vpc_peering_connection_id = aws_vpc_peering_connection.connections[conn_name].id
      }
    ] if !contains(keys(local.remote_accepter_connections), conn_name)
  ])

  remote_accepter_peering_routes = flatten([
    for conn_name, conn in local.remote_accepter_connections : [
      for route in conn.routes : {
        key                       = "${conn_name}-accepter-${route.accepter_route_table_id}-${route.requester_cidr}"
        route_table_id            = route.accepter_route_table_id
        destination_cidr          = route.requester_cidr
        vpc_peering_connection_id = aws_vpc_peering_connection.connections[conn_name].id
      }
    ]
  ])
}

resource "aws_route" "peering_requester" {
  for_each = { for r in local.requester_peering_routes : r.key => r }

  route_table_id            = each.value.route_table_id
  destination_cidr_block    = each.value.destination_cidr
  vpc_peering_connection_id = each.value.vpc_peering_connection_id
}

resource "aws_route" "peering_accepter_same_region" {
  for_each = { for r in local.same_region_accepter_peering_routes : r.key => r }

  route_table_id            = each.value.route_table_id
  destination_cidr_block    = each.value.destination_cidr
  vpc_peering_connection_id = each.value.vpc_peering_connection_id
}

resource "aws_route" "peering_accepter_remote" {
  provider = aws.accepter

  for_each = { for r in local.remote_accepter_peering_routes : r.key => r }

  route_table_id            = each.value.route_table_id
  destination_cidr_block    = each.value.destination_cidr
  vpc_peering_connection_id = each.value.vpc_peering_connection_id
}

# Transit Gateway Attachments
resource "aws_ec2_transit_gateway_vpc_attachment" "attachments" {
  for_each = var.tgw_attachments

  transit_gateway_id = var.transit_gateway_id
  vpc_id             = each.value.vpc_id
  subnet_ids         = each.value.subnet_ids
  tags               = merge(local.tags, { Name = "${var.name}-tgw-${each.key}" })
}

locals {
  tgw_routes = flatten([
    for att_name, att in var.tgw_attachments : [
      for route in att.routes : {
        key            = "${att_name}-${route.route_table_id}-${route.cidr_block}"
        route_table_id = route.route_table_id
        cidr_block     = route.cidr_block
      }
    ]
  ])
}

resource "aws_route" "tgw" {
  for_each = { for r in local.tgw_routes : r.key => r }

  route_table_id         = each.value.route_table_id
  destination_cidr_block = each.value.cidr_block
  transit_gateway_id     = var.transit_gateway_id
}
```

## Conclusion

This networking module handles both VPC peering and Transit Gateway connectivity patterns. The flattened route construction handles the many-to-many relationship between connections and route tables on both sides of a peering connection elegantly. Use this module to connect hub-and-spoke VPC architectures without managing peering and VPC route configurations manually in each VPC.
