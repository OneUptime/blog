# How to Build a Multi-Region Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Region, High Availability, AWS, Infrastructure Patterns, Cloud Architecture

Description: A comprehensive guide to building multi-region infrastructure with Terraform, covering provider aliases, global load balancing, database replication, and failover strategies.

---

Running your application in a single region is fine until that region has an outage. When AWS us-east-1 goes down (and it does), your entire application goes down with it. A multi-region architecture spreads your workload across geographic regions so that a failure in one does not take everything offline.

The challenge is that multi-region setups are inherently complex. You need to coordinate resources across regions, handle data replication, and set up intelligent routing. Terraform makes this manageable by letting you define everything in code with provider aliases. Let us walk through building a multi-region architecture step by step.

## Provider Aliases

The foundation of multi-region Terraform is provider aliases. You define one provider per region:

```hcl
# Primary region
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

# Secondary region
provider "aws" {
  region = "eu-west-1"
  alias  = "secondary"
}

# For global resources like CloudFront and Route53
provider "aws" {
  region = "us-east-1"
  alias  = "global"
}
```

## Regional Module Pattern

Create a module that encapsulates everything a region needs, then call it twice:

```hcl
# modules/regional_stack/main.tf
# This module deploys a complete application stack in a single region

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name   = "${var.project_name}-${var.region_name}-vpc"
    Region = var.region_name
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]
}

# Application load balancer for this region
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.region_name}-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]
}

# ECS cluster for this region
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.region_name}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
```

## Deploying to Both Regions

In the root module, instantiate the regional stack twice:

```hcl
# Deploy to primary region
module "primary" {
  source = "./modules/regional_stack"
  providers = {
    aws = aws.primary
  }

  project_name       = var.project_name
  region_name        = "us-east-1"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Deploy to secondary region
module "secondary" {
  source = "./modules/regional_stack"
  providers = {
    aws = aws.secondary
  }

  project_name       = var.project_name
  region_name        = "eu-west-1"
  vpc_cidr           = "10.1.0.0/16"
  availability_zones = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}
```

## Global Load Balancing with Route53

Route53 health checks and failover routing direct users to the healthy region:

```hcl
# Health check for primary region
resource "aws_route53_health_check" "primary" {
  provider          = aws.global
  fqdn              = module.primary.alb_dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10

  tags = {
    Name = "primary-health-check"
  }
}

# Health check for secondary region
resource "aws_route53_health_check" "secondary" {
  provider          = aws.global
  fqdn              = module.secondary.alb_dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10

  tags = {
    Name = "secondary-health-check"
  }
}

# Failover routing - primary
resource "aws_route53_record" "primary" {
  provider = aws.global
  zone_id  = var.hosted_zone_id
  name     = "app.${var.domain_name}"
  type     = "A"

  alias {
    name                   = module.primary.alb_dns_name
    zone_id                = module.primary.alb_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id
}

# Failover routing - secondary
resource "aws_route53_record" "secondary" {
  provider = aws.global
  zone_id  = var.hosted_zone_id
  name     = "app.${var.domain_name}"
  type     = "A"

  alias {
    name                   = module.secondary.alb_dns_name
    zone_id                = module.secondary.alb_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier  = "secondary"
  health_check_id = aws_route53_health_check.secondary.id
}
```

## Database Replication

For RDS, you can set up a cross-region read replica that can be promoted during failover:

```hcl
# Primary database
resource "aws_db_instance" "primary" {
  provider               = aws.primary
  identifier             = "${var.project_name}-primary-db"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.r6g.xlarge"
  allocated_storage      = 100
  db_subnet_group_name   = module.primary.db_subnet_group_name
  vpc_security_group_ids = [module.primary.db_security_group_id]
  backup_retention_period = 7
  multi_az               = true
  storage_encrypted      = true

  tags = {
    Role = "primary"
  }
}

# Cross-region read replica
resource "aws_db_instance" "replica" {
  provider               = aws.secondary
  identifier             = "${var.project_name}-replica-db"
  replicate_source_db    = aws_db_instance.primary.arn
  instance_class         = "db.r6g.xlarge"
  db_subnet_group_name   = module.secondary.db_subnet_group_name
  vpc_security_group_ids = [module.secondary.db_security_group_id]
  storage_encrypted      = true

  tags = {
    Role = "replica"
  }
}
```

For DynamoDB, global tables handle replication automatically:

```hcl
resource "aws_dynamodb_table" "global" {
  provider     = aws.primary
  name         = "${var.project_name}-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "sessionId"

  attribute {
    name = "sessionId"
    type = "S"
  }

  # Enable global table replication
  replica {
    region_name = "eu-west-1"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
}
```

## S3 Cross-Region Replication

Replicate static assets and uploaded files between regions:

```hcl
resource "aws_s3_bucket" "primary_assets" {
  provider = aws.primary
  bucket   = "${var.project_name}-assets-us-east-1"
}

resource "aws_s3_bucket" "secondary_assets" {
  provider = aws.secondary
  bucket   = "${var.project_name}-assets-eu-west-1"
}

resource "aws_s3_bucket_replication_configuration" "assets" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary_assets.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-assets"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.secondary_assets.arn
      storage_class = "STANDARD"
    }
  }
}
```

## Inter-Region Networking

If your services in different regions need to communicate directly, set up VPC peering:

```hcl
resource "aws_vpc_peering_connection" "cross_region" {
  provider    = aws.primary
  vpc_id      = module.primary.vpc_id
  peer_vpc_id = module.secondary.vpc_id
  peer_region = "eu-west-1"

  tags = {
    Name = "primary-to-secondary-peering"
  }
}

resource "aws_vpc_peering_connection_accepter" "cross_region" {
  provider                  = aws.secondary
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_region.id
  auto_accept               = true
}
```

## Key Considerations

Multi-region adds cost and complexity. Not every application needs it. Consider these questions before committing:

- What is the actual cost of downtime for your business?
- Can you tolerate eventually consistent data across regions?
- Do you have the operational maturity to manage multi-region deployments?

If the answers point to multi-region, the Terraform patterns we covered here give you a solid foundation. For the disaster recovery angle specifically, take a look at [building a disaster recovery architecture with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-disaster-recovery-architecture-with-terraform/view).

## Wrapping Up

Multi-region architecture with Terraform boils down to the provider alias pattern and good module design. Define your regional stack once, deploy it multiple times, and stitch the regions together with Route53, database replication, and S3 cross-region replication. The code we walked through gives you active-passive failover, but you can extend it to active-active by using latency-based routing instead of failover routing in Route53.
