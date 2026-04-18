# How to Create VPC DHCP Options Sets with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, VPC, DHCP, DNS, Networking, Infrastructure as Code

Description: Learn how to create and associate custom DHCP options sets with AWS VPCs using OpenTofu to configure DNS servers, domain names, and NTP servers for instances.

## Introduction

DHCP options sets define network configuration distributed to EC2 instances at launch, including DNS servers, domain search suffixes, and NTP servers. Customizing these is essential in hybrid environments where you want instances to use corporate DNS resolvers or specific domain names.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with VPC permissions

## Step 1: Create a Custom DHCP Options Set

```hcl
# Custom DHCP options set specifying corporate DNS and domain

resource "aws_vpc_dhcp_options" "custom" {
  # Custom domain name for instances in this VPC
  domain_name = "corp.example.com"

  # Use Route 53 Resolver inbound endpoint IPs as DNS servers
  # instead of the default AmazonProvidedDNS
  domain_name_servers = [
    "10.0.0.10",   # Route 53 Resolver inbound endpoint AZ-a
    "10.0.1.10",   # Route 53 Resolver inbound endpoint AZ-b
  ]

  # NTP servers for consistent time across instances
  ntp_servers = ["169.254.169.123"]  # AWS Time Sync Service

  # NetBIOS settings for Windows instances
  netbios_name_servers = ["10.0.0.20"]
  netbios_node_type    = 2  # P-node: point-to-point

  tags = {
    Name        = "custom-dhcp-options"
    Environment = var.environment
  }
}
```

## Step 2: Associate DHCP Options with a VPC

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "main-vpc" }
}

# Associate the custom DHCP options with the VPC
# All new instances will receive these settings via DHCP
resource "aws_vpc_dhcp_options_association" "main" {
  vpc_id          = aws_vpc.main.id
  dhcp_options_id = aws_vpc_dhcp_options.custom.id
}
```

## Step 3: Use Amazon-Provided DNS (Default Reset)

```hcl
# To revert to AWS-managed DNS, use the default DHCP options set
# This is useful when removing a custom set
resource "aws_vpc_dhcp_options" "default" {
  domain_name         = "ec2.internal"       # AWS default for us-east-1
  domain_name_servers = ["AmazonProvidedDNS"]

  tags = { Name = "default-dhcp-options" }
}
```

## Step 4: DHCP Options for Hybrid DNS Architecture

```hcl
# In a hybrid setup, instances use Route 53 Resolver endpoints
# which forward on-premises queries upstream while resolving
# AWS-native names locally
resource "aws_vpc_dhcp_options" "hybrid" {
  domain_name = "internal.example.com"

  # Route 53 Resolver inbound endpoints handle query routing.
  # The ip_address block on the resolver endpoint exposes .ip
  # for each ENI, so splat the IPv4 addresses into the list.
  domain_name_servers = aws_route53_resolver_endpoint.inbound.ip_address[*].ip

  tags = {
    Name = "hybrid-dhcp-options"
    Type = "Hybrid"
  }
}
```

## Step 5: Outputs

```hcl
output "dhcp_options_id" {
  description = "ID of the custom DHCP options set"
  value       = aws_vpc_dhcp_options.custom.id
}

output "dhcp_options_owner_id" {
  description = "AWS account ID that owns the DHCP options"
  value       = aws_vpc_dhcp_options.custom.owner_id
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Custom DHCP options sets allow you to control DNS resolution, domain search, and NTP configuration for all instances in a VPC without modifying instance configurations individually. Changes take effect for new instances immediately; existing instances must release and renew their DHCP lease or be rebooted to pick up new settings.
