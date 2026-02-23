# How to Configure Route53 Resolver with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Route53, DNS Resolver, Networking, Infrastructure as Code

Description: Learn how to configure Route53 Resolver with Terraform including resolver endpoints, forwarding rules, query logging, and firewall rules for DNS security and management.

---

Route53 Resolver is the DNS resolution service that every VPC uses by default. While it works automatically for public DNS and private hosted zones, advanced configurations like DNS forwarding, query logging, and DNS firewalls require explicit setup. This guide covers configuring Route53 Resolver features using Terraform for enterprise DNS management.

## Understanding Route53 Resolver

Every VPC has a Route53 Resolver at the VPC+2 address (for example, 10.0.0.2 in a 10.0.0.0/16 VPC). It handles DNS resolution for resources in the VPC. By default, it resolves public DNS names via the internet and private hosted zone names via Route53. Advanced features like resolver endpoints, forwarding rules, query logging, and DNS firewalls extend this functionality.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC. For forwarding rules, you need knowledge of your target DNS server addresses.

## Resolver Query Logging

Query logging captures every DNS query made within your VPC, which is invaluable for security monitoring and troubleshooting.

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC for resolver configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "resolver-vpc"
  }
}

# CloudWatch Log Group for DNS query logs
resource "aws_cloudwatch_log_group" "dns_queries" {
  name              = "/dns/query-logs"
  retention_in_days = 30

  tags = {
    Name = "dns-query-logs"
  }
}

# Resolver query log configuration
resource "aws_route53_resolver_query_log_config" "main" {
  name            = "dns-query-logging"
  destination_arn = aws_cloudwatch_log_group.dns_queries.arn

  tags = {
    Name = "dns-query-log-config"
  }
}

# Associate query logging with the VPC
resource "aws_route53_resolver_query_log_config_association" "main" {
  resolver_query_log_config_id = aws_route53_resolver_query_log_config.main.id
  resource_id                  = aws_vpc.main.id
}
```

## Query Logging to S3 for Long-Term Storage

```hcl
# S3 bucket for long-term DNS query storage
resource "aws_s3_bucket" "dns_logs" {
  bucket = "dns-query-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "dns-query-logs"
  }
}

data "aws_caller_identity" "current" {}

# S3 query log configuration
resource "aws_route53_resolver_query_log_config" "s3" {
  name            = "dns-query-logging-s3"
  destination_arn = aws_s3_bucket.dns_logs.arn

  tags = {
    Name = "dns-query-log-s3"
  }
}

resource "aws_route53_resolver_query_log_config_association" "s3" {
  resolver_query_log_config_id = aws_route53_resolver_query_log_config.s3.id
  resource_id                  = aws_vpc.main.id
}
```

## DNS Firewall with Route53 Resolver

DNS Firewall lets you filter and regulate outbound DNS traffic. It can block queries to known malicious domains.

```hcl
# Create a domain list of blocked domains
resource "aws_route53_resolver_firewall_domain_list" "blocked" {
  name    = "blocked-domains"
  domains = [
    "malware.example.com",
    "*.phishing.example.com",
    "cryptomining-pool.example.com",
  ]

  tags = {
    Name = "blocked-domains"
  }
}

# Use AWS managed domain lists for known threats
data "aws_route53_resolver_firewall_domain_list" "aws_malware" {
  # AWS provides managed domain lists that are automatically updated
  # Check available managed lists in your region
  firewall_domain_list_id = "rslvr-fdl-managed-malware"
}

# Create a domain list of allowed domains (for allowlist approach)
resource "aws_route53_resolver_firewall_domain_list" "allowed" {
  name    = "allowed-domains"
  domains = [
    "*.amazonaws.com",
    "*.example.com",
    "*.cloudfront.net",
  ]

  tags = {
    Name = "allowed-domains"
  }
}

# Create a firewall rule group
resource "aws_route53_resolver_firewall_rule_group" "main" {
  name = "main-dns-firewall"

  tags = {
    Name = "main-dns-firewall"
  }
}

# Rule to block known bad domains
resource "aws_route53_resolver_firewall_rule" "block_malware" {
  name                    = "block-malware-domains"
  action                  = "BLOCK"
  block_response          = "NXDOMAIN"  # Return NXDOMAIN for blocked queries
  firewall_domain_list_id = aws_route53_resolver_firewall_domain_list.blocked.id
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 100
}

# Rule to block with a custom response
resource "aws_route53_resolver_firewall_rule" "block_with_response" {
  name                    = "block-with-custom-response"
  action                  = "BLOCK"
  block_response          = "OVERRIDE"
  block_override_domain   = "blocked.internal.example.com"
  block_override_dns_type = "CNAME"
  block_override_ttl      = 60
  firewall_domain_list_id = aws_route53_resolver_firewall_domain_list.blocked.id
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 200
}

# Rule to alert on suspicious domains (log but allow)
resource "aws_route53_resolver_firewall_rule" "alert_suspicious" {
  name                    = "alert-suspicious"
  action                  = "ALERT"
  firewall_domain_list_id = aws_route53_resolver_firewall_domain_list.blocked.id
  firewall_rule_group_id  = aws_route53_resolver_firewall_rule_group.main.id
  priority                = 300
}

# Associate the firewall rule group with the VPC
resource "aws_route53_resolver_firewall_rule_group_association" "main" {
  name                   = "main-dns-firewall-assoc"
  firewall_rule_group_id = aws_route53_resolver_firewall_rule_group.main.id
  vpc_id                 = aws_vpc.main.id
  priority               = 100
  mutation_protection    = "ENABLED"  # Prevent accidental changes

  tags = {
    Name = "main-dns-firewall-assoc"
  }
}
```

## Resolver Endpoints for DNS Forwarding

```hcl
# Subnets for resolver endpoints
resource "aws_subnet" "resolver" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "resolver-subnet-${count.index + 1}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Security group for resolver endpoints
resource "aws_security_group" "resolver" {
  name_prefix = "resolver-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Route53 Resolver endpoints"

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12"]
    description = "DNS UDP"
  }

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12"]
    description = "DNS TCP"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "resolver-sg"
  }
}

# Outbound endpoint for forwarding DNS queries
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "outbound-resolver"
  direction = "OUTBOUND"

  security_group_ids = [aws_security_group.resolver.id]

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

# Inbound endpoint for receiving DNS queries
resource "aws_route53_resolver_endpoint" "inbound" {
  name      = "inbound-resolver"
  direction = "INBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  ip_address {
    subnet_id = aws_subnet.resolver[0].id
  }

  ip_address {
    subnet_id = aws_subnet.resolver[1].id
  }

  tags = {
    Name = "inbound-resolver"
  }
}

# Forwarding rule for a specific domain
resource "aws_route53_resolver_rule" "forward" {
  domain_name          = "internal.corp.com"
  name                 = "forward-to-corp-dns"
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
    Name = "corp-dns-forward"
  }
}

# Associate rule with VPC
resource "aws_route53_resolver_rule_association" "forward" {
  resolver_rule_id = aws_route53_resolver_rule.forward.id
  vpc_id           = aws_vpc.main.id
}
```

## DNSSEC Validation

Enable DNSSEC validation to protect against DNS spoofing.

```hcl
# Enable DNSSEC validation for the VPC
resource "aws_route53_resolver_dnssec_config" "main" {
  resource_id = aws_vpc.main.id
}
```

## Monitoring Resolver Metrics

```hcl
# Alarm for DNS firewall blocks
resource "aws_cloudwatch_metric_alarm" "dns_blocks" {
  alarm_name          = "high-dns-firewall-blocks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FirewallRuleGroupQueryBlock"
  namespace           = "AWS/Route53Resolver"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "High number of DNS queries blocked by firewall"

  dimensions = {
    FirewallRuleGroupId = aws_route53_resolver_firewall_rule_group.main.id
  }
}
```

## Outputs

```hcl
output "inbound_resolver_ips" {
  description = "Inbound resolver endpoint IP addresses"
  value       = [for ip in aws_route53_resolver_endpoint.inbound.ip_address : ip.ip]
}

output "outbound_resolver_id" {
  description = "Outbound resolver endpoint ID"
  value       = aws_route53_resolver_endpoint.outbound.id
}

output "firewall_rule_group_id" {
  description = "DNS Firewall rule group ID"
  value       = aws_route53_resolver_firewall_rule_group.main.id
}

output "query_log_config_id" {
  description = "Query log configuration ID"
  value       = aws_route53_resolver_query_log_config.main.id
}
```

## Conclusion

Route53 Resolver is more than just a basic DNS service. With Terraform, you can configure query logging for visibility, DNS firewalls for security, forwarding rules for hybrid connectivity, and DNSSEC for integrity. These features form a comprehensive DNS management and security layer for your AWS infrastructure.

For more DNS topics, check out our guide on [How to Handle DNS Zone Delegation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-dns-zone-delegation-with-terraform/view).
