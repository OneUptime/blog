# How to Create a VPC with IPv4 CIDR Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, VPC, IPv4, CIDR, Infrastructure as Code

Description: Create an AWS VPC with a custom IPv4 CIDR block using Terraform, including DNS settings, tagging, and outputs for downstream resource references.

## Introduction

An AWS VPC is the foundational IPv4 networking construct in AWS. Terraform's `aws_vpc` resource creates VPCs declaratively with full lifecycle management.

## Provider Configuration

```hcl
# provider.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}
```

## Variables

```hcl
# variables.tf
variable "region" {
  default = "us-east-1"
}

variable "vpc_cidr" {
  description = "IPv4 CIDR block for the VPC"
  default     = "10.64.0.0/16"
}

variable "environment" {
  default = "production"
}
```

## VPC Resource

```hcl
# vpc.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Default route table for public subnets
resource "aws_default_route_table" "main" {
  default_route_table_id = aws_vpc.main.default_route_table_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-default-rt"
  }
}
```

## DHCP Options

```hcl
resource "aws_vpc_dhcp_options" "main" {
  domain_name         = var.region == "us-east-1" ? "ec2.internal" : "${var.region}.compute.internal"
  domain_name_servers = ["AmazonProvidedDNS"]
  ntp_servers         = ["169.254.169.123"]

  tags = {
    Name = "${var.environment}-dhcp-options"
  }
}

resource "aws_vpc_dhcp_options_association" "main" {
  vpc_id          = aws_vpc.main.id
  dhcp_options_id = aws_vpc_dhcp_options.main.id
}
```

## Outputs

```hcl
# outputs.tf
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "vpc_cidr_block" {
  value       = aws_vpc.main.cidr_block
  description = "VPC IPv4 CIDR block"
}

output "internet_gateway_id" {
  value = aws_internet_gateway.main.id
}
```

## Deploy

```bash
terraform init
terraform plan -var="vpc_cidr=10.64.0.0/16" -var="environment=production"
terraform apply -auto-approve
terraform output vpc_id
```

## Conclusion

Creating an AWS VPC with Terraform involves the `aws_vpc` resource (CIDR + DNS settings), an internet gateway for public internet access, and optionally custom DHCP options. Enable both `enable_dns_hostnames` and `enable_dns_support` for EC2 instances with public IPv4 addresses to receive public DNS names. Reference `aws_vpc.main.id` in downstream subnet and security group resources.
