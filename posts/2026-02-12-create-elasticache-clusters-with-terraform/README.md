# How to Create ElastiCache Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, ElastiCache, Redis, Caching

Description: Learn how to create Amazon ElastiCache Redis and Memcached clusters using Terraform, including replication groups, encryption, failover, and parameter tuning.

---

Caching is one of the most effective ways to improve application performance. Instead of hitting your database for every request, you cache frequently accessed data in memory. Amazon ElastiCache gives you managed Redis or Memcached clusters, handling the infrastructure, patching, and failover so you can focus on your application.

In this post, we'll set up ElastiCache clusters with Terraform, covering both Redis (which is far more popular) and Memcached, along with production configurations for encryption, replication, and automatic failover.

## Networking Prerequisites

ElastiCache runs in your VPC and needs a subnet group and security group:

```hcl
# Subnet group for ElastiCache
resource "aws_elasticache_subnet_group" "main" {
  name       = "cache-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    ManagedBy = "terraform"
  }
}

# Security group for ElastiCache
resource "aws_security_group" "cache" {
  name_prefix = "cache-"
  vpc_id      = var.vpc_id
  description = "Security group for ElastiCache"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "Redis from application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Simple Redis Cluster

For development or simple caching needs, a single-node Redis cluster works fine:

```hcl
# Single-node Redis cluster (development)
resource "aws_elasticache_cluster" "redis_dev" {
  cluster_id           = "myapp-cache-dev"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  port                 = 6379
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.cache.id]

  # Snapshot for backup (even in dev, it's nice to have)
  snapshot_retention_limit = 1

  tags = {
    Environment = "development"
    ManagedBy   = "terraform"
  }
}
```

## Production Redis Replication Group

For production, you want a replication group with automatic failover. This gives you a primary node for reads and writes, plus replica nodes for reads and failover.

This creates a Redis cluster with one primary and two replicas across availability zones:

```hcl
# Production Redis replication group with automatic failover
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "myapp-redis"
  description          = "Redis cluster for myapp"

  # Engine configuration
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.r6g.large"
  port                 = 6379

  # Replication configuration
  num_cache_clusters         = 3  # 1 primary + 2 replicas
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.cache.id]

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.cache.arn

  # Auth token (password) for Redis AUTH
  auth_token = var.redis_auth_token

  # Backups
  snapshot_retention_limit = 7
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "Mon:05:00-Mon:06:00"

  # Parameter group
  parameter_group_name = aws_elasticache_parameter_group.redis7.name

  # Notifications
  notification_topic_arn = aws_sns_topic.cache_alerts.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }

  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}
```

The `lifecycle` block with `ignore_changes` on `num_cache_clusters` is important if you plan to use auto-scaling or manually add replicas outside Terraform.

## Redis Cluster Mode (Sharding)

For datasets too large for a single node, enable cluster mode to shard data across multiple node groups:

```hcl
# Redis with cluster mode enabled (sharding)
resource "aws_elasticache_replication_group" "clustered" {
  replication_group_id = "myapp-redis-cluster"
  description          = "Clustered Redis for large datasets"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = "cache.r6g.large"
  port           = 6379

  # Cluster mode configuration
  num_node_groups         = 3  # Number of shards
  replicas_per_node_group = 2  # Replicas per shard

  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.cache.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  parameter_group_name = aws_elasticache_parameter_group.redis7_cluster.name

  snapshot_retention_limit = 7

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

This gives you 3 shards, each with a primary and 2 replicas - 9 nodes total. Data is distributed across shards using hash slots, so your total memory is the sum of all primary nodes.

## Custom Parameter Groups

Tune Redis behavior with a custom parameter group:

```hcl
# Custom parameter group for Redis 7
resource "aws_elasticache_parameter_group" "redis7" {
  name   = "myapp-redis7"
  family = "redis7"

  # Set max memory policy
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict least recently used keys
  }

  # Enable keyspace notifications (for cache invalidation)
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Notify on expired keys
  }

  # Connection timeout
  parameter {
    name  = "timeout"
    value = "300"  # Close idle connections after 5 minutes
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# Parameter group for cluster mode
resource "aws_elasticache_parameter_group" "redis7_cluster" {
  name   = "myapp-redis7-cluster"
  family = "redis7"

  parameter {
    name  = "cluster-enabled"
    value = "yes"
  }

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}
```

The `maxmemory-policy` setting is critical. Without it, Redis will reject writes when memory is full. `allkeys-lru` evicts the least recently used keys to make room for new data, which is usually what you want for caching.

## Memcached Cluster

If you need simple key-value caching without persistence, replication, or data structures, Memcached is simpler and can be cheaper:

```hcl
# Memcached cluster
resource "aws_elasticache_cluster" "memcached" {
  cluster_id           = "myapp-memcached"
  engine               = "memcached"
  engine_version       = "1.6.22"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 3  # Distributed across AZs
  port                 = 11211

  az_mode              = "cross-az"

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.cache.id]
  parameter_group_name = "default.memcached1.6"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

Memcached doesn't support replication, persistence, or encryption at rest. Each node is independent - if a node dies, the cached data on that node is gone. This is fine for pure caching where the source of truth is your database.

## ElastiCache Serverless

For variable workloads where you don't want to manage capacity, ElastiCache Serverless scales automatically:

```hcl
# ElastiCache Serverless (Redis)
resource "aws_elasticache_serverless_cache" "main" {
  engine = "redis"
  name   = "myapp-serverless-cache"

  cache_usage_limits {
    data_storage {
      maximum = 10
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 5000
    }
  }

  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.cache.id]

  snapshot_retention_limit = 7

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Outputs

Export the endpoints your application needs:

```hcl
output "redis_primary_endpoint" {
  description = "Redis primary endpoint for writes"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint (load balanced)"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "redis_port" {
  value = aws_elasticache_replication_group.main.port
}
```

## Wrapping Up

ElastiCache with Terraform is straightforward once you understand the topology. Use single-node clusters for development, replication groups with automatic failover for production, and cluster mode when you need to shard across multiple nodes. Always enable encryption in production, and choose a `maxmemory-policy` that matches your use case. For most caching scenarios, `allkeys-lru` is the right choice.
