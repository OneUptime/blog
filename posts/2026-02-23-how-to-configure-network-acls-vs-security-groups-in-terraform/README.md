# How to Configure Network ACLs vs Security Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Network ACLs, Security Groups, AWS, VPC, Networking, Security

Description: Learn the differences between Network ACLs and Security Groups in AWS and how to configure both effectively with Terraform for layered network security.

---

Network ACLs (NACLs) and Security Groups are two complementary layers of network security in AWS VPCs, but they work quite differently. Security Groups are stateful, operate at the instance level, and only support allow rules. Network ACLs are stateless, operate at the subnet level, and support both allow and deny rules. Understanding when and how to use each is essential for building a secure network. Terraform lets you manage both as code, ensuring your security posture is consistent and auditable.

## Key Differences

Security Groups are stateful, meaning if you allow an inbound request, the response is automatically allowed regardless of outbound rules. NACLs are stateless, so you must explicitly allow both the inbound request and the outbound response. Security Groups apply to individual instances (ENIs), while NACLs apply to all resources in a subnet. Security Groups only have allow rules, but NACLs can have both allow and deny rules with priority ordering.

Another important difference: Security Groups evaluate all rules before making a decision, while NACLs evaluate rules in order of their rule number and stop at the first match.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with subnets.

## Setting Up the VPC

Create a VPC with multiple subnets:

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

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "main-vpc" }
}

# Public subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = { Name = "public-subnet" }
}

# Private application subnet
resource "aws_subnet" "app" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "app-subnet" }
}

# Private database subnet
resource "aws_subnet" "database" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.20.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "database-subnet" }
}
```

## Security Groups - Best for Instance-Level Control

Security Groups are the primary mechanism for controlling traffic to individual resources:

```hcl
# Security group for the web tier (ALB)
resource "aws_security_group" "web" {
  name        = "web-tier-sg"
  description = "Security group for the web tier"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from internet"
  }

  # Allow HTTPS from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  # All outbound traffic allowed
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "web-tier-sg" }
}

# Security group for the application tier
resource "aws_security_group" "app" {
  name        = "app-tier-sg"
  description = "Security group for the application tier"
  vpc_id      = aws_vpc.main.id

  # Allow traffic only from the web tier security group
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
    description     = "App port from web tier"
  }

  # Allow health checks from the web tier
  ingress {
    from_port       = 8081
    to_port         = 8081
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
    description     = "Health check from web tier"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "app-tier-sg" }
}

# Security group for the database tier
resource "aws_security_group" "database" {
  name        = "database-tier-sg"
  description = "Security group for the database tier"
  vpc_id      = aws_vpc.main.id

  # Allow PostgreSQL only from the app tier
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app tier"
  }

  # No direct outbound internet access
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Response to app tier"
  }

  tags = { Name = "database-tier-sg" }
}
```

Notice how Security Groups can reference other Security Groups. This is a powerful feature that allows you to express relationships like "the database only accepts connections from the application tier" without specifying IP addresses.

## Network ACLs - Best for Subnet-Level Control

NACLs provide a broad protective layer at the subnet boundary:

```hcl
# Network ACL for the public subnet
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.public.id]

  tags = { Name = "public-nacl" }
}

# Allow inbound HTTP
resource "aws_network_acl_rule" "public_http_in" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 80
  to_port        = 80
}

# Allow inbound HTTPS
resource "aws_network_acl_rule" "public_https_in" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 110
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

# Allow inbound ephemeral ports (for responses)
resource "aws_network_acl_rule" "public_ephemeral_in" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 120
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

# Allow outbound to the app subnet
resource "aws_network_acl_rule" "public_to_app_out" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = aws_subnet.app.cidr_block
  from_port      = 8080
  to_port        = 8080
}

# Allow outbound ephemeral ports (for responses to clients)
resource "aws_network_acl_rule" "public_ephemeral_out" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 110
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

# Allow outbound HTTPS (for updates, etc.)
resource "aws_network_acl_rule" "public_https_out" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 120
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}
```

```hcl
# Network ACL for the database subnet (strict)
resource "aws_network_acl" "database" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.database.id]

  tags = { Name = "database-nacl" }
}

# Allow inbound PostgreSQL from app subnet only
resource "aws_network_acl_rule" "db_postgres_in" {
  network_acl_id = aws_network_acl.database.id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = aws_subnet.app.cidr_block
  from_port      = 5432
  to_port        = 5432
}

# DENY all other inbound traffic
# (This is implicit with NACLs but being explicit helps documentation)
resource "aws_network_acl_rule" "db_deny_all_in" {
  network_acl_id = aws_network_acl.database.id
  rule_number    = 200
  egress         = false
  protocol       = "-1"
  rule_action    = "deny"
  cidr_block     = "0.0.0.0/0"
  from_port      = 0
  to_port        = 0
}

# Allow outbound ephemeral ports to app subnet (for responses)
resource "aws_network_acl_rule" "db_ephemeral_out" {
  network_acl_id = aws_network_acl.database.id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = aws_subnet.app.cidr_block
  from_port      = 1024
  to_port        = 65535
}

# DENY all other outbound
resource "aws_network_acl_rule" "db_deny_all_out" {
  network_acl_id = aws_network_acl.database.id
  rule_number    = 200
  egress         = true
  protocol       = "-1"
  rule_action    = "deny"
  cidr_block     = "0.0.0.0/0"
  from_port      = 0
  to_port        = 0
}
```

## Using NACLs to Block Specific IPs

One of the unique capabilities of NACLs is the ability to deny specific IPs:

```hcl
variable "blocked_ips" {
  description = "IP addresses to block at the NACL level"
  type = map(string)
  default = {
    "attacker-1" = "198.51.100.50/32"
    "attacker-2" = "203.0.113.100/32"
  }
}

# Block specific IPs (low rule numbers = evaluated first)
resource "aws_network_acl_rule" "block_ips" {
  for_each = var.blocked_ips

  network_acl_id = aws_network_acl.public.id
  rule_number    = 50 + index(keys(var.blocked_ips), each.key)
  egress         = false
  protocol       = "-1"
  rule_action    = "deny"
  cidr_block     = each.value
  from_port      = 0
  to_port        = 0
}
```

## Combining Both for Defense in Depth

The recommended approach is to use both Security Groups and NACLs together:

```hcl
# The layered security architecture:
#
# Layer 1: NACL (subnet level)
#   - Broad rules for subnet boundary
#   - Block known bad IPs
#   - Control traffic between subnets
#
# Layer 2: Security Group (instance level)
#   - Fine-grained rules per resource type
#   - Reference other security groups
#   - Stateful (simpler to manage)
```

## Dynamic Security Group Rules

Use dynamic blocks for managing security group rules from variables:

```hcl
variable "app_ingress_rules" {
  description = "Ingress rules for the app security group"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = ["10.0.1.0/24"]
      description = "App port from public subnet"
    },
    {
      from_port   = 8081
      to_port     = 8081
      protocol    = "tcp"
      cidr_blocks = ["10.0.1.0/24"]
      description = "Health check from public subnet"
    }
  ]
}

resource "aws_security_group" "app_dynamic" {
  name   = "app-dynamic-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.app_ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "app-dynamic-sg" }
}
```

## Outputs

```hcl
output "web_sg_id" {
  description = "Web tier security group ID"
  value       = aws_security_group.web.id
}

output "app_sg_id" {
  description = "App tier security group ID"
  value       = aws_security_group.app.id
}

output "database_sg_id" {
  description = "Database tier security group ID"
  value       = aws_security_group.database.id
}

output "public_nacl_id" {
  description = "Public subnet NACL ID"
  value       = aws_network_acl.public.id
}
```

## Monitoring Network Security

Monitor your network security rules with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-network-acls-vs-security-groups-in-terraform/view) to detect connectivity issues and verify that traffic flows match your security expectations.

## Best Practices

Use Security Groups as your primary access control mechanism since they are stateful and easier to manage. Use NACLs as an additional defense layer for subnet-level protection. Leverage Security Group references instead of CIDR blocks when possible. Keep NACL rules simple and focused on broad protections. Remember to allow ephemeral ports in NACLs for return traffic. Number NACL rules with gaps (100, 110, 120) to allow inserting new rules later.

## Conclusion

Understanding the differences between NACLs and Security Groups is essential for building secure AWS networks. With Terraform, you can manage both layers declaratively, ensuring your defense-in-depth strategy is consistent and auditable. Security Groups handle the fine-grained, instance-level access control, while NACLs provide the broad subnet-level protection and the ability to explicitly deny traffic. Using both together gives you the strongest network security posture.
