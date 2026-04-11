# How to Set Up ElastiCache Redis Multi-AZ Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, AWS, Multi-AZ, High Availability

Description: Learn how to configure ElastiCache Redis with Multi-AZ enabled to achieve automatic failover and high availability across AWS Availability Zones.

---

Multi-AZ ElastiCache Redis keeps a primary node and one or more read replicas in different Availability Zones. If the primary fails, ElastiCache automatically promotes a replica - typically within 1-2 minutes.

## Requirements

- Redis engine 2.8.6 or later
- A replication group (single-node clusters cannot use Multi-AZ)
- At least one read replica in a different AZ

## Creating a Multi-AZ Replication Group via CLI

```bash
aws elasticache create-replication-group \
  --replication-group-id prod-redis \
  --replication-group-description "Production Redis Multi-AZ" \
  --engine redis \
  --engine-version "7.1" \
  --cache-node-type cache.r7g.large \
  --num-cache-clusters 2 \
  --multi-az-enabled \
  --automatic-failover-enabled \
  --cache-subnet-group-name my-subnet-group \
  --security-group-ids sg-0abc12345
```

## Terraform Configuration

```hcl
resource "aws_elasticache_replication_group" "redis_multi_az" {
  replication_group_id       = "prod-redis"
  description                = "Production Redis Multi-AZ"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  multi_az_enabled           = true
  automatic_failover_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]

  tags = {
    Environment = "production"
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "my-subnet-group"
  subnet_ids = [
    aws_subnet.az_a.id,
    aws_subnet.az_b.id,
  ]
}
```

## Verifying AZ Placement

```bash
aws elasticache describe-replication-groups \
  --replication-group-id prod-redis \
  --query "ReplicationGroups[0].NodeGroups[0].NodeGroupMembers[*].{Id:CacheClusterId,AZ:PreferredAvailabilityZone,Role:CurrentRole}"
```

Expected output:

```text
[
  { "Id": "prod-redis-001", "AZ": "us-east-1a", "Role": "primary" },
  { "Id": "prod-redis-002", "AZ": "us-east-1b", "Role": "replica" }
]
```

## Application Configuration for Failover

Use the replication group's primary endpoint (not a node-specific endpoint) so your client automatically routes to the new primary after failover:

```python
import redis

# Always use the primary endpoint for writes
client = redis.Redis(
    host="prod-redis.abc123.ng.0001.use1.cache.amazonaws.com",
    port=6379,
    ssl=True,
    socket_connect_timeout=5,
    retry_on_timeout=True,
)
```

## Testing Failover

```bash
# Trigger a manual failover to test behavior
aws elasticache test-failover \
  --replication-group-id prod-redis \
  --node-group-id 0001
```

## Monitoring

Set up CloudWatch alarms on `ReplicationLag` and `CacheHits` to catch replication delays. Use [OneUptime](https://oneuptime.com) to monitor your application's Redis-dependent endpoints and alert if latency spikes during an AZ failure event.

## Summary

ElastiCache Redis Multi-AZ keeps replicas in separate AZs and automatically promotes the healthiest replica when the primary fails. Use the replication group's primary endpoint (not node endpoints) in your application and enable retry logic to handle brief reconnects during failover. Always test failover behavior before relying on it in production.
