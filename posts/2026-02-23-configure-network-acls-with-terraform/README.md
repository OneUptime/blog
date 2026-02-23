# How to Configure Network ACLs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, VPC, Networking, Security

Description: Learn how to create and configure AWS Network ACLs using Terraform, including inbound and outbound rules, subnet associations, and best practices for network security.

---

Network Access Control Lists (NACLs) are one of the foundational security layers in AWS VPCs. They act as stateless firewalls at the subnet level, controlling traffic before it even reaches your security groups. While security groups get most of the attention, NACLs give you an extra line of defense that can block entire IP ranges or ports across all resources in a subnet.

Managing NACLs through the AWS console is doable but painful - especially when you have dozens of rules across multiple subnets. Terraform makes this much cleaner by letting you define all your NACL rules as code, review them in pull requests, and apply them consistently.

## How NACLs Differ from Security Groups

Before jumping into Terraform code, it helps to understand what makes NACLs different from security groups:

- NACLs are **stateless** - you need explicit rules for both inbound and outbound traffic
- NACLs operate at the **subnet level**, not the instance level
- Rules are **evaluated in order** by rule number (lowest first)
- NACLs have explicit **deny** rules, which security groups lack
- Each subnet can only be associated with **one NACL**

These differences matter when you write your Terraform configurations. Forgetting an outbound rule is a common mistake since security groups handle return traffic automatically, but NACLs do not.

## Basic NACL Configuration

Let's start with a simple NACL that allows HTTP, HTTPS, and SSH traffic. First, you need a VPC and subnet in place.

```hcl
# Define the AWS provider
provider "aws" {
  region = "us-east-1"
}

# Create a VPC for our resources
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

# Create a public subnet
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "public-subnet"
  }
}

# Create a Network ACL for the public subnet
resource "aws_network_acl" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "public-nacl"
  }
}

# Associate the NACL with the public subnet
resource "aws_network_acl_association" "public" {
  network_acl_id = aws_network_acl.public.id
  subnet_id      = aws_subnet.public.id
}
```

Now add the inbound rules. Remember, NACLs evaluate rules by number starting from the lowest, so leave gaps between rule numbers to make future insertions easier.

```hcl
# Allow inbound HTTP traffic
resource "aws_network_acl_rule" "inbound_http" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 80
  to_port        = 80
}

# Allow inbound HTTPS traffic
resource "aws_network_acl_rule" "inbound_https" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 110
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

# Allow inbound SSH from a specific CIDR
resource "aws_network_acl_rule" "inbound_ssh" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 120
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "10.0.0.0/8"  # Restrict SSH to internal networks
  from_port      = 22
  to_port        = 22
}

# Allow inbound ephemeral ports for return traffic
# This is critical because NACLs are stateless
resource "aws_network_acl_rule" "inbound_ephemeral" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 200
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}
```

The ephemeral ports rule is the one people commonly forget. Without it, responses to outbound connections will be blocked.

## Outbound Rules

Since NACLs are stateless, you need matching outbound rules.

```hcl
# Allow outbound HTTP
resource "aws_network_acl_rule" "outbound_http" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 80
  to_port        = 80
}

# Allow outbound HTTPS
resource "aws_network_acl_rule" "outbound_https" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 110
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

# Allow outbound ephemeral ports for responses to inbound requests
resource "aws_network_acl_rule" "outbound_ephemeral" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 200
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}
```

## Using Inline Rules

For simpler setups, you can define rules inline within the `aws_network_acl` resource instead of using separate `aws_network_acl_rule` resources.

```hcl
# NACL with inline rules - simpler but less flexible
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.private.id]

  # Allow inbound traffic from the VPC CIDR
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 0
    to_port    = 65535
  }

  # Allow outbound traffic to the VPC CIDR
  egress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 0
    to_port    = 65535
  }

  # Allow outbound HTTPS for package updates
  egress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  tags = {
    Name = "private-nacl"
  }
}
```

The inline approach is fine for straightforward configurations, but separate rule resources give you more control when you need to conditionally add rules or manage them independently.

## Dynamic Rules with for_each

When you have many similar rules, `for_each` keeps things DRY.

```hcl
# Define allowed inbound ports as a local variable
locals {
  inbound_ports = {
    http  = { port = 80, cidr = "0.0.0.0/0" }
    https = { port = 443, cidr = "0.0.0.0/0" }
    ssh   = { port = 22, cidr = "10.0.0.0/8" }
    mysql = { port = 3306, cidr = "10.0.0.0/16" }
  }
}

# Create inbound rules dynamically from the local variable
resource "aws_network_acl_rule" "inbound_rules" {
  for_each = local.inbound_ports

  network_acl_id = aws_network_acl.public.id
  rule_number    = 100 + index(keys(local.inbound_ports), each.key) * 10
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = each.value.cidr
  from_port      = each.value.port
  to_port        = each.value.port
}
```

## Blocking Specific IP Ranges

One of the most practical uses for NACLs is blocking known malicious IP ranges. Since NACLs support deny rules (unlike security groups), you can block traffic before it reaches any instance.

```hcl
# Define blocked CIDR ranges
variable "blocked_cidrs" {
  type = list(string)
  default = [
    "198.51.100.0/24",  # Known bad actor range
    "203.0.113.0/24",   # Another blocked range
  ]
}

# Create deny rules for each blocked CIDR
# Low rule numbers ensure these are evaluated first
resource "aws_network_acl_rule" "block_bad_ips" {
  count = length(var.blocked_cidrs)

  network_acl_id = aws_network_acl.public.id
  rule_number    = 50 + count.index  # Rules 50, 51, etc.
  egress         = false
  protocol       = "-1"              # All protocols
  rule_action    = "deny"
  cidr_block     = var.blocked_cidrs[count.index]
  from_port      = 0
  to_port        = 0
}
```

Placing deny rules at low rule numbers (50, 51, etc.) ensures they get evaluated before any allow rules.

## Multi-Subnet NACL Configuration

In a typical three-tier architecture, you'll have different NACLs for public, private, and database subnets.

```hcl
# Map of NACL configurations per tier
locals {
  nacl_configs = {
    public = {
      subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]
      inbound_rules = [
        { rule_no = 100, protocol = "tcp", action = "allow", cidr = "0.0.0.0/0", from_port = 80, to_port = 80 },
        { rule_no = 110, protocol = "tcp", action = "allow", cidr = "0.0.0.0/0", from_port = 443, to_port = 443 },
        { rule_no = 200, protocol = "tcp", action = "allow", cidr = "0.0.0.0/0", from_port = 1024, to_port = 65535 },
      ]
    }
    private = {
      subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
      inbound_rules = [
        { rule_no = 100, protocol = "tcp", action = "allow", cidr = "10.0.0.0/16", from_port = 0, to_port = 65535 },
      ]
    }
    database = {
      subnet_ids = [aws_subnet.db_a.id, aws_subnet.db_b.id]
      inbound_rules = [
        { rule_no = 100, protocol = "tcp", action = "allow", cidr = "10.0.2.0/24", from_port = 3306, to_port = 3306 },
        { rule_no = 110, protocol = "tcp", action = "allow", cidr = "10.0.3.0/24", from_port = 3306, to_port = 3306 },
      ]
    }
  }
}

# Create a NACL for each tier
resource "aws_network_acl" "tier" {
  for_each = local.nacl_configs

  vpc_id     = aws_vpc.main.id
  subnet_ids = each.value.subnet_ids

  tags = {
    Name = "${each.key}-nacl"
    Tier = each.key
  }
}
```

## Troubleshooting Tips

When traffic isn't flowing as expected, check these common issues:

1. **Missing ephemeral port rules** - The most frequent problem. Both inbound and outbound ephemeral ports (1024-65535) need to be open for TCP return traffic.

2. **Rule ordering** - A deny rule with a lower number than your allow rule will block the traffic. Always verify rule numbers.

3. **Subnet association** - Each subnet can only have one NACL. If you replace a NACL association, the old one is removed automatically.

4. **IPv6** - If your VPC uses IPv6, you need separate rules with `ipv6_cidr_block` instead of `cidr_block`.

You can verify your NACL configuration with the AWS CLI:

```bash
# List all NACLs in a VPC
aws ec2 describe-network-acls --filters "Name=vpc-id,Values=vpc-xxxx"

# Check which NACL is associated with a subnet
aws ec2 describe-network-acls --filters "Name=association.subnet-id,Values=subnet-xxxx"
```

## Wrapping Up

Network ACLs provide subnet-level security that complements your security groups. They're particularly useful for blocking known bad IP ranges, enforcing network segmentation between tiers, and adding defense-in-depth to your VPC architecture. Terraform makes managing these rules straightforward, especially when you use `for_each` and locals to keep configurations clean.

For related infrastructure topics, check out our guide on [creating security groups with multiple rules in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-security-groups-with-multiple-rules-in-terraform/view) and [referencing security groups across VPCs](https://oneuptime.com/blog/post/2026-02-23-reference-security-groups-across-vpcs-in-terraform/view).
