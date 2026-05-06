# How to Configure Cache Failover with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ElastiCache, Failover, High Availability, Infrastructure as Code

Description: Learn how to configure ElastiCache automatic failover with OpenTofu to ensure cache availability when primary nodes fail.

ElastiCache failover automatically promotes a replica to primary when the primary node fails. Configuring this in OpenTofu ensures your HA settings are version-controlled and consistently applied, preventing manual misconfiguration of production caches.

## Enabling Automatic Failover

```hcl
resource "aws_elasticache_replication_group" "ha" {
  replication_group_id = "ha-redis"
  description          = "Redis with automatic failover"

  engine_version = "7.1"
  node_type      = "cache.r7g.large"
  port           = 6379

  # Minimum 2 nodes required for automatic failover
  num_cache_clusters = 2  # 1 primary + 1 replica

  automatic_failover_enabled = true  # Enable automatic failover
  multi_az_enabled           = true  # Enable Multi-AZ support

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
```

## Multi-AZ with Preferred Zones

```hcl
resource "aws_elasticache_replication_group" "multi_az" {
  replication_group_id = "multi-az-redis"
  description          = "Redis spread across 3 AZs"

  engine_version     = "7.1"
  node_type          = "cache.r7g.large"
  num_cache_clusters = 3

  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Explicitly place nodes in different AZs
  preferred_cache_cluster_azs = [
    "us-east-1a",  # Primary
    "us-east-1b",  # Replica 1
    "us-east-1c",  # Replica 2
  ]

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
}
```

## Failover Monitoring Alerts

```hcl
resource "aws_sns_topic" "alerts" {
  name = "redis-failover-alerts"
}

resource "aws_elasticache_replication_group" "monitored" {
  replication_group_id = "monitored-redis"
  description          = "Redis with failover event notifications"

  engine_version = "7.1"
  node_type      = "cache.r7g.large"
  port           = 6379

  num_cache_clusters = 2

  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # Publishes events such as ElastiCache:FailoverComplete to SNS
  notification_topic_arn = aws_sns_topic.alerts.arn
}
```

## Connection Handling in Applications

When failover occurs, the primary endpoint continues to resolve to the current primary. Applications should:

```hcl
# Output the primary endpoint - ElastiCache keeps it pointed at the current primary
output "redis_primary_endpoint" {
  description = "Connect to this endpoint. It always resolves to the current primary."
  value       = aws_elasticache_replication_group.ha.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Read endpoint uses DNS round robin across replica nodes."
  value       = aws_elasticache_replication_group.ha.reader_endpoint_address
}
```

## Backup for Recovery

```hcl
resource "aws_elasticache_replication_group" "with_backup" {
  replication_group_id = "backed-up-redis"
  description          = "Redis with snapshots for recovery"

  engine_version     = "7.1"
  node_type          = "cache.r7g.large"
  num_cache_clusters = 2

  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Snapshot settings
  snapshot_retention_limit = 7         # Keep 7 daily snapshots
  snapshot_window          = "02:00-03:00"  # UTC

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
```

## Conclusion

ElastiCache automatic failover in OpenTofu ensures your cache is highly available with minimal configuration. Enable automatic_failover_enabled and multi_az_enabled, place at least one replica in a different AZ (for example, with preferred_cache_cluster_azs), configure SNS notifications for failover events, and ensure applications connect via the primary endpoint rather than hardcoded IP addresses.
