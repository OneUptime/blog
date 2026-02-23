# How to Implement Security Groups Best Practices with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Security Groups, Networking, Security

Description: Learn how to manage AWS security groups with Terraform following best practices for least privilege, rule organization, and avoiding common pitfalls.

---

Security groups are the first line of defense for your AWS resources. They act as virtual firewalls that control inbound and outbound traffic at the instance level. Managing them with Terraform gives you version control, repeatability, and audit trails, but only if you follow the right patterns. Poorly managed security groups are one of the most common sources of cloud security incidents.

This guide covers practical patterns for managing security groups in Terraform that will keep your infrastructure secure and your configurations maintainable.

## Use Separate Security Group Rules

One of the biggest mistakes teams make is defining security group rules inline within the `aws_security_group` resource. This causes problems with rule ordering, makes it hard to manage rules from multiple sources, and can lead to unexpected replacements.

```hcl
# Avoid this pattern - inline rules cause issues
resource "aws_security_group" "bad_example" {
  name = "bad-example"

  # Inline rules are hard to manage and compose
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Instead, use separate `aws_security_group_rule` or `aws_vpc_security_group_ingress_rule` resources:

```hcl
# Create the security group without inline rules
resource "aws_security_group" "web" {
  name        = "${var.project}-web-sg"
  description = "Security group for web tier instances"
  vpc_id      = var.vpc_id

  tags = {
    Name        = "${var.project}-web-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Prevent Terraform from reverting manual emergency changes
  lifecycle {
    create_before_destroy = true
  }
}

# Define rules as separate resources
resource "aws_vpc_security_group_ingress_rule" "web_https" {
  security_group_id = aws_security_group.web.id
  description       = "Allow HTTPS from the internet"

  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name = "web-https-ingress"
  }
}

resource "aws_vpc_security_group_ingress_rule" "web_http" {
  security_group_id = aws_security_group.web.id
  description       = "Allow HTTP for redirect to HTTPS"

  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name = "web-http-ingress"
  }
}
```

## Never Use 0.0.0.0/0 for Non-Public Services

This seems obvious, but it comes up constantly in real-world audits. Only load balancers and similar public-facing services should accept traffic from anywhere. Everything else should be locked down to specific CIDR ranges or security groups.

```hcl
# Database security group - only accessible from app tier
resource "aws_security_group" "database" {
  name        = "${var.project}-database-sg"
  description = "Security group for database instances"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project}-database-sg"
  }
}

# Only allow connections from the application security group
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id = aws_security_group.database.id
  description       = "Allow PostgreSQL from application tier"

  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id

  tags = {
    Name = "db-postgres-from-app"
  }
}
```

Using security group references instead of CIDR blocks is better because the rules automatically apply to any instance that joins or leaves the referenced group.

## Implement a Layered Security Group Architecture

Design your security groups in layers that match your application architecture:

```hcl
# Layer 1: ALB security group (public-facing)
resource "aws_security_group" "alb" {
  name        = "${var.project}-alb-sg"
  description = "Security group for application load balancer"
  vpc_id      = var.vpc_id
}

# Layer 2: Application security group (only from ALB)
resource "aws_security_group" "app" {
  name        = "${var.project}-app-sg"
  description = "Security group for application instances"
  vpc_id      = var.vpc_id
}

# Layer 3: Database security group (only from app)
resource "aws_security_group" "database" {
  name        = "${var.project}-db-sg"
  description = "Security group for database instances"
  vpc_id      = var.vpc_id
}

# ALB accepts HTTPS from anywhere
resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

# App only accepts traffic from ALB
resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

# Database only accepts traffic from app
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.database.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}
```

## Restrict Egress Rules

The default security group allows all outbound traffic. In a secure environment, you should restrict egress as well:

```hcl
# Restrict outbound traffic from database tier
resource "aws_vpc_security_group_egress_rule" "db_to_app_response" {
  security_group_id            = aws_security_group.database.id
  description                  = "Allow responses back to app tier"
  from_port                    = 1024
  to_port                      = 65535
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}

# Allow database to reach AWS services via VPC endpoints
resource "aws_vpc_security_group_egress_rule" "db_to_vpc_endpoints" {
  security_group_id            = aws_security_group.database.id
  description                  = "Allow HTTPS to VPC endpoints"
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.vpc_endpoints.id
}
```

## Use Dynamic Blocks for Variable Rule Sets

When you need to create rules from a variable list, dynamic blocks keep things clean:

```hcl
variable "allowed_ssh_cidrs" {
  type = map(string)
  default = {
    "office-nyc"    = "203.0.113.0/24"
    "office-london" = "198.51.100.0/24"
    "vpn"           = "192.0.2.0/24"
  }
}

resource "aws_vpc_security_group_ingress_rule" "ssh_access" {
  for_each = var.allowed_ssh_cidrs

  security_group_id = aws_security_group.bastion.id
  description       = "SSH from ${each.key}"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value

  tags = {
    Name   = "ssh-from-${each.key}"
    Source = each.key
  }
}
```

## Add Descriptions to Every Rule

Descriptions are not just for documentation. They show up in the AWS Console and API responses, making it much easier to audit rules during incident response:

```hcl
resource "aws_vpc_security_group_ingress_rule" "monitoring" {
  security_group_id            = aws_security_group.app.id
  # Clear description that explains WHY this rule exists
  description                  = "Prometheus scraping from monitoring VPC via peering"
  from_port                    = 9090
  to_port                      = 9090
  ip_protocol                  = "tcp"
  cidr_ipv4                    = var.monitoring_vpc_cidr
}
```

## Handle the Default Security Group

Every VPC comes with a default security group that cannot be deleted. The best practice is to restrict it to have no rules, preventing accidental use:

```hcl
# Lock down the default security group
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  # No ingress or egress rules - effectively disables it
  tags = {
    Name = "DO-NOT-USE-default-sg"
  }
}
```

## Create a Security Group Module

For consistency across your organization, wrap your patterns in a module:

```hcl
# modules/tiered-security-groups/main.tf
variable "project" { type = string }
variable "vpc_id" { type = string }
variable "app_port" { type = number }
variable "db_port" { type = number }

resource "aws_security_group" "alb" {
  name        = "${var.project}-alb-sg"
  description = "ALB security group for ${var.project}"
  vpc_id      = var.vpc_id
}

resource "aws_security_group" "app" {
  name        = "${var.project}-app-sg"
  description = "App security group for ${var.project}"
  vpc_id      = var.vpc_id
}

resource "aws_security_group" "db" {
  name        = "${var.project}-db-sg"
  description = "DB security group for ${var.project}"
  vpc_id      = var.vpc_id
}

output "alb_sg_id" { value = aws_security_group.alb.id }
output "app_sg_id" { value = aws_security_group.app.id }
output "db_sg_id" { value = aws_security_group.db.id }
```

## Summary

Security groups managed by Terraform should follow the same principles you would apply to any firewall: deny by default, allow only what is needed, document every rule, and layer your defenses. Using separate rule resources, security group references, and restricted egress rules will give you a security posture that is both strong and easy to audit.

For more on network security with Terraform, check out [how to implement network segmentation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-network-segmentation-with-terraform/view) and [how to implement WAF rules with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-waf-rules-with-terraform/view).
