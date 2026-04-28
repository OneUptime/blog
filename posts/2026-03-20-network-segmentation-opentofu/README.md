# How to Configure Network Segmentation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Segmentation, Security, OpenTofu, VPC, Subnets, Security Group

Description: Learn how to configure network segmentation using OpenTofu to isolate workloads into distinct network zones with controlled traffic flow between them.

## Overview

Network segmentation divides infrastructure into isolated zones (public, application, database, management) with security group rules controlling inter-zone traffic. OpenTofu provisions the complete segmented network architecture.

## Step 1: Segmented VPC with Zone Subnets

```hcl
# main.tf - Network zones for segmentation

locals {
  zones = {
    public = {
      cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
    }
    application = {
      cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
    }
    database = {
      cidrs = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
    }
    management = {
      cidrs = ["10.0.100.0/28"]
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name             = "segmented-vpc"
  cidr             = "10.0.0.0/16"
  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets   = local.zones.public.cidrs
  private_subnets  = local.zones.application.cidrs
  database_subnets = local.zones.database.cidrs
}
```

## Step 2: Zone Security Groups

```hcl
# Public zone - internet-facing load balancers
resource "aws_security_group" "public_zone" {
  name   = "public-zone"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Application zone - only from public zone
resource "aws_security_group" "app_zone" {
  name   = "app-zone"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.public_zone.id]
    description     = "From public zone only"
  }
}

# Database zone - only from application zone
resource "aws_security_group" "database_zone" {
  name   = "database-zone"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_zone.id]
    description     = "PostgreSQL from app zone only"
  }
}

# Management zone - bastion access with IP restriction
resource "aws_security_group" "management_zone" {
  name   = "management-zone"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidrs
    description = "SSH from admin IPs only"
  }
}
```

## Step 3: NACLs for Additional Zone Protection

```hcl
# Network ACL for database zone - deny everything except app zone
resource "aws_network_acl" "database" {
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnets

  # Allow from application subnets
  dynamic "ingress" {
    for_each = toset(module.vpc.private_subnets_cidr_blocks)
    content {
      protocol   = "tcp"
      rule_no    = 100 + index(tolist(toset(module.vpc.private_subnets_cidr_blocks)), ingress.value)
      action     = "allow"
      cidr_block = ingress.value
      from_port  = 5432
      to_port    = 5432
    }
  }

  # Deny all other traffic
  ingress {
    protocol   = "-1"
    rule_no    = 32766
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}
```

## Summary

Network segmentation configured with OpenTofu isolates workloads into zones with security groups enforcing traffic flow: public zone accepts internet traffic, application zone accepts only traffic from the public zone, and database zone accepts only application zone traffic. Network ACLs add stateless defense-in-depth at the subnet boundary. This layered approach means a compromised application server cannot directly reach the management zone or initiate outbound connections without matching security group egress rules.
