# How to Create AWS Direct Connect Gateways with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Direct Connect, Networking, Hybrid Cloud, Infrastructure as Code

Description: Learn how to create AWS Direct Connect Gateways, virtual interfaces, and associate them with Transit Gateways using OpenTofu for dedicated hybrid connectivity.

## Introduction

AWS Direct Connect provides a dedicated network connection from your data center to AWS, bypassing the public internet for lower latency and more consistent throughput. OpenTofu manages Direct Connect Gateways, virtual interfaces, and gateway associations.

## Creating a Direct Connect Gateway

```hcl
resource "aws_dx_gateway" "main" {
  name            = "${var.app_name}-dx-gateway"
  amazon_side_asn = 64512  # BGP ASN for the AWS side
}
```

## Creating a Transit Virtual Interface

```hcl
# A Transit Virtual Interface connects to a DXGW for Transit Gateway access

resource "aws_dx_transit_virtual_interface" "main" {
  connection_id    = var.dx_connection_id  # the Direct Connect connection ID
  name             = "${var.app_name}-tvif"
  vlan             = 4094        # VLAN tag
  address_family   = "ipv4"
  bgp_asn          = 65000       # your on-premises BGP ASN

  dx_gateway_id    = aws_dx_gateway.main.id

  amazon_address   = "169.254.255.1/30"  # AWS BGP peer IP
  customer_address = "169.254.255.2/30"  # your device BGP IP
  bgp_auth_key     = var.bgp_auth_key

  tags = {
    Name        = "${var.app_name}-tvif"
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Associating with a Transit Gateway

```hcl
resource "aws_dx_gateway_association" "tgw" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = aws_ec2_transit_gateway.main.id

  # Prefixes the Direct Connect gateway advertises to your on-premises network
  allowed_prefixes = [
    "10.0.0.0/8",
    "172.16.0.0/12"
  ]
}
```

## Alternatively, Associating with a Virtual Private Gateway

```hcl
resource "aws_dx_gateway_association" "vgw" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = aws_vpn_gateway.main.id

  allowed_prefixes = ["10.0.0.0/16"]
}
```

## Public Virtual Interface

For accessing AWS public services (S3, DynamoDB) over Direct Connect.

```hcl
resource "aws_dx_public_virtual_interface" "public" {
  connection_id  = var.dx_connection_id
  name           = "${var.app_name}-pub-vif"
  vlan           = 100
  address_family = "ipv4"
  bgp_asn        = 65000

  amazon_address   = "169.254.254.1/30"
  customer_address = "169.254.254.2/30"

  # Public prefixes to advertise to AWS
  route_filter_prefixes = [
    var.onprem_public_cidr
  ]
}
```

## Monitoring with CloudWatch

```hcl
resource "aws_cloudwatch_metric_alarm" "dx_bps_egress" {
  alarm_name          = "${var.app_name}-dx-bps-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConnectionBpsEgress"
  namespace           = "AWS/DX"
  period              = 300
  statistic           = "Average"
  threshold           = 8000000000  # 8 Gbps alert on a 10G connection
  alarm_description   = "Direct Connect bandwidth utilization high"

  dimensions = {
    ConnectionId = var.dx_connection_id
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS Direct Connect provides dedicated, reliable hybrid connectivity. OpenTofu manages Direct Connect Gateways, transit and public virtual interfaces, gateway associations, and CloudWatch alarms - creating a complete, code-managed hybrid networking setup.
