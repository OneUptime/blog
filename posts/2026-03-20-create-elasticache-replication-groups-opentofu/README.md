# How to Create ElastiCache Replication Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ElastiCache, Redis, High Availability, Infrastructure as Code

Description: Learn how to create ElastiCache Redis replication groups with OpenTofu for high availability, read scaling, and automatic failover across availability zones.

ElastiCache replication groups provide Redis with high availability through automatic failover, read replicas for scaling reads, and multi-AZ deployment. Managing replication groups in OpenTofu ensures consistent HA configuration.

## Basic Replication Group

```hcl
resource "aws_elasticache_replication_group" "ha" {
  replication_group_id = "ha-redis"
  description          = "High-availability Redis with automatic failover"

  engine_version = "7.1"
  node_type      = "cache.r7g.large"
  port           = 6379

  # 1 primary + 2 replicas
  num_cache_clusters = 3

  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  snapshot_retention_limit = 7
  snapshot_window          = "02:00-03:00"
  maintenance_window       = "sun:03:00-sun:04:00"

  apply_immediately = false  # Apply changes during maintenance window

  tags = {
    Environment = "production"
  }
}
```

## Replication Group with Preferred AZs

```hcl
resource "aws_elasticache_replication_group" "multi_az" {
  replication_group_id = "multi-az-redis"
  description          = "Multi-AZ Redis"

  engine_version = "7.1"
  node_type      = "cache.r7g.large"
  port           = 6379

  num_cache_clusters = 3

  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Spread nodes across specific AZs
  preferred_cache_cluster_azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
```

## Reading from Replicas

```hcl
output "primary_endpoint" {
  description = "Write to the primary endpoint"
  value       = aws_elasticache_replication_group.ha.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Read from replicas using the reader endpoint"
  value       = aws_elasticache_replication_group.ha.reader_endpoint_address
}
```

## Global Replication Group (Cross-Region)

```hcl
resource "aws_elasticache_replication_group" "primary" {
  replication_group_id = "global-redis-primary"
  description          = "Primary replication group for global datastore"

  engine_version = "7.1"
  node_type      = "cache.r7g.large"

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

resource "aws_elasticache_global_replication_group" "global" {
  global_replication_group_id_suffix = "myapp"
  primary_replication_group_id       = aws_elasticache_replication_group.primary.id
}

# Secondary in another region

resource "aws_elasticache_replication_group" "secondary" {
  provider = aws.us_west_2  # Different region

  replication_group_id = "global-redis-secondary"
  description          = "Secondary read replica in us-west-2"

  global_replication_group_id = aws_elasticache_global_replication_group.global.id

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.west.name
  security_group_ids = [aws_security_group.redis_west.id]
}
```

## Monitoring

```hcl
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "redis-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Maximum"
  threshold           = 5  # Seconds
  alarm_description   = "Redis replica is lagging behind primary"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.ha.id
  }
}
```

## Conclusion

ElastiCache replication groups in OpenTofu provide production-ready Redis with automatic failover and read scaling. Use the primary endpoint for writes and the reader endpoint to distribute reads across replicas. For global active-active deployments, use global replication groups to provide low-latency reads from multiple AWS regions. Monitor replication lag to ensure replicas are keeping up with the primary.
