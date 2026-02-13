# How to Use the Terraform AWS VPC Module

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, VPC, Networking

Description: Complete guide to using the terraform-aws-modules/vpc module for creating production-ready VPCs with public, private, and database subnets on AWS.

---

The VPC is the foundation of everything you build on AWS. Get the networking wrong and you'll be fighting connectivity issues, security problems, and painful re-architectures for months. The `terraform-aws-modules/vpc/aws` module is the most popular Terraform module on the registry, and for good reason - it handles all the complexity of VPC creation while giving you full control over the design.

This guide covers how to use this module effectively for real-world AWS deployments.

## Why Use the Module?

A production VPC involves a lot of resources: the VPC itself, subnets across multiple AZs, route tables, internet gateways, NAT gateways, NACLs, VPC endpoints, and more. Writing all of that from scratch is 200+ lines of Terraform. The VPC module packages it into a single, well-tested module call.

## Basic Usage

The simplest useful VPC has public and private subnets across multiple availability zones.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "my-production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  # NAT Gateway for private subnet internet access
  enable_nat_gateway = true
  single_nat_gateway = true  # One NAT for cost savings (use false for HA)

  # DNS support (required for many AWS services)
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

This creates:
- 1 VPC
- 3 public subnets
- 3 private subnets
- 1 internet gateway
- 1 NAT gateway with an Elastic IP
- Route tables for public and private subnets
- Route table associations

That's about 20 resources from a single module call.

## Adding Database Subnets

For RDS and other database services, you'll want dedicated subnets with no internet access at all.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  # Create a DB subnet group (required by RDS)
  create_database_subnet_group       = true
  create_database_subnet_route_table = true

  # Don't route database subnets through NAT
  create_database_nat_gateway_route = false

  enable_nat_gateway = true
  single_nat_gateway = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = "production"
  }
}
```

The `database_subnets` have their own route table with no route to the internet. The module also creates an RDS subnet group automatically when you set `create_database_subnet_group = true`.

## High-Availability NAT Configuration

For production, you want a NAT gateway in each AZ so a single AZ failure doesn't take down all private subnet internet access.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "ha-production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  # One NAT per AZ for high availability
  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true

  enable_dns_hostnames = true
  enable_dns_support   = true
}
```

This creates 3 NAT gateways (one per AZ), 3 Elastic IPs, and separate route tables for each private subnet. NAT gateways cost about $32/month each, so this triples your NAT cost. For development and staging, `single_nat_gateway = true` is usually fine.

## Adding VPC Endpoints

VPC endpoints let your private subnets access AWS services without going through the NAT gateway. This saves money and reduces latency.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Gateway endpoints (free)
  enable_s3_endpoint       = true
  enable_dynamodb_endpoint = true
}
```

S3 and DynamoDB endpoints are gateway endpoints - they're free. Interface endpoints (for services like ECR, CloudWatch, SSM) cost money but can reduce your NAT gateway data transfer costs significantly.

## EKS-Ready VPC

If you're running EKS, subnets need specific tags for the cluster to discover them.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "eks-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  # Tags required by EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/my-cluster"          = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/my-cluster"          = "shared"
  }
}
```

## VPC Flow Logs

Enable flow logs for network traffic analysis and security auditing.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  # Enable VPC flow logs to CloudWatch
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_iam_role             = true
  flow_log_max_aggregation_interval    = 60 # 1-minute granularity
}
```

## CIDR Planning

Getting your CIDR blocks right from the start is important. Here's a typical layout.

```
10.0.0.0/16 (65,536 IPs total)

Public Subnets:
  10.0.101.0/24 (256 IPs) - AZ a
  10.0.102.0/24 (256 IPs) - AZ b
  10.0.103.0/24 (256 IPs) - AZ c

Private Subnets (compute):
  10.0.1.0/24 (256 IPs) - AZ a
  10.0.2.0/24 (256 IPs) - AZ b
  10.0.3.0/24 (256 IPs) - AZ c

Database Subnets:
  10.0.201.0/24 (256 IPs) - AZ a
  10.0.202.0/24 (256 IPs) - AZ b
  10.0.203.0/24 (256 IPs) - AZ c
```

If you're running EKS or large ECS deployments, consider larger subnets (/20 gives you 4,096 IPs per subnet). Kubernetes pods each consume an IP address, and you can run out faster than you'd expect.

## Using Module Outputs

The VPC module exposes everything you need to connect other resources.

```hcl
# Reference VPC outputs in other resources
resource "aws_security_group" "app" {
  vpc_id = module.vpc.vpc_id
  name   = "app-sg"
  # ...
}

# Pass subnet IDs to an RDS module
module "rds" {
  source = "terraform-aws-modules/rds/aws"

  subnet_ids = module.vpc.database_subnets
  vpc_security_group_ids = [aws_security_group.db.id]
  # ...
}

# Pass to an ECS module
module "ecs_service" {
  source = "./modules/ecs-service"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  # ...
}
```

## Wrapping Up

The Terraform AWS VPC module handles the heavy lifting of VPC creation. Use it as the foundation for your AWS infrastructure, customize it for your needs, and spend your time on the application-level resources instead of debugging route tables.

For the database layer on top of your VPC, check out our guide on the [Terraform AWS RDS module](https://oneuptime.com/blog/post/2026-02-12-terraform-aws-rds-module/view). And for monitoring the network health of your VPC, consider setting up comprehensive monitoring with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view).
