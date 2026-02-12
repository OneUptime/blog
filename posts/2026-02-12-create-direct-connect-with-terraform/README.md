# How to Create Direct Connect with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Direct Connect, Networking, Hybrid Cloud

Description: Step-by-step guide to provisioning AWS Direct Connect connections, virtual interfaces, and gateways using Terraform for hybrid cloud networking.

---

AWS Direct Connect establishes a dedicated network connection between your on-premises data center and AWS. It bypasses the public internet, giving you lower latency, more consistent throughput, and reduced bandwidth costs compared to VPN connections. Setting it up involves several moving pieces - connections, virtual interfaces, gateways, and route configurations. Terraform helps you manage all of these as code.

This guide covers the full Direct Connect setup with Terraform, from the physical connection to virtual interfaces and gateway associations.

## Understanding Direct Connect Components

Before jumping into code, let's get clear on the components:

- **Connection**: The physical link between your data center and an AWS Direct Connect location
- **Virtual Interface (VIF)**: A logical interface on top of the connection. There are three types - private (for VPC access), public (for AWS public services), and transit (for Transit Gateway)
- **Direct Connect Gateway**: A globally available gateway that lets you connect VIFs to VPCs in any region
- **LAG (Link Aggregation Group)**: Bundles multiple connections for redundancy and increased bandwidth

## Creating the Direct Connect Connection

The connection represents the physical circuit. In practice, you'll need to work with your colocation provider or network partner to establish the physical cross-connect. Terraform provisions the logical side:

```hcl
# Create a Direct Connect connection
resource "aws_dx_connection" "main" {
  name      = "dc-to-aws-primary"
  bandwidth = "1Gbps"
  location  = "EqDC2"  # Direct Connect location code

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

The `location` code corresponds to a specific AWS Direct Connect location. You can find the list in the AWS console or via the CLI with `aws directconnect describe-locations`. Common bandwidth options are 1Gbps and 10Gbps for dedicated connections, or 50Mbps to 500Mbps for hosted connections.

## Setting Up a Link Aggregation Group

For production workloads, a single connection isn't enough. LAGs bundle multiple connections together for redundancy:

```hcl
# Create a LAG for bundling connections
resource "aws_dx_lag" "main" {
  name                  = "primary-lag"
  connections_bandwidth = "1Gbps"
  location              = "EqDC2"
  number_of_connections = 2
  force_destroy         = false

  tags = {
    Environment = var.environment
  }
}

# Associate an existing connection with the LAG
resource "aws_dx_connection_association" "main" {
  connection_id = aws_dx_connection.main.id
  lag_id        = aws_dx_lag.main.id
}
```

## Direct Connect Gateway

The Direct Connect Gateway is the bridge between your virtual interfaces and your VPCs. It's a global resource, so you create it once and associate it with VPCs in multiple regions:

```hcl
# Create a Direct Connect Gateway
resource "aws_dx_gateway" "main" {
  name            = "main-dx-gateway"
  amazon_side_asn = "64512"  # AWS side BGP ASN
}
```

The ASN you choose here is what AWS uses for BGP peering on their end. Pick something in the private ASN range (64512-65534 or 4200000000-4294967294) that doesn't conflict with your on-premises ASN.

## Private Virtual Interface

A private VIF gives you access to resources in your VPCs. This is the most common type of virtual interface:

```hcl
# Create a private virtual interface
resource "aws_dx_private_virtual_interface" "main" {
  connection_id = aws_dx_connection.main.id

  name          = "private-vif"
  vlan          = 100
  address_family = "ipv4"
  bgp_asn       = 65000  # your on-premises ASN

  # Connect to Direct Connect Gateway instead of a single VGW
  dx_gateway_id = aws_dx_gateway.main.id

  tags = {
    Name = "primary-private-vif"
  }
}
```

The `vlan` tag identifies the VLAN for this virtual interface on the physical connection. Your network team needs to configure the same VLAN on their side of the cross-connect.

## Public Virtual Interface

Public VIFs let you reach AWS public services (like S3 or DynamoDB) over the Direct Connect link instead of going through the internet:

```hcl
# Create a public virtual interface
resource "aws_dx_public_virtual_interface" "main" {
  connection_id = aws_dx_connection.main.id

  name           = "public-vif"
  vlan           = 200
  address_family = "ipv4"
  bgp_asn        = 65000

  # Public VIFs require public IP prefixes
  amazon_address   = "175.45.176.1/30"
  customer_address = "175.45.176.2/30"

  route_filter_prefixes = [
    "54.239.0.0/16",   # example AWS prefix
  ]

  tags = {
    Name = "primary-public-vif"
  }
}
```

## Transit Virtual Interface

If you're using AWS Transit Gateway (and you probably should be for multi-VPC architectures), transit VIFs connect your Direct Connect to the Transit Gateway:

```hcl
# Create a transit virtual interface
resource "aws_dx_transit_virtual_interface" "main" {
  connection_id = aws_dx_connection.main.id

  name           = "transit-vif"
  vlan           = 300
  address_family = "ipv4"
  bgp_asn        = 65000
  dx_gateway_id  = aws_dx_gateway.main.id

  tags = {
    Name = "primary-transit-vif"
  }
}

# Associate DX Gateway with Transit Gateway
resource "aws_dx_gateway_association" "transit" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = aws_ec2_transit_gateway.main.id

  allowed_prefixes = [
    "10.0.0.0/8",
    "172.16.0.0/12",
  ]
}
```

## Associating with VPCs

To route traffic from the Direct Connect Gateway to specific VPCs, you create gateway associations:

```hcl
# Virtual Private Gateway in your VPC
resource "aws_vpn_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-vgw"
  }
}

# Associate DX Gateway with the VPN Gateway
resource "aws_dx_gateway_association" "vpc" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = aws_vpn_gateway.main.id

  allowed_prefixes = [
    "10.0.0.0/16",  # your VPC CIDR
  ]
}
```

The `allowed_prefixes` control which CIDRs are advertised over the Direct Connect link. Only include the prefixes that your on-premises network needs to reach.

## BGP Configuration

Direct Connect uses BGP for route exchange. Here's how to configure BGP peering:

```hcl
# BGP peer configuration for the private VIF
resource "aws_dx_bgp_peer" "ipv6" {
  virtual_interface_id = aws_dx_private_virtual_interface.main.id
  address_family       = "ipv6"
  bgp_asn              = 65000
}
```

This adds an IPv6 BGP session alongside the IPv4 session configured on the VIF itself. Dual-stack BGP is useful if you're running IPv6 in your VPC.

## Monitoring Direct Connect

Direct Connect connections can go down, and you need to know about it immediately. Set up CloudWatch alarms to catch issues:

```hcl
# Alarm for connection state changes
resource "aws_cloudwatch_metric_alarm" "dx_connection_state" {
  alarm_name          = "dx-connection-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ConnectionState"
  namespace           = "AWS/DX"
  period              = 300
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Direct Connect connection is down"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ConnectionId = aws_dx_connection.main.id
  }
}
```

For comprehensive monitoring of your hybrid network infrastructure, check out our post on [infrastructure monitoring best practices](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).

## Variables

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "dx_location" {
  description = "Direct Connect location code"
  type        = string
}

variable "customer_bgp_asn" {
  description = "Your on-premises BGP ASN"
  type        = number
  default     = 65000
}

variable "vpc_cidr" {
  description = "VPC CIDR block to advertise"
  type        = string
}
```

## Final Thoughts

Direct Connect is one of those AWS services where the physical and logical sides have to line up perfectly. Terraform handles the logical configuration, but you'll still need to coordinate with your colocation provider for the physical cross-connect. Plan for redundancy from the start - a single connection is a single point of failure. Use LAGs, set up connections in multiple Direct Connect locations, and consider a VPN backup. The cost of a second connection is a lot less than the cost of an outage.
