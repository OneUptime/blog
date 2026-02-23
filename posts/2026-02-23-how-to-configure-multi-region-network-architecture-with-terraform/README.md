# How to Configure Multi-Region Network Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Multi-Region, VPC Peering, Transit Gateway, Networking, Infrastructure as Code

Description: Learn how to configure a multi-region network architecture with Terraform using VPC peering, Transit Gateway, and Global Accelerator for high availability and disaster recovery.

---

Multi-region architectures distribute your infrastructure across AWS regions for high availability, disaster recovery, and reduced latency for global users. Setting up the networking layer for multi-region deployments involves VPC peering or Transit Gateway connections, cross-region DNS, and traffic routing. This guide walks through building a complete multi-region network architecture with Terraform.

## Why Multi-Region?

A single-region deployment creates a single point of failure. Regional outages, while rare, can take down your entire application. Multi-region architectures provide resilience against regional failures, lower latency for geographically distributed users, compliance with data residency requirements, and active-active or active-passive disaster recovery options.

## Prerequisites

You need Terraform 1.0 or later with AWS credentials that have permissions across multiple regions. Familiarity with VPC networking and DNS concepts is helpful.

## Provider Configuration for Multiple Regions

```hcl
# Primary region
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

# Secondary region
provider "aws" {
  region = "eu-west-1"
  alias  = "secondary"
}

# Tertiary region (for three-region architecture)
provider "aws" {
  region = "ap-southeast-1"
  alias  = "tertiary"
}
```

## VPC Creation in Each Region

```hcl
# Primary VPC in us-east-1
resource "aws_vpc" "primary" {
  provider             = aws.primary
  cidr_block           = "10.1.0.0/16"  # Non-overlapping CIDR
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name   = "primary-vpc"
    Region = "us-east-1"
  }
}

# Secondary VPC in eu-west-1
resource "aws_vpc" "secondary" {
  provider             = aws.secondary
  cidr_block           = "10.2.0.0/16"  # Non-overlapping CIDR
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name   = "secondary-vpc"
    Region = "eu-west-1"
  }
}

# Tertiary VPC in ap-southeast-1
resource "aws_vpc" "tertiary" {
  provider             = aws.tertiary
  cidr_block           = "10.3.0.0/16"  # Non-overlapping CIDR
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name   = "tertiary-vpc"
    Region = "ap-southeast-1"
  }
}

# Subnets for each region (primary shown, repeat pattern for others)
resource "aws_subnet" "primary_private" {
  provider          = aws.primary
  count             = 3
  vpc_id            = aws_vpc.primary.id
  cidr_block        = cidrsubnet(aws_vpc.primary.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.primary.names[count.index]

  tags = {
    Name = "primary-private-${count.index + 1}"
  }
}

data "aws_availability_zones" "primary" {
  provider = aws.primary
  state    = "available"
}

resource "aws_subnet" "secondary_private" {
  provider          = aws.secondary
  count             = 3
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = cidrsubnet(aws_vpc.secondary.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.secondary.names[count.index]

  tags = {
    Name = "secondary-private-${count.index + 1}"
  }
}

data "aws_availability_zones" "secondary" {
  provider = aws.secondary
  state    = "available"
}
```

## VPC Peering Between Regions

VPC peering creates a direct network connection between VPCs in different regions.

```hcl
# VPC Peering connection from primary to secondary
resource "aws_vpc_peering_connection" "primary_to_secondary" {
  provider    = aws.primary
  vpc_id      = aws_vpc.primary.id
  peer_vpc_id = aws_vpc.secondary.id
  peer_region = "eu-west-1"
  auto_accept = false  # Cross-region peering requires manual acceptance

  tags = {
    Name = "primary-to-secondary-peering"
  }
}

# Accept the peering connection in the secondary region
resource "aws_vpc_peering_connection_accepter" "secondary" {
  provider                  = aws.secondary
  vpc_peering_connection_id = aws_vpc_peering_connection.primary_to_secondary.id
  auto_accept               = true

  tags = {
    Name = "secondary-accept-primary-peering"
  }
}

# Route from primary to secondary VPC
resource "aws_route" "primary_to_secondary" {
  provider                  = aws.primary
  route_table_id            = aws_route_table.primary_private.id
  destination_cidr_block    = aws_vpc.secondary.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.primary_to_secondary.id
}

# Route from secondary to primary VPC
resource "aws_route" "secondary_to_primary" {
  provider                  = aws.secondary
  route_table_id            = aws_route_table.secondary_private.id
  destination_cidr_block    = aws_vpc.primary.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.primary_to_secondary.id
}

# Route tables
resource "aws_route_table" "primary_private" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id

  tags = {
    Name = "primary-private-rt"
  }
}

resource "aws_route_table" "secondary_private" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id

  tags = {
    Name = "secondary-private-rt"
  }
}
```

## Transit Gateway for Multi-Region (Alternative to Peering)

For architectures with many VPCs, Transit Gateway provides a hub-and-spoke model.

```hcl
# Transit Gateway in primary region
resource "aws_ec2_transit_gateway" "primary" {
  provider    = aws.primary
  description = "Primary region transit gateway"

  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"

  tags = {
    Name = "primary-tgw"
  }
}

# Transit Gateway in secondary region
resource "aws_ec2_transit_gateway" "secondary" {
  provider    = aws.secondary
  description = "Secondary region transit gateway"

  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"

  tags = {
    Name = "secondary-tgw"
  }
}

# Peer the transit gateways across regions
resource "aws_ec2_transit_gateway_peering_attachment" "primary_to_secondary" {
  provider                = aws.primary
  peer_region             = "eu-west-1"
  peer_transit_gateway_id = aws_ec2_transit_gateway.secondary.id
  transit_gateway_id      = aws_ec2_transit_gateway.primary.id

  tags = {
    Name = "tgw-peering-primary-secondary"
  }
}

# Accept the peering in the secondary region
resource "aws_ec2_transit_gateway_peering_attachment_accepter" "secondary" {
  provider                      = aws.secondary
  transit_gateway_attachment_id = aws_ec2_transit_gateway_peering_attachment.primary_to_secondary.id

  tags = {
    Name = "tgw-peering-accept-primary"
  }
}

# Attach VPCs to their regional Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "primary" {
  provider           = aws.primary
  subnet_ids         = aws_subnet.primary_private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.primary.id
  vpc_id             = aws_vpc.primary.id

  tags = {
    Name = "primary-vpc-tgw-attachment"
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "secondary" {
  provider           = aws.secondary
  subnet_ids         = aws_subnet.secondary_private[*].id
  transit_gateway_id = aws_ec2_transit_gateway.secondary.id
  vpc_id             = aws_vpc.secondary.id

  tags = {
    Name = "secondary-vpc-tgw-attachment"
  }
}
```

## Global Accelerator for Traffic Routing

AWS Global Accelerator provides static anycast IP addresses that route traffic to the nearest healthy regional endpoint.

```hcl
# Global Accelerator
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "multi-region-accelerator"
  ip_address_type = "IPV4"
  enabled         = true

  tags = {
    Name = "global-accelerator"
  }
}

# Listener for HTTPS traffic
resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"
  client_affinity = "SOURCE_IP"

  port_range {
    from_port = 443
    to_port   = 443
  }
}

# Endpoint group for primary region
resource "aws_globalaccelerator_endpoint_group" "primary" {
  listener_arn = aws_globalaccelerator_listener.https.id

  endpoint_group_region         = "us-east-1"
  health_check_port             = 443
  health_check_protocol         = "TCP"
  health_check_interval_seconds = 10
  threshold_count               = 3
  traffic_dial_percentage       = 100  # Send 100% of traffic to healthy endpoints

  endpoint_configuration {
    endpoint_id                    = aws_lb.primary.arn
    weight                         = 100
    client_ip_preservation_enabled = true
  }
}

# Endpoint group for secondary region (failover)
resource "aws_globalaccelerator_endpoint_group" "secondary" {
  provider     = aws.secondary
  listener_arn = aws_globalaccelerator_listener.https.id

  endpoint_group_region         = "eu-west-1"
  health_check_port             = 443
  health_check_protocol         = "TCP"
  health_check_interval_seconds = 10
  threshold_count               = 3
  traffic_dial_percentage       = 100

  endpoint_configuration {
    endpoint_id                    = aws_lb.secondary.arn
    weight                         = 100
    client_ip_preservation_enabled = true
  }
}
```

## Cross-Region DNS with Route53

```hcl
# Health checks for each region
resource "aws_route53_health_check" "primary" {
  fqdn              = aws_lb.primary.dns_name
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 10

  tags = {
    Name = "primary-health-check"
  }
}

resource "aws_route53_health_check" "secondary" {
  fqdn              = aws_lb.secondary.dns_name
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 10

  tags = {
    Name = "secondary-health-check"
  }
}

# Failover DNS records
resource "aws_route53_record" "primary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.primary.id
}

resource "aws_route53_record" "secondary_failover" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.secondary.dns_name
    zone_id                = aws_lb.secondary.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.secondary.id
}

data "aws_route53_zone" "main" {
  name = "example.com"
}
```

## Conclusion

A multi-region network architecture with Terraform provides the foundation for highly available, globally distributed applications. Whether you choose VPC peering for simplicity or Transit Gateway for scalability, Terraform makes it possible to define and manage the entire architecture as code. Combined with Global Accelerator and Route53 failover routing, your applications can seamlessly handle regional failures.

For related topics, see our guide on [How to Create Hybrid DNS Resolution with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-hybrid-dns-resolution-with-terraform/view).
