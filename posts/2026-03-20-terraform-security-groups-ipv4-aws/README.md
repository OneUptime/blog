# How to Configure Security Groups for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, Security Group, IPv4, Infrastructure as Code, Networking

Description: Configure AWS security groups for IPv4 using Terraform, covering ingress/egress rules, CIDR-based and security-group-based references, and best practices for least privilege.

## Introduction

AWS security groups act as stateful firewalls for EC2 instances and other resources. Terraform's `aws_security_group`, `aws_vpc_security_group_ingress_rule`, and `aws_vpc_security_group_egress_rule` resources manage them declaratively.

## Web Server Security Group

```hcl
# security_groups.tf

resource "aws_security_group" "web" {
  name        = "web-servers"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "web-sg"
  }
}

# HTTP inbound
resource "aws_vpc_security_group_ingress_rule" "web_http_ipv4" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "Allow HTTP from internet"
}

# HTTPS inbound
resource "aws_vpc_security_group_ingress_rule" "web_https_ipv4" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "Allow HTTPS from internet"
}

# SSH only from management subnet
resource "aws_vpc_security_group_ingress_rule" "web_ssh_management_ipv4" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "10.64.99.0/27"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  description       = "SSH from management subnet"
}

# All outbound
resource "aws_vpc_security_group_egress_rule" "web_all_outbound_ipv4" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow all outbound"
}
```

## Database Security Group (Reference Another SG)

```hcl
resource "aws_security_group" "database" {
  name        = "database"
  description = "RDS database security group"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "database-sg" }
}

# Allow only from web tier SG
resource "aws_vpc_security_group_ingress_rule" "database_postgres_from_web" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.web.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from web tier"
}

resource "aws_vpc_security_group_ingress_rule" "database_postgres_from_management" {
  security_group_id = aws_security_group.database.id
  cidr_ipv4         = "10.64.99.0/27" # Management subnet
  from_port         = 5432
  to_port           = 5432
  ip_protocol       = "tcp"
  description       = "PostgreSQL from management"
}

resource "aws_vpc_security_group_egress_rule" "database_all_outbound_ipv4" {
  security_group_id = aws_security_group.database.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
```

## Separate Rule Resources (Avoid Circular Dependencies)

```hcl
resource "aws_security_group" "app" {
  name   = "app-servers"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "app_from_web" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.web.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  description                  = "App port from web tier"
}
```

## Outputs

```hcl
output "web_sg_id" {
  value = aws_security_group.web.id
}

output "database_sg_id" {
  value = aws_security_group.database.id
}
```

## Deploy

```bash
terraform plan
terraform apply
terraform output web_sg_id
```

## Conclusion

AWS security groups in Terraform use `aws_security_group` for the group and separate `aws_vpc_security_group_ingress_rule` or `aws_vpc_security_group_egress_rule` resources for rule management. Reference other security groups with `referenced_security_group_id = sg_id` to create dynamic rules that follow instance membership changes. Restrict SSH and admin ports to management CIDR ranges rather than `0.0.0.0/0`.
