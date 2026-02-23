# How to Create IP Allowlisting Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, IP Allowlisting, Security, AWS, WAF, Security Groups, Networking

Description: Learn how to build a complete IP allowlisting infrastructure with Terraform using security groups, NACLs, WAF, and prefix lists for secure access control.

---

IP allowlisting restricts access to your infrastructure to a predefined set of trusted IP addresses. This is a fundamental security measure for protecting admin panels, internal APIs, CI/CD endpoints, and database access. Instead of manually managing IP rules across multiple security groups and services, Terraform lets you define your allowlist centrally and apply it consistently across all your resources. In this guide, we will build a comprehensive IP allowlisting infrastructure using multiple AWS services.

## Why Centralized IP Allowlisting

Managing IP allowlists manually across dozens of security groups, NACLs, and WAF rules leads to inconsistencies and security gaps. A centralized approach in Terraform means you define your trusted IPs once and reference them everywhere. When you need to add or remove an IP, you change it in one place, and Terraform propagates the change across all resources.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and knowledge of which IP addresses or CIDR ranges should be allowlisted.

## Defining the Central IP Allowlist

Start with a variable that holds all trusted IP addresses:

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

# Central IP allowlist definition
variable "allowed_ips" {
  description = "Map of allowed IP ranges with descriptions"
  type = map(object({
    cidr        = string
    description = string
  }))
  default = {
    "office-main" = {
      cidr        = "203.0.113.0/24"
      description = "Main office network"
    }
    "office-branch" = {
      cidr        = "198.51.100.0/24"
      description = "Branch office network"
    }
    "vpn-exit" = {
      cidr        = "192.0.2.10/32"
      description = "VPN exit node"
    }
    "ci-cd" = {
      cidr        = "192.0.2.20/32"
      description = "CI/CD pipeline"
    }
    "monitoring" = {
      cidr        = "192.0.2.30/32"
      description = "Monitoring service"
    }
  }
}

# Extract just the CIDR blocks for use in resources
locals {
  allowed_cidrs = [for ip in var.allowed_ips : ip.cidr]
}
```

## Using AWS Managed Prefix Lists

Prefix lists provide a reusable set of CIDR blocks that can be referenced in security groups and route tables:

```hcl
# Create a managed prefix list
resource "aws_ec2_managed_prefix_list" "allowed_ips" {
  name           = "allowed-ip-ranges"
  address_family = "IPv4"
  max_entries    = 20

  dynamic "entry" {
    for_each = var.allowed_ips
    content {
      cidr        = entry.value.cidr
      description = entry.value.description
    }
  }

  tags = { Name = "allowed-ip-ranges" }
}
```

## Security Groups with IP Allowlisting

Create security groups that reference the prefix list or the IP list directly:

```hcl
# VPC reference
data "aws_vpc" "main" {
  tags = { Name = "main-vpc" }
}

# Security group using the prefix list
resource "aws_security_group" "admin" {
  name   = "admin-allowlist-sg"
  vpc_id = data.aws_vpc.main.id

  # Allow HTTPS from the prefix list
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_ec2_managed_prefix_list.allowed_ips.id]
    description     = "HTTPS from allowed IPs"
  }

  # Allow SSH from the prefix list
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    prefix_list_ids = [aws_ec2_managed_prefix_list.allowed_ips.id]
    description     = "SSH from allowed IPs"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "admin-allowlist-sg" }
}

# Security group using CIDR blocks directly
resource "aws_security_group" "api" {
  name   = "api-allowlist-sg"
  vpc_id = data.aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.allowed_ips
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value.cidr]
      description = "HTTPS from ${ingress.value.description}"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "api-allowlist-sg" }
}
```

## WAF IP Set for Application Layer Filtering

Create a WAF IP set for web application firewall rules:

```hcl
# WAF IP set for allowed addresses
resource "aws_wafv2_ip_set" "allowed" {
  name               = "allowed-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = local.allowed_cidrs

  tags = { Name = "allowed-ips" }
}

# WAF web ACL with IP allowlist rule
resource "aws_wafv2_web_acl" "admin" {
  name  = "admin-ip-allowlist"
  scope = "REGIONAL"

  default_action {
    block {}
  }

  # Allow traffic from allowlisted IPs
  rule {
    name     = "allow-trusted-ips"
    priority = 1

    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.allowed.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AllowTrustedIPs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "AdminIPAllowlist"
    sampled_requests_enabled   = true
  }

  tags = { Name = "admin-ip-allowlist" }
}

# Associate the WAF ACL with an ALB
resource "aws_wafv2_web_acl_association" "admin_alb" {
  resource_arn = aws_lb.admin.arn
  web_acl_arn  = aws_wafv2_web_acl.admin.arn
}
```

## Network ACLs for Subnet-Level Filtering

Add NACL rules for defense in depth:

```hcl
# Network ACL for admin subnet
resource "aws_network_acl" "admin" {
  vpc_id     = data.aws_vpc.main.id
  subnet_ids = [aws_subnet.admin.id]

  tags = { Name = "admin-nacl" }
}

# Allow inbound from each trusted IP range
resource "aws_network_acl_rule" "allow_inbound" {
  for_each = var.allowed_ips

  network_acl_id = aws_network_acl.admin.id
  rule_number    = 100 + index(keys(var.allowed_ips), each.key)
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = each.value.cidr
  from_port      = 443
  to_port        = 443
}

# Deny all other inbound HTTPS
resource "aws_network_acl_rule" "deny_inbound" {
  network_acl_id = aws_network_acl.admin.id
  rule_number    = 200
  egress         = false
  protocol       = "tcp"
  rule_action    = "deny"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

# Allow outbound responses
resource "aws_network_acl_rule" "allow_outbound" {
  network_acl_id = aws_network_acl.admin.id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}
```

## API Gateway Resource Policy

Restrict API Gateway access to specific IPs:

```hcl
# API Gateway with IP-based resource policy
resource "aws_api_gateway_rest_api" "admin" {
  name = "admin-api"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "execute-api:Invoke"
        Resource  = "execute-api:/*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = local.allowed_cidrs
          }
        }
      }
    ]
  })
}
```

## Sharing Prefix Lists Across Accounts

Share your IP allowlist across accounts using RAM:

```hcl
# Share the prefix list across accounts
resource "aws_ram_resource_share" "prefix_list" {
  name                      = "ip-allowlist-share"
  allow_external_principals = false

  tags = { Name = "ip-allowlist-share" }
}

resource "aws_ram_resource_association" "prefix_list" {
  resource_arn       = aws_ec2_managed_prefix_list.allowed_ips.arn
  resource_share_arn = aws_ram_resource_share.prefix_list.arn
}

resource "aws_ram_principal_association" "other_accounts" {
  principal          = "arn:aws:organizations::111111111111:ou/o-example/ou-abc123"
  resource_share_arn = aws_ram_resource_share.prefix_list.arn
}
```

## Outputs

```hcl
output "prefix_list_id" {
  description = "ID of the managed prefix list"
  value       = aws_ec2_managed_prefix_list.allowed_ips.id
}

output "waf_ip_set_arn" {
  description = "ARN of the WAF IP set"
  value       = aws_wafv2_ip_set.allowed.arn
}

output "allowed_cidrs" {
  description = "List of allowed CIDR ranges"
  value       = local.allowed_cidrs
}
```

## Monitoring IP Allowlisting

Monitor blocked access attempts with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ip-allowlisting-infrastructure-with-terraform/view) to identify unauthorized access attempts and verify that your allowlist is working correctly.

## Best Practices

Define your allowlist in one place and reference it everywhere. Use prefix lists for security groups. Use WAF IP sets for application-layer protection. Layer your defenses with NACLs, security groups, and WAF rules. Review and audit your allowlist regularly. Document the purpose of each IP range.

## Conclusion

IP allowlisting infrastructure with Terraform provides centralized, consistent access control across your AWS environment. By defining trusted IPs once and applying them through prefix lists, security groups, WAF rules, and NACLs, you ensure comprehensive protection. Terraform makes this manageable and auditable, with every change tracked in version control.
