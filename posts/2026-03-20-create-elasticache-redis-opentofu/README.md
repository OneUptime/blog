# How to Create AWS ElastiCache Redis with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ElastiCache, Redis, Infrastructure as Code

Description: Learn how to create AWS ElastiCache Redis clusters with OpenTofu for in-memory caching, session storage, and real-time data structures.

ElastiCache for Redis provides managed in-memory caching that dramatically reduces database load. Managing clusters in OpenTofu ensures consistent node type, parameter group, and security settings across environments.

## Creating a Redis Cluster Mode Disabled (Single Shard)

```hcl
resource "aws_elasticache_subnet_group" "main" {
  name       = "redis-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "myapp-redis"
  description          = "Redis cache for myapp"

  node_type            = "cache.r7g.large"
  num_cache_clusters   = 2  # 1 primary + 1 replica
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  parameter_group_name = aws_elasticache_parameter_group.redis7.name

  engine_version       = "7.1"
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  kms_key_id                  = aws_kms_key.redis.arn

  # Auth token for AUTH command
  auth_token = var.redis_auth_token

  automatic_failover_enabled = true
  multi_az_enabled           = true

  snapshot_retention_limit = 5     # Keep 5 daily snapshots
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "sun:04:00-sun:05:00"

  tags = {
    Environment = "production"
    Team        = "backend"
  }
}
```

## Parameter Group

```hcl
resource "aws_elasticache_parameter_group" "redis7" {
  family = "redis7"
  name   = "myapp-redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict least recently used keys when memory full
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Enable expired key notifications
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }
}
```

## Security Group

```hcl
resource "aws_security_group" "redis" {
  name        = "redis-sg"
  description = "Redis security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }
}
```

## Cluster Mode Enabled (Multiple Shards)

```hcl
resource "aws_elasticache_replication_group" "cluster" {
  replication_group_id = "myapp-redis-cluster"
  description          = "Redis cluster mode for horizontal scaling"

  node_type                  = "cache.r7g.large"
  num_node_groups            = 3  # 3 shards
  replicas_per_node_group    = 1  # 1 replica per shard = 6 nodes total
  port                       = 6379

  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  parameter_group_name       = aws_elasticache_parameter_group.redis7_cluster.name

  engine_version             = "7.1"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  automatic_failover_enabled = true  # Required for cluster mode
  multi_az_enabled           = true
}

resource "aws_elasticache_parameter_group" "redis7_cluster" {
  family = "redis7"  # Redis 7 uses the same family for cluster mode enabled and disabled
  name   = "myapp-redis7-cluster"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}
```

## Outputs

```hcl
output "redis_primary_endpoint" {
  value     = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive = false
}

output "redis_reader_endpoint" {
  value = aws_elasticache_replication_group.main.reader_endpoint_address
}
```

## Conclusion

ElastiCache Redis in OpenTofu provides managed, secure in-memory caching. Enable encryption at rest and in transit, use auth tokens for authentication, configure automatic failover with Multi-AZ, and set appropriate maxmemory-policy to control eviction behavior. Use cluster mode for datasets exceeding single-node memory limits.
