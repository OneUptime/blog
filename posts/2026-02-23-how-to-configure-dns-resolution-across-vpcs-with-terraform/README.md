# How to Configure DNS Resolution Across VPCs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DNS, Route 53, VPC, AWS, Networking, Private Hosted Zones

Description: Learn how to configure DNS resolution across multiple VPCs using Terraform with Route 53 private hosted zones and resolver endpoints.

---

When you operate multiple VPCs in AWS, resources in one VPC often need to resolve DNS names for services running in another VPC. By default, each VPC has its own DNS resolver that only knows about resources within that VPC. To enable cross-VPC DNS resolution, you need to configure Route 53 private hosted zones, resolver endpoints, and forwarding rules. Terraform provides a clean way to manage all these components as code.

## DNS Resolution Options in AWS

There are several approaches to cross-VPC DNS resolution. The simplest is associating a Route 53 private hosted zone with multiple VPCs. For hybrid environments that need to resolve on-premises DNS names or forward queries between VPCs, Route 53 Resolver endpoints and rules are the right choice. Each approach has its use cases, and you can combine them.

## Prerequisites

You need Terraform 1.0 or later, an AWS account with Route 53 and VPC permissions, and at least two VPCs that need to share DNS resolution.

## Sharing Private Hosted Zones Across VPCs

The most straightforward approach is to create a private hosted zone and associate it with multiple VPCs:

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC A - Application VPC
resource "aws_vpc" "app" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "app-vpc" }
}

# VPC B - Database VPC
resource "aws_vpc" "database" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "database-vpc" }
}

# VPC C - Shared Services VPC
resource "aws_vpc" "shared" {
  cidr_block           = "10.2.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "shared-vpc" }
}

# Private hosted zone for internal services
resource "aws_route53_zone" "internal" {
  name = "internal.example.com"

  # Primary VPC association (required)
  vpc {
    vpc_id = aws_vpc.app.id
  }

  # Prevent Terraform from removing additional VPC associations
  lifecycle {
    ignore_changes = [vpc]
  }

  tags = {
    Name = "internal-hosted-zone"
  }
}

# Associate the hosted zone with additional VPCs
resource "aws_route53_zone_association" "database" {
  zone_id = aws_route53_zone.internal.zone_id
  vpc_id  = aws_vpc.database.id
}

resource "aws_route53_zone_association" "shared" {
  zone_id = aws_route53_zone.internal.zone_id
  vpc_id  = aws_vpc.shared.id
}

# Create DNS records in the private hosted zone
resource "aws_route53_record" "db_primary" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "db-primary.internal.example.com"
  type    = "A"
  ttl     = 300
  records = ["10.1.1.100"]
}

resource "aws_route53_record" "cache" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "cache.internal.example.com"
  type    = "A"
  ttl     = 300
  records = ["10.2.1.50"]
}
```

Now any resource in any of the three VPCs can resolve `db-primary.internal.example.com` or `cache.internal.example.com`.

## Cross-Account Private Hosted Zone Association

When VPCs are in different accounts, you need to create an authorization and then accept it:

```hcl
# In the account that owns the hosted zone
resource "aws_route53_vpc_association_authorization" "cross_account" {
  vpc_id  = aws_vpc.remote.id
  zone_id = aws_route53_zone.internal.zone_id

  # Specify the VPC region if it differs
  vpc_region = "us-east-1"
}

# In the remote account, accept the association
resource "aws_route53_zone_association" "cross_account" {
  provider = aws.remote_account

  vpc_id  = aws_vpc.remote.id
  zone_id = aws_route53_zone.internal.zone_id
}
```

## Setting Up Route 53 Resolver Endpoints

For more complex scenarios, Route 53 Resolver endpoints allow you to forward DNS queries between VPCs, to on-premises DNS servers, or from on-premises to AWS:

```hcl
# Subnets for resolver endpoints (need at least 2 AZs)
resource "aws_subnet" "resolver_a" {
  vpc_id            = aws_vpc.shared.id
  cidr_block        = "10.2.10.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "resolver-subnet-a" }
}

resource "aws_subnet" "resolver_b" {
  vpc_id            = aws_vpc.shared.id
  cidr_block        = "10.2.11.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "resolver-subnet-b" }
}

# Security group for resolver endpoints
resource "aws_security_group" "resolver" {
  name   = "resolver-sg"
  vpc_id = aws_vpc.shared.id

  # Allow DNS traffic (TCP and UDP on port 53)
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Allow DNS TCP"
  }

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Allow DNS UDP"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "resolver-sg" }
}

# Inbound resolver endpoint (receives DNS queries from other networks)
resource "aws_route53_resolver_endpoint" "inbound" {
  name      = "inbound-resolver"
  direction = "INBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  ip_address {
    subnet_id = aws_subnet.resolver_a.id
    ip        = "10.2.10.10"
  }

  ip_address {
    subnet_id = aws_subnet.resolver_b.id
    ip        = "10.2.11.10"
  }

  tags = { Name = "inbound-resolver" }
}

# Outbound resolver endpoint (sends DNS queries to other networks)
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "outbound-resolver"
  direction = "OUTBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  ip_address {
    subnet_id = aws_subnet.resolver_a.id
    ip        = "10.2.10.20"
  }

  ip_address {
    subnet_id = aws_subnet.resolver_b.id
    ip        = "10.2.11.20"
  }

  tags = { Name = "outbound-resolver" }
}
```

## Creating Resolver Forwarding Rules

Forwarding rules tell the resolver where to send DNS queries for specific domains:

```hcl
# Forward queries for on-premises domains to the corporate DNS server
resource "aws_route53_resolver_rule" "onprem_forward" {
  domain_name          = "corp.example.com"
  name                 = "forward-to-onprem"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  target_ip {
    ip   = "192.168.1.10"
    port = 53
  }

  target_ip {
    ip   = "192.168.1.11"
    port = 53
  }

  tags = { Name = "onprem-forward-rule" }
}

# Forward queries for a partner domain
resource "aws_route53_resolver_rule" "partner_forward" {
  domain_name          = "partner.example.net"
  name                 = "forward-to-partner"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  target_ip {
    ip   = "172.16.0.53"
    port = 53
  }

  tags = { Name = "partner-forward-rule" }
}
```

## Associating Resolver Rules with VPCs

Associate the forwarding rules with each VPC that needs to use them:

```hcl
# Associate the on-prem forward rule with all VPCs
resource "aws_route53_resolver_rule_association" "onprem_app" {
  resolver_rule_id = aws_route53_resolver_rule.onprem_forward.id
  vpc_id           = aws_vpc.app.id
}

resource "aws_route53_resolver_rule_association" "onprem_database" {
  resolver_rule_id = aws_route53_resolver_rule.onprem_forward.id
  vpc_id           = aws_vpc.database.id
}

resource "aws_route53_resolver_rule_association" "onprem_shared" {
  resolver_rule_id = aws_route53_resolver_rule.onprem_forward.id
  vpc_id           = aws_vpc.shared.id
}
```

## Sharing Resolver Rules Across Accounts

Use RAM to share resolver rules with other accounts:

```hcl
# Share the resolver rule with other accounts
resource "aws_ram_resource_share" "resolver_rules" {
  name                      = "resolver-rules-share"
  allow_external_principals = false

  tags = { Name = "resolver-rules-share" }
}

resource "aws_ram_resource_association" "onprem_rule" {
  resource_arn       = aws_route53_resolver_rule.onprem_forward.arn
  resource_share_arn = aws_ram_resource_share.resolver_rules.arn
}

resource "aws_ram_principal_association" "other_account" {
  principal          = "222222222222"
  resource_share_arn = aws_ram_resource_share.resolver_rules.arn
}
```

## Resolver Query Logging

Enable query logging to track DNS resolution across your VPCs:

```hcl
# CloudWatch log group for DNS query logs
resource "aws_cloudwatch_log_group" "dns_queries" {
  name              = "/aws/route53resolver/queries"
  retention_in_days = 30
}

# Resolver query log configuration
resource "aws_route53_resolver_query_log_config" "main" {
  name            = "dns-query-logging"
  destination_arn = aws_cloudwatch_log_group.dns_queries.arn

  tags = { Name = "dns-query-logging" }
}

# Associate query logging with VPCs
resource "aws_route53_resolver_query_log_config_association" "app" {
  resolver_query_log_config_id = aws_route53_resolver_query_log_config.main.id
  resource_id                  = aws_vpc.app.id
}

resource "aws_route53_resolver_query_log_config_association" "database" {
  resolver_query_log_config_id = aws_route53_resolver_query_log_config.main.id
  resource_id                  = aws_vpc.database.id
}
```

## Outputs

```hcl
output "inbound_resolver_ips" {
  description = "IP addresses of the inbound resolver endpoint"
  value       = aws_route53_resolver_endpoint.inbound.ip_address
}

output "private_hosted_zone_id" {
  description = "ID of the internal private hosted zone"
  value       = aws_route53_zone.internal.zone_id
}
```

## Monitoring DNS Resolution

Track DNS resolution health and query patterns using [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-dns-resolution-across-vpcs-with-terraform/view) to identify resolution failures and latency issues across your VPCs.

## Best Practices

Always enable DNS support and DNS hostnames on VPCs that need cross-VPC resolution. Use private hosted zones for simple scenarios and resolver endpoints for complex or hybrid setups. Enable query logging to debug resolution issues. Place resolver endpoints in at least two availability zones for high availability. Use RAM to share resolver rules across accounts in an AWS Organization.

## Conclusion

DNS resolution across VPCs with Terraform provides a unified naming system for your distributed AWS infrastructure. Whether you use private hosted zones for straightforward cross-VPC resolution or Route 53 Resolver endpoints for hybrid environments, Terraform ensures your DNS configuration is consistent, version-controlled, and reproducible. This is essential for maintaining service discovery and connectivity in complex multi-VPC architectures.
