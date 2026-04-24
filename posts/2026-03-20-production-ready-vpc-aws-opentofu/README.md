# How to Build a Production-Ready VPC on AWS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, VPC, AWS, Networking, Production, Infrastructure as Code

Description: Learn how to build a production-ready AWS VPC with OpenTofu, including public and private subnets across multiple AZs, NAT gateways, VPC Flow Logs, and network ACLs.

## Introduction

A production-ready VPC needs more than just subnets. It requires multi-AZ redundancy, proper network segmentation, VPC Flow Logs for security auditing, network ACLs for defense in depth, and VPC endpoints to keep traffic off the internet. This guide builds all of these with OpenTofu.

## Variables

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "environment" {
  type = string
}

variable "azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

## Using the terraform-aws-modules VPC Module

```hcl
module "vpc" {
  source  = "registry.opentofu.org/terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "prod-vpc"
  cidr = var.vpc_cidr

  azs              = var.azs
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  # NAT Gateway per AZ for HA
  enable_nat_gateway     = true
  single_nat_gateway     = false  # one per AZ for production
  one_nat_gateway_per_az = true

  # DNS settings (required for EKS and other services)
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs
  enable_flow_log                      = true
  flow_log_destination_type            = "cloud-watch-logs"
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true
  flow_log_cloudwatch_log_group_retention_in_days = 90

  # Tags required for EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## VPC Endpoints to Keep Traffic Private

```hcl
data "aws_region" "current" {}

resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.environment}-vpc-endpoints"
  description = "Allow HTTPS from private subnets to interface VPC endpoints"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTPS from private subnets"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }

  egress {
    description = "Allow outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

# S3 endpoint (gateway - free)

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.vpc.private_route_table_ids
}

# ECR endpoints (interface - required for ECS/EKS without internet access)
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# Secrets Manager endpoint
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}
```

## Network ACLs for Defense in Depth

```hcl
resource "aws_network_acl" "database" {
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnets

  # Allow PostgreSQL from within the VPC
  ingress {
    rule_no    = 100
    action     = "allow"
    protocol   = "tcp"
    from_port  = 5432
    to_port    = 5432
    cidr_block = var.vpc_cidr
  }

  # Allow MySQL from within the VPC
  ingress {
    rule_no    = 110
    action     = "allow"
    protocol   = "tcp"
    from_port  = 3306
    to_port    = 3306
    cidr_block = var.vpc_cidr
  }

  # Deny everything else
  ingress {
    rule_no    = 32766
    action     = "deny"
    protocol   = "-1"
    from_port  = 0
    to_port    = 0
    cidr_block = "0.0.0.0/0"
  }

  egress {
    rule_no    = 100
    action     = "allow"
    protocol   = "tcp"
    from_port  = 1024
    to_port    = 65535
    cidr_block = var.vpc_cidr
  }
}
```

## Outputs

```hcl
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}

output "database_subnet_ids" {
  value = module.vpc.database_subnets
}

output "database_subnet_group_name" {
  value = module.vpc.database_subnet_group_name
}
```

## Summary

A production-ready VPC requires multi-AZ subnets (public, private, and database tiers), one NAT Gateway per AZ for HA, VPC Flow Logs for security auditing, VPC endpoints for S3 and ECR to avoid public internet traffic, and network ACLs on database subnets as a second layer of defense. Store VPC outputs in SSM Parameter Store so other configurations can reference them without tight coupling via `terraform_remote_state`.
