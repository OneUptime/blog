# How to Use Dynamic Blocks for Multi-AZ Resource Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, Multi-AZ, High Availability, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to configure resources across multiple availability zones for high availability and fault tolerance.

---

High availability on AWS means distributing resources across multiple Availability Zones (AZs). Terraform dynamic blocks make it easy to configure subnets, instances, databases, and other resources across a variable number of AZs without duplicating code.

## The Multi-AZ Challenge

Different environments often use different numbers of AZs. Production might use three AZs for full redundancy, staging might use two, and development might use just one to save costs. Hardcoding AZ configurations means maintaining separate resource blocks for each scenario.

## Dynamic Subnets Across AZs

The foundation of multi-AZ architecture is creating subnets in each AZ:

```hcl
variable "availability_zones" {
  description = "List of AZs to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

locals {
  # Generate subnet CIDRs dynamically based on number of AZs
  public_subnets = {
    for idx, az in var.availability_zones : az => {
      cidr = cidrsubnet(var.vpc_cidr, 8, idx)
      az   = az
      name = "public-${az}"
    }
  }

  private_subnets = {
    for idx, az in var.availability_zones : az => {
      cidr = cidrsubnet(var.vpc_cidr, 8, idx + length(var.availability_zones))
      az   = az
      name = "private-${az}"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "multi-az-vpc"
  }
}

# Public subnets - one per AZ
resource "aws_subnet" "public" {
  for_each = local.public_subnets

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = true

  tags = {
    Name = each.value.name
    Type = "public"
  }
}

# Private subnets - one per AZ
resource "aws_subnet" "private" {
  for_each = local.private_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = each.value.name
    Type = "private"
  }
}
```

Change `availability_zones` to `["us-east-1a"]` and you get a single-AZ deployment. Set it to three AZs and you get full redundancy. The code is the same either way.

## NAT Gateways Per AZ

For production, you want a NAT Gateway in each AZ so that private subnets can reach the internet even if one AZ goes down:

```hcl
variable "nat_per_az" {
  description = "Whether to create a NAT Gateway in each AZ (true) or share one (false)"
  type        = bool
  default     = true
}

locals {
  # If nat_per_az is true, create one per AZ. Otherwise, just one.
  nat_azs = var.nat_per_az ? var.availability_zones : [var.availability_zones[0]]

  nat_gateways = {
    for az in local.nat_azs : az => {
      az        = az
      subnet_id = aws_subnet.public[az].id
    }
  }
}

resource "aws_eip" "nat" {
  for_each = local.nat_gateways
  domain   = "vpc"

  tags = {
    Name = "nat-${each.key}"
  }
}

resource "aws_nat_gateway" "main" {
  for_each = local.nat_gateways

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = each.value.subnet_id

  tags = {
    Name = "nat-${each.key}"
  }
}

# Route tables for private subnets - each points to the appropriate NAT
resource "aws_route_table" "private" {
  for_each = local.private_subnets

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    # If NAT per AZ, use the same-AZ NAT. Otherwise, use the single NAT.
    nat_gateway_id = var.nat_per_az ? aws_nat_gateway.main[each.value.az].id : aws_nat_gateway.main[var.availability_zones[0]].id
  }

  tags = {
    Name = "private-${each.key}"
  }
}
```

## Auto Scaling Group Across AZs

ASGs naturally support multi-AZ, but dynamic blocks can configure per-AZ settings:

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = length(var.availability_zones)  # At least one per AZ
  max_size            = length(var.availability_zones) * 3
  desired_capacity    = length(var.availability_zones)
  vpc_zone_identifier = [for az in var.availability_zones : aws_subnet.private[az].id]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Dynamic tags for AZ-aware monitoring
  dynamic "tag" {
    for_each = merge(
      {
        Name        = "app-instance"
        Environment = var.environment
        ManagedBy   = "terraform"
      },
      { AZCount = tostring(length(var.availability_zones)) }
    )
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}
```

## RDS Multi-AZ with Dynamic Subnet Groups

RDS requires a DB subnet group with subnets in multiple AZs:

```hcl
resource "aws_db_subnet_group" "main" {
  name        = "main"
  description = "DB subnet group spanning ${length(var.availability_zones)} AZs"

  # Dynamically include all private subnet IDs
  subnet_ids = [for az in var.availability_zones : aws_subnet.private[az].id]

  tags = {
    Name = "main-db-subnet-group"
  }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "main"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "mydb"
  master_username    = "admin"
  master_password    = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Multi-AZ is automatic with Aurora - it places replicas in different AZs
  availability_zones = var.availability_zones

  tags = {
    Name = "main-aurora-cluster"
  }
}

# Create one reader instance per AZ for read scaling
resource "aws_rds_cluster_instance" "readers" {
  for_each = { for idx, az in var.availability_zones : az => {
    identifier = "main-reader-${idx}"
    az         = az
  } if idx > 0 }  # Skip the first AZ (writer is there)

  cluster_identifier   = aws_rds_cluster.main.id
  identifier           = each.value.identifier
  instance_class       = var.db_reader_instance_class
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  availability_zone    = each.value.az
  db_subnet_group_name = aws_db_subnet_group.main.name
}
```

## ElastiCache Multi-AZ

ElastiCache Redis with automatic failover needs nodes in multiple AZs:

```hcl
resource "aws_elasticache_subnet_group" "main" {
  name       = "main"
  subnet_ids = [for az in var.availability_zones : aws_subnet.private[az].id]
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "main"
  description          = "Redis cluster across ${length(var.availability_zones)} AZs"
  node_type            = var.cache_node_type
  num_cache_clusters   = length(var.availability_zones)

  # Enable multi-AZ only when we have more than one AZ
  automatic_failover_enabled = length(var.availability_zones) > 1
  multi_az_enabled           = length(var.availability_zones) > 1

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.cache.id]

  # Preferred AZs for cache nodes
  preferred_cache_cluster_azs = var.availability_zones
}
```

## ECS Service with Multi-AZ Placement

ECS services can be configured to spread tasks across AZs:

```hcl
resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = length(var.availability_zones) * 2  # 2 tasks per AZ

  launch_type = "FARGATE"

  network_configuration {
    subnets         = [for az in var.availability_zones : aws_subnet.private[az].id]
    security_groups = [aws_security_group.app.id]
  }

  # Spread tasks across AZs
  dynamic "ordered_placement_strategy" {
    for_each = length(var.availability_zones) > 1 ? [1] : []
    content {
      type  = "spread"
      field = "attribute:ecs.availability-zone"
    }
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }
}
```

## Complete Multi-AZ Module Pattern

Tie everything together with a module that takes AZ count as input:

```hcl
# Usage
module "infrastructure" {
  source = "./modules/multi-az-infra"

  # Production: 3 AZs, NAT per AZ
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  nat_per_az         = true
  vpc_cidr           = "10.0.0.0/16"
  environment        = "production"
}

# Staging: 2 AZs, shared NAT
module "infrastructure_staging" {
  source = "./modules/multi-az-infra"

  availability_zones = ["us-east-1a", "us-east-1b"]
  nat_per_az         = false
  vpc_cidr           = "10.1.0.0/16"
  environment        = "staging"
}
```

## Summary

Multi-AZ resource configuration is one of the most natural use cases for dynamic generation in Terraform. By parameterizing the list of availability zones and using `for_each` with locals, you can scale from single-AZ development environments to fully redundant production setups without changing your Terraform code. The pattern works across VPC subnets, NAT gateways, databases, caches, and compute resources. For related patterns, see [how to use dynamic blocks for VPN tunnel configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-vpn-tunnel-configuration/view).
