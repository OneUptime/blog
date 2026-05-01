# How to Deploy an ElastiCache Cluster with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, ElastiCache, Redis, Caching

Description: Learn how to deploy an AWS ElastiCache Redis cluster with replication groups, subnet groups, and security groups using OpenTofu.

## Introduction

Amazon ElastiCache is a fully managed in-memory caching service compatible with Redis and Memcached. This guide shows how to deploy a Redis replication group with high availability using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured
- Existing VPC and subnets

## Step 1: Configure the Provider

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Create Security Group

```hcl
resource "aws_security_group" "redis" {
  name        = "redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "Redis access from application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "redis-sg"
  }
}
```

## Step 3: Create Subnet Group

```hcl
resource "aws_elasticache_subnet_group" "main" {
  name       = "redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Environment = "production"
  }
}
```

## Step 4: Create Parameter Group

```hcl
resource "aws_elasticache_parameter_group" "redis7" {
  name   = "redis7-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict least recently used keys
  }

  parameter {
    name  = "timeout"
    value = "300"  # Idle client timeout in seconds
  }
}
```

## Step 5: Create Redis Replication Group

```hcl
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "my-redis-cluster"
  description          = "Redis replication group for production"

  # Node configuration
  node_type            = "cache.r7g.large"
  num_cache_clusters   = 2  # 1 primary + 1 replica

  # Redis version
  engine_version = "7.0"

  # Port
  port = 6379

  # Subnet and security groups
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Parameter group
  parameter_group_name = aws_elasticache_parameter_group.redis7.name

  # High availability
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token  # Password for AUTH command

  # Maintenance and backup
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_window          = "03:00-04:00"
  snapshot_retention_limit = 7  # Days

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Environment = "production"
  }
}
```

## Step 6: Outputs

```hcl
output "primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Redis reader endpoint for read replicas"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully deployed an ElastiCache Redis replication group using OpenTofu with automatic failover, multi-AZ, encryption, and daily snapshots. Use the reader endpoint for read-heavy workloads to distribute load across replicas and reduce latency.
