# How to Build a Hub-Spoke Network Topology with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, VPC, Hub-Spoke, Networking, Transit Gateway, Terraform

Description: Learn how to design and deploy a hub-spoke network topology on AWS using OpenTofu with Transit Gateway to connect multiple spoke VPCs through a central hub.

---

A hub-spoke network topology connects multiple spoke VPCs to a central hub VPC through AWS Transit Gateway. The hub hosts shared services (DNS, security, monitoring), while each spoke VPC runs workloads in isolation.

## Architecture

```text
Spoke VPC A (dev)  ─┐
Spoke VPC B (staging) ─── Transit Gateway ─── Hub VPC (shared services)
Spoke VPC C (prod) ─┘
```

## Hub VPC

```hcl
resource "aws_vpc" "hub" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "hub-vpc", Role = "hub" }
}
```

## Spoke VPCs

```hcl
variable "spokes" {
  default = {
    "dev"     = "10.1.0.0/16"
    "staging" = "10.2.0.0/16"
    "prod"    = "10.3.0.0/16"
  }
}

resource "aws_vpc" "spokes" {
  for_each   = var.spokes
  cidr_block = each.value
  tags = { Name = "${each.key}-vpc", Role = "spoke" }
}
```

## Transit Gateway

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Hub-Spoke TGW"
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"
  tags = { Name = "hub-spoke-tgw" }
}

# Hub attachment

resource "aws_ec2_transit_gateway_vpc_attachment" "hub" {
  subnet_ids         = aws_subnet.hub_private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false
  vpc_id             = aws_vpc.hub.id
  tags = { Name = "hub-attachment" }
}

# Spoke attachments
resource "aws_ec2_transit_gateway_vpc_attachment" "spokes" {
  for_each           = aws_vpc.spokes
  subnet_ids         = [aws_subnet.spoke_private[each.key].id]
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false
  vpc_id             = each.value.id
  tags = { Name = "${each.key}-attachment" }
}
```

## Route Tables

```hcl
# Hub route table - spoke CIDRs propagate here
resource "aws_ec2_transit_gateway_route_table" "hub" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags = { Name = "hub-rt" }
}

# Associate hub attachment with hub route table
resource "aws_ec2_transit_gateway_route_table_association" "hub" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.hub.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.hub.id
}

# Spoke route table - only hub routes propagate here
resource "aws_ec2_transit_gateway_route_table" "spokes" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags = { Name = "spoke-rt" }
}

# Associate all spoke attachments with the spoke route table
resource "aws_ec2_transit_gateway_route_table_association" "spokes" {
  for_each                       = aws_ec2_transit_gateway_vpc_attachment.spokes
  transit_gateway_attachment_id  = each.value.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.spokes.id
}

# Propagate hub routes to spoke route table
resource "aws_ec2_transit_gateway_route_table_propagation" "hub_to_spokes" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.hub.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.spokes.id
}

# Propagate spoke routes to the hub route table
resource "aws_ec2_transit_gateway_route_table_propagation" "spokes_to_hub" {
  for_each                       = aws_ec2_transit_gateway_vpc_attachment.spokes
  transit_gateway_attachment_id  = each.value.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.hub.id
}

# VPC subnet route tables must also point to the TGW
resource "aws_route" "hub_to_spokes" {
  for_each               = var.spokes
  route_table_id         = aws_route_table.hub_private.id
  destination_cidr_block = each.value
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}

resource "aws_route" "spokes_to_hub" {
  for_each               = var.spokes
  route_table_id         = aws_route_table.spoke_private[each.key].id
  destination_cidr_block = aws_vpc.hub.cidr_block
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

## Best Practices

1. **Disable default route table** on the TGW - explicit is safer than implicit
2. **Use separate route tables** for hub and spokes to enforce isolation
3. **Enable spoke-to-spoke isolation** by NOT propagating spoke routes to the shared spoke route table
4. **Use VPC Flow Logs** on all VPCs for security auditing
5. **Size TGW subnets at /28** - they only need a few IPs per AZ

## Conclusion

A hub-spoke topology with Transit Gateway and OpenTofu provides centralized network management while keeping workload VPCs isolated. Define spokes as variables for easy scaling.

---

*Monitor all your VPC environments with [OneUptime](https://oneuptime.com).*
