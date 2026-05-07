# How to Configure AWS Route Tables for IPv6 with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Terraform, IPv6, Route Tables, VPC, Networking

Description: A guide to configuring AWS route tables with IPv6 routes using Terraform, covering public, private, and egress-only routing patterns.

AWS route tables require explicit IPv6 routes - adding an IPv4 default route does not automatically create an IPv6 counterpart. This guide covers the three main IPv6 routing patterns used in AWS VPC designs.

## IPv6 Routing Patterns

| Subnet Type | IPv6 Next Hop | Resource |
|---|---|---|
| Public | Internet Gateway | `aws_internet_gateway` |
| Private (outbound-only) | Egress-Only IGW | `aws_egress_only_internet_gateway` |
| Private (internal only) | No default route | (no `::/0` route) |

## Step 1: Public Route Table with IPv6 Default Route

```hcl
# rt-public.tf - Route table for public subnets with dual-stack default routes

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "public-rt"
  }
}

resource "aws_route" "public_ipv4_default" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route" "public_ipv6_default" {
  route_table_id              = aws_route_table.public.id
  destination_ipv6_cidr_block = "::/0"
  gateway_id                  = aws_internet_gateway.main.id
}

# Associate all public subnets with this route table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

## Step 2: Private Route Table with Egress-Only Gateway

```hcl
# rt-private.tf - Route table for private subnets with egress-only IPv6 access
resource "aws_egress_only_internet_gateway" "eigw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "eigw" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "private-rt"
  }
}

resource "aws_route" "private_ipv4_default" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}

resource "aws_route" "private_ipv6_default" {
  route_table_id              = aws_route_table.private.id
  destination_ipv6_cidr_block = "::/0"
  egress_only_gateway_id      = aws_egress_only_internet_gateway.eigw.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## Step 3: Add a Specific IPv6 Route (VPC Peering or Transit Gateway)

For routing IPv6 traffic to a specific VPC peer or Transit Gateway:

```hcl
# rt-specific-ipv6.tf - Add a specific IPv6 route to a VPC peering connection
resource "aws_route" "ipv6_peer" {
  route_table_id              = aws_route_table.private.id
  destination_ipv6_cidr_block = "2001:db8:1234:1a00::/56"  # IPv6 CIDR of the peer VPC
  vpc_peering_connection_id   = aws_vpc_peering_connection.peer.id
}

# Or via Transit Gateway
resource "aws_route" "ipv6_tgw" {
  route_table_id              = aws_route_table.private.id
  destination_ipv6_cidr_block = "2001:db8:2000::/48"
  transit_gateway_id          = aws_ec2_transit_gateway.main.id
}
```

## Step 4: Apply and Verify Routes

```bash
terraform apply

# View the routes in the public route table
aws ec2 describe-route-tables \
  --filters "Name=tag:Name,Values=public-rt" \
  --query 'RouteTables[0].Routes[?DestinationIpv6CidrBlock!=`null`].{Dest:DestinationIpv6CidrBlock,Target:GatewayId}'

# Verify routes from an EC2 instance
# Public instance:
ip -6 route show
# Should include a default IPv6 route via a link-local next hop on the primary interface
```

## Step 5: Validate Connectivity

```bash
# From a public instance with an IPv6 address and ICMPv6 allowed: should reach the internet over IPv6
ping -6 -c 3 2001:4860:4860::8888

# From a private instance with an IPv6 address and ICMPv6 allowed: should still reach the internet over IPv6
ping -6 -c 3 2001:4860:4860::8888
# Unsolicited inbound IPv6 connections from the internet should still fail
```

Correct IPv6 route table configuration is the foundation of AWS dual-stack networking - without the right next-hop entries, even properly addressed instances will fail to route IPv6 traffic.
