# How to Deploy Redis on AWS ElastiCache with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Redis, ElastiCache, AWS, Cache, Infrastructure as Code

Description: Learn how to deploy Redis on AWS ElastiCache using OpenTofu - including replication groups, subnet groups, security groups, and cluster mode configuration.

## Introduction

AWS ElastiCache for Redis with OpenTofu uses `aws_elasticache_replication_group` for production deployments (not `aws_elasticache_cluster`, which is for single-node). The replication group supports Multi-AZ, automatic failover, and Redis Cluster mode for horizontal scaling.

## Subnet Group

```hcl
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.environment}-redis-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for Redis ElastiCache"

  tags = { Name = "${var.environment}-redis-subnet-group" }
}
```

## Security Group

```hcl
resource "aws_security_group" "redis" {
  name        = "${var.environment}-redis-sg"
  description = "Security group for Redis ElastiCache"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.app_security_group_ids
    description     = "Redis from application servers"
  }

  tags = { Name = "${var.environment}-redis-sg" }
}
```

## Parameter Group

```hcl
resource "aws_elasticache_parameter_group" "redis7" {
  name   = "${var.environment}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict LRU keys when memory is full
  }

  parameter {
    name  = "lazyfree-lazy-eviction"
    value = "yes"
  }

  tags = { Environment = var.environment }
}
```

## Redis Replication Group (Standard, No Cluster Mode)

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.environment}-redis"
  description          = "Redis cache for ${var.environment}"

  # Node configuration
  node_type            = var.redis_node_type  # "cache.t3.medium"
  num_cache_clusters   = var.environment == "prod" ? 3 : 1  # Primary + replicas
  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled    = var.environment == "prod"

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  # Redis configuration
  engine               = "redis"
  engine_version       = "7.1"
  parameter_group_name = aws_elasticache_parameter_group.redis7.name
  port                 = 6379

  # Encryption
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  transit_encryption_mode     = "required"  # Require TLS
  auth_token                  = var.redis_auth_token  # AUTH password

  # Backups
  snapshot_retention_limit = var.environment == "prod" ? 7 : 0
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "mon:04:00-mon:05:00"

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = {
    Name        = "${var.environment}-redis"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${var.environment}/slow-log"
  retention_in_days = 14
}
```

## Redis Cluster Mode (Sharded, for Large Datasets)

```hcl
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id = "${var.environment}-redis-cluster"
  description          = "Clustered Redis for ${var.environment}"

  # Cluster mode
  num_node_groups         = 3  # 3 shards
  replicas_per_node_group = 1  # 1 replica per shard = 6 nodes total

  node_type = "cache.r6g.large"

  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  engine_version       = "7.1"
  parameter_group_name = "default.redis7.cluster.on"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  tags = { Name = "${var.environment}-redis-cluster" }
}
```

## Outputs

```hcl
output "redis_primary_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Primary endpoint for writes"
}

output "redis_reader_endpoint" {
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  description = "Reader endpoint for reads (DNS round robin across replicas)"
}

output "redis_port" {
  value = aws_elasticache_replication_group.redis.port
}
```

## Conclusion

AWS ElastiCache Redis with OpenTofu uses `aws_elasticache_replication_group` for HA deployments. For standard Redis (single keyspace), use `num_cache_clusters` with automatic failover. For large datasets that need horizontal partitioning, use cluster mode with `num_node_groups` and `replicas_per_node_group`. Always enable encryption at rest and in transit, use AUTH tokens, and set an appropriate `maxmemory-policy` for your workload (LRU for cache workloads, noeviction for durable data).
