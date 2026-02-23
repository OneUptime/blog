# How to Create Hybrid DNS Resolution with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Route53, DNS, Hybrid Cloud, Networking, Infrastructure as Code

Description: Learn how to create hybrid DNS resolution with Terraform using Route53 Resolver endpoints, enabling seamless DNS queries between on-premises networks and AWS VPCs.

---

Hybrid DNS resolution bridges the gap between on-premises DNS infrastructure and AWS Route53, allowing resources in both environments to resolve each other's domain names. This is essential for hybrid cloud architectures where applications span on-premises data centers and AWS. In this guide, we will set up complete hybrid DNS resolution using Terraform with Route53 Resolver endpoints.

## How Hybrid DNS Works

In a hybrid setup, there are two DNS resolution directions. Outbound resolution allows AWS resources to resolve on-premises domain names by forwarding queries to on-premises DNS servers. Inbound resolution allows on-premises resources to resolve AWS private hosted zone names by sending queries to Route53 Resolver endpoints in your VPC.

Route53 Resolver provides the endpoints that facilitate this two-way DNS resolution.

## Prerequisites

You need Terraform 1.0 or later, an AWS account with a VPC connected to your on-premises network (via VPN or Direct Connect), and the IP addresses of your on-premises DNS servers.

## Network Foundation

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC connected to on-premises via VPN or Direct Connect
resource "aws_vpc" "hybrid" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "hybrid-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Private subnets for resolver endpoints
resource "aws_subnet" "resolver" {
  count             = 2
  vpc_id            = aws_vpc.hybrid.id
  cidr_block        = cidrsubnet(aws_vpc.hybrid.cidr_block, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "resolver-subnet-${count.index + 1}"
  }
}
```

## Security Group for Resolver Endpoints

```hcl
# Security group for Route53 Resolver endpoints
resource "aws_security_group" "resolver" {
  name_prefix = "dns-resolver-"
  vpc_id      = aws_vpc.hybrid.id
  description = "Security group for Route53 Resolver endpoints"

  # Allow DNS over UDP from VPC and on-premises
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [
      aws_vpc.hybrid.cidr_block,  # VPC CIDR
      "172.16.0.0/12",            # On-premises network CIDR
    ]
    description = "DNS UDP from VPC and on-premises"
  }

  # Allow DNS over TCP from VPC and on-premises
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [
      aws_vpc.hybrid.cidr_block,
      "172.16.0.0/12",
    ]
    description = "DNS TCP from VPC and on-premises"
  }

  # Allow all outbound for DNS responses and forwarding
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "resolver-endpoint-sg"
  }
}
```

## Outbound Resolver Endpoint

The outbound endpoint forwards DNS queries from your VPC to on-premises DNS servers.

```hcl
# Outbound Resolver Endpoint - forwards queries to on-premises DNS
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "outbound-to-onprem"
  direction = "OUTBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  # Place endpoint ENIs in at least two AZs for redundancy
  ip_address {
    subnet_id = aws_subnet.resolver[0].id
  }

  ip_address {
    subnet_id = aws_subnet.resolver[1].id
  }

  tags = {
    Name = "outbound-resolver"
  }
}
```

## Forwarding Rules for On-Premises Domains

Create forwarding rules that tell the outbound endpoint which domains to forward.

```hcl
# Forward queries for the on-premises domain to on-premises DNS servers
resource "aws_route53_resolver_rule" "onprem_forward" {
  domain_name          = "corp.internal"
  name                 = "forward-to-onprem"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  # On-premises DNS server targets
  target_ip {
    ip   = "172.16.1.10"  # Primary on-premises DNS server
    port = 53
  }

  target_ip {
    ip   = "172.16.1.11"  # Secondary on-premises DNS server
    port = 53
  }

  tags = {
    Name = "forward-corp-internal"
  }
}

# Associate the forwarding rule with the VPC
resource "aws_route53_resolver_rule_association" "onprem_forward" {
  resolver_rule_id = aws_route53_resolver_rule.onprem_forward.id
  vpc_id           = aws_vpc.hybrid.id
}

# Forward additional on-premises domains
resource "aws_route53_resolver_rule" "onprem_ad" {
  domain_name          = "ad.company.com"
  name                 = "forward-active-directory"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  target_ip {
    ip   = "172.16.1.10"
    port = 53
  }

  target_ip {
    ip   = "172.16.1.11"
    port = 53
  }

  tags = {
    Name = "forward-active-directory"
  }
}

resource "aws_route53_resolver_rule_association" "onprem_ad" {
  resolver_rule_id = aws_route53_resolver_rule.onprem_ad.id
  vpc_id           = aws_vpc.hybrid.id
}
```

## Inbound Resolver Endpoint

The inbound endpoint accepts DNS queries from on-premises networks, allowing them to resolve AWS private hosted zones.

```hcl
# Inbound Resolver Endpoint - accepts queries from on-premises
resource "aws_route53_resolver_endpoint" "inbound" {
  name      = "inbound-from-onprem"
  direction = "INBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  # Place endpoint ENIs in two AZs with specific IPs for easy configuration
  ip_address {
    subnet_id = aws_subnet.resolver[0].id
    ip        = cidrhost(aws_subnet.resolver[0].cidr_block, 10)  # Specific IP for on-premises config
  }

  ip_address {
    subnet_id = aws_subnet.resolver[1].id
    ip        = cidrhost(aws_subnet.resolver[1].cidr_block, 10)
  }

  tags = {
    Name = "inbound-resolver"
  }
}
```

## Private Hosted Zone for AWS Resources

```hcl
# Private hosted zone for AWS resources
resource "aws_route53_zone" "aws_private" {
  name = "aws.company.com"

  vpc {
    vpc_id = aws_vpc.hybrid.id
  }

  tags = {
    Name = "aws-private-zone"
  }
}

# Example records in the private zone
resource "aws_route53_record" "app_server" {
  zone_id = aws_route53_zone.aws_private.zone_id
  name    = "app.aws.company.com"
  type    = "A"
  ttl     = 300
  records = ["10.0.1.50"]
}

resource "aws_route53_record" "db_server" {
  zone_id = aws_route53_zone.aws_private.zone_id
  name    = "db.aws.company.com"
  type    = "CNAME"
  ttl     = 300
  records = ["mydb.cluster-abc123.us-east-1.rds.amazonaws.com"]
}
```

## Multi-VPC Hybrid DNS

Share forwarding rules across multiple VPCs using RAM (Resource Access Manager) or direct association.

```hcl
# Additional VPC that needs hybrid DNS
resource "aws_vpc" "additional" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "additional-vpc"
  }
}

# Associate forwarding rules with the additional VPC
resource "aws_route53_resolver_rule_association" "additional_vpc" {
  resolver_rule_id = aws_route53_resolver_rule.onprem_forward.id
  vpc_id           = aws_vpc.additional.id
}

# Share forwarding rules across accounts via RAM
resource "aws_ram_resource_share" "dns_rules" {
  name                      = "dns-resolver-rules"
  allow_external_principals = false  # Only share within the organization

  tags = {
    Name = "shared-dns-rules"
  }
}

resource "aws_ram_resource_association" "dns_rule" {
  resource_arn       = aws_route53_resolver_rule.onprem_forward.arn
  resource_share_arn = aws_ram_resource_share.dns_rules.arn
}

resource "aws_ram_principal_association" "org" {
  principal          = "arn:aws:organizations::111111111111:organization/o-abc123"
  resource_share_arn = aws_ram_resource_share.dns_rules.arn
}
```

## Conditional Forwarding for Complex Environments

```hcl
# Define multiple forwarding rules using a map
locals {
  forward_domains = {
    "corp.internal" = {
      dns_servers = ["172.16.1.10", "172.16.1.11"]
      name        = "corp-internal"
    }
    "ad.company.com" = {
      dns_servers = ["172.16.1.10", "172.16.1.11"]
      name        = "active-directory"
    }
    "legacy.internal" = {
      dns_servers = ["172.16.2.10"]
      name        = "legacy-systems"
    }
  }
}

resource "aws_route53_resolver_rule" "forward" {
  for_each = local.forward_domains

  domain_name          = each.key
  name                 = each.value.name
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  dynamic "target_ip" {
    for_each = each.value.dns_servers
    content {
      ip   = target_ip.value
      port = 53
    }
  }

  tags = {
    Name = "forward-${each.value.name}"
  }
}

resource "aws_route53_resolver_rule_association" "forward" {
  for_each = local.forward_domains

  resolver_rule_id = aws_route53_resolver_rule.forward[each.key].id
  vpc_id           = aws_vpc.hybrid.id
}
```

## Outputs

```hcl
output "inbound_resolver_ips" {
  description = "IP addresses of the inbound resolver endpoint (configure these in on-premises DNS)"
  value       = [for ip in aws_route53_resolver_endpoint.inbound.ip_address : ip.ip]
}

output "outbound_resolver_id" {
  description = "ID of the outbound resolver endpoint"
  value       = aws_route53_resolver_endpoint.outbound.id
}
```

## On-Premises DNS Configuration

After deploying the Terraform configuration, configure your on-premises DNS servers to forward queries for AWS domains to the inbound resolver endpoint IPs. For example, in a BIND DNS server, you would add a conditional forwarder for `aws.company.com` pointing to the inbound endpoint IP addresses.

## Conclusion

Hybrid DNS resolution with Terraform creates seamless name resolution between on-premises and AWS environments. By using Route53 Resolver inbound and outbound endpoints, you enable bidirectional DNS queries without modifying application code. The infrastructure-as-code approach ensures your DNS architecture is documented, version-controlled, and reproducible.

For more DNS topics, see our guide on [How to Configure Route53 Resolver with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-route53-resolver-with-terraform/view).
