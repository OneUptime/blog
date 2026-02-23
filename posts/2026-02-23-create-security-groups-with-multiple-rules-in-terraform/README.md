# How to Create Security Groups with Multiple Rules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Security Groups, VPC, Networking

Description: A practical guide to creating AWS security groups with multiple ingress and egress rules in Terraform, covering inline rules, separate rule resources, and dynamic rule generation.

---

Security groups are the workhorses of AWS network security. Every EC2 instance, RDS database, and Lambda function connected to a VPC uses them. When your security groups only have a couple of rules, defining them in Terraform is straightforward. But real-world applications need security groups with dozens of rules - different ports for different services, varying CIDR ranges, references to other security groups, and so on.

This post covers the different approaches to managing security groups with multiple rules in Terraform, along with their trade-offs.

## The Basic Approach - Inline Rules

The simplest way to define a security group with multiple rules is to put everything inline.

```hcl
# Security group for a web application server
resource "aws_security_group" "web_app" {
  name_prefix = "web-app-"
  description = "Security group for web application servers"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP from anywhere
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS from anywhere
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow SSH from the office network only
  ingress {
    description = "SSH from office"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Allow application port from the load balancer security group
  ingress {
    description     = "App port from ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all outbound traffic
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-app-sg"
  }

  # Ensure old security group is not destroyed before new one is created
  lifecycle {
    create_before_destroy = true
  }
}
```

This works fine for small rule sets, but it has a downside: any change to any rule forces Terraform to update the entire security group resource. This can cause issues when other resources reference the security group.

## Separate Rule Resources

A better approach for complex security groups is to define the security group shell separately from its rules.

```hcl
# Create the security group without any rules
resource "aws_security_group" "database" {
  name_prefix = "database-"
  description = "Security group for RDS database instances"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "database-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Allow MySQL access from web application servers
resource "aws_vpc_security_group_ingress_rule" "db_from_web" {
  security_group_id            = aws_security_group.database.id
  description                  = "MySQL from web app servers"
  from_port                    = 3306
  to_port                      = 3306
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.web_app.id
}

# Allow MySQL access from the bastion host
resource "aws_vpc_security_group_ingress_rule" "db_from_bastion" {
  security_group_id            = aws_security_group.database.id
  description                  = "MySQL from bastion"
  from_port                    = 3306
  to_port                      = 3306
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.bastion.id
}

# Allow MySQL access from the data pipeline
resource "aws_vpc_security_group_ingress_rule" "db_from_pipeline" {
  security_group_id = aws_security_group.database.id
  description       = "MySQL from data pipeline CIDR"
  from_port         = 3306
  to_port           = 3306
  ip_protocol       = "tcp"
  cidr_ipv4         = "10.0.10.0/24"
}

# Allow all outbound within the VPC
resource "aws_vpc_security_group_egress_rule" "db_outbound" {
  security_group_id = aws_security_group.database.id
  description       = "All traffic within VPC"
  ip_protocol       = "-1"
  cidr_ipv4         = "10.0.0.0/16"
}
```

Using `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` (the newer Terraform AWS provider resources) gives you granular control. Each rule is an independent resource, so updating one rule doesn't affect the others.

## Dynamic Rules with for_each

When your rules follow patterns, use `for_each` to generate them from a variable or local.

```hcl
# Define security group rules as a map
variable "web_ingress_rules" {
  description = "Map of ingress rules for the web security group"
  type = map(object({
    description = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = {
    http = {
      description = "HTTP from internet"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    https = {
      description = "HTTPS from internet"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    ssh = {
      description = "SSH from office"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
    }
    node_exporter = {
      description = "Prometheus node exporter"
      from_port   = 9100
      to_port     = 9100
      protocol    = "tcp"
      cidr_blocks = ["10.0.5.0/24"]
    }
    custom_app = {
      description = "Custom application port"
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/16"]
    }
  }
}

# Create the security group
resource "aws_security_group" "web" {
  name_prefix = "web-"
  description = "Web server security group"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "web-sg"
  }
}

# Dynamically create ingress rules from the variable map
resource "aws_vpc_security_group_ingress_rule" "web" {
  for_each = var.web_ingress_rules

  security_group_id = aws_security_group.web.id
  description       = each.value.description
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  ip_protocol       = each.value.protocol
  cidr_ipv4         = each.value.cidr_blocks[0]
}
```

## Mixing CIDR and Security Group References

Real configurations often need both CIDR-based and security group-based rules. Here's a pattern that handles both cleanly.

```hcl
# Rules that reference CIDR blocks
locals {
  cidr_rules = {
    http      = { port = 80, cidrs = ["0.0.0.0/0"] }
    https     = { port = 443, cidrs = ["0.0.0.0/0"] }
    monitoring = { port = 9090, cidrs = ["10.0.5.0/24"] }
  }

  # Rules that reference other security groups
  sg_rules = {
    app_from_alb     = { port = 8080, sg_id = aws_security_group.alb.id }
    app_from_bastion = { port = 22, sg_id = aws_security_group.bastion.id }
  }
}

# CIDR-based ingress rules
resource "aws_vpc_security_group_ingress_rule" "cidr_based" {
  for_each = local.cidr_rules

  security_group_id = aws_security_group.app.id
  from_port         = each.value.port
  to_port           = each.value.port
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value.cidrs[0]
}

# Security group-based ingress rules
resource "aws_vpc_security_group_ingress_rule" "sg_based" {
  for_each = local.sg_rules

  security_group_id            = aws_security_group.app.id
  from_port                    = each.value.port
  to_port                      = each.value.port
  ip_protocol                  = "tcp"
  referenced_security_group_id = each.value.sg_id
}
```

## Reusable Security Group Module

For teams managing many services, wrapping security group creation in a module reduces boilerplate.

```hcl
# modules/security-group/variables.tf
variable "name" {
  type        = string
  description = "Name prefix for the security group"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the security group will be created"
}

variable "ingress_rules" {
  type = list(object({
    description = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = optional(list(string), [])
    security_groups = optional(list(string), [])
  }))
  description = "List of ingress rules"
  default     = []
}

# modules/security-group/main.tf
resource "aws_security_group" "this" {
  name_prefix = "${var.name}-"
  description = "Managed security group for ${var.name}"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.name}-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Create individual ingress rules from the list
resource "aws_security_group_rule" "ingress" {
  count = length(var.ingress_rules)

  type              = "ingress"
  security_group_id = aws_security_group.this.id
  description       = var.ingress_rules[count.index].description
  from_port         = var.ingress_rules[count.index].from_port
  to_port           = var.ingress_rules[count.index].to_port
  protocol          = var.ingress_rules[count.index].protocol

  # Use CIDR blocks if provided, otherwise use security groups
  cidr_blocks             = length(var.ingress_rules[count.index].cidr_blocks) > 0 ? var.ingress_rules[count.index].cidr_blocks : null
  source_security_group_id = length(var.ingress_rules[count.index].security_groups) > 0 ? var.ingress_rules[count.index].security_groups[0] : null
}
```

Use the module like this:

```hcl
# Instantiate the security group module for an API service
module "api_sg" {
  source = "./modules/security-group"

  name   = "api-server"
  vpc_id = aws_vpc.main.id

  ingress_rules = [
    {
      description = "HTTPS from internet"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description     = "Health checks from ALB"
      from_port       = 8080
      to_port         = 8080
      protocol        = "tcp"
      security_groups = [module.alb_sg.security_group_id]
    },
  ]
}
```

## Common Mistakes to Avoid

1. **Mixing inline and separate rules** - Don't use both `ingress` blocks inside `aws_security_group` and separate `aws_security_group_rule` resources for the same security group. Terraform will fight itself trying to manage them.

2. **Forgetting `create_before_destroy`** - Without this lifecycle rule, Terraform may try to delete the security group before creating a replacement, which fails if other resources still reference it.

3. **Overly permissive egress** - Many configurations use `0.0.0.0/0` for all outbound. Consider restricting this to only the ports and destinations your application actually needs.

4. **Not using `name_prefix`** - Using `name` instead of `name_prefix` prevents `create_before_destroy` from working because security group names must be unique.

## Summary

For simple security groups with a handful of rules, inline rules work fine. For anything more complex, separate rule resources with `for_each` give you granular control and cleaner diffs. Wrapping everything in a module keeps your codebase consistent as it grows. The key is picking one approach per security group and sticking with it.

For more networking topics, see our posts on [configuring Network ACLs](https://oneuptime.com/blog/post/2026-02-23-configure-network-acls-with-terraform/view) and [referencing security groups across VPCs](https://oneuptime.com/blog/post/2026-02-23-reference-security-groups-across-vpcs-in-terraform/view).
