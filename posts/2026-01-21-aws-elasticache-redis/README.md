# How to Set Up AWS ElastiCache for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AWS, ElastiCache, Cloud, Caching, DevOps, Infrastructure

Description: A comprehensive guide to setting up and configuring AWS ElastiCache for Redis, covering cluster configuration, security best practices, and performance optimization for production workloads.

---

AWS ElastiCache for Redis is a fully managed, in-memory caching service that makes it easy to deploy, operate, and scale Redis in the cloud. This guide walks you through setting up ElastiCache for Redis with production-ready configurations, security best practices, and performance optimizations.

## Why Use AWS ElastiCache for Redis?

ElastiCache for Redis offers several advantages over self-hosted Redis:

- **Managed Infrastructure**: AWS handles patching, backups, and failover
- **High Availability**: Multi-AZ deployments with automatic failover
- **Scalability**: Easy vertical and horizontal scaling
- **Security**: VPC integration, encryption, and IAM authentication
- **Monitoring**: Built-in CloudWatch metrics and enhanced monitoring

## Prerequisites

Before setting up ElastiCache, ensure you have:

- An AWS account with appropriate permissions
- A VPC with at least two subnets in different Availability Zones
- AWS CLI installed and configured
- Basic understanding of Redis concepts

## Creating a Subnet Group

First, create a subnet group that defines which subnets ElastiCache can use:

```bash
# Create a subnet group using AWS CLI
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name my-redis-subnet-group \
    --cache-subnet-group-description "Subnet group for Redis cluster" \
    --subnet-ids subnet-12345678 subnet-87654321
```

Using Terraform:

```hcl
resource "aws_elasticache_subnet_group" "redis" {
  name       = "my-redis-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Environment = "production"
  }
}
```

## Creating a Security Group

Configure a security group to control access to your Redis cluster:

```hcl
resource "aws_security_group" "redis" {
  name        = "redis-security-group"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from application"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
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

## Creating a Redis Cluster

### Option 1: Cluster Mode Disabled (Replication Group)

For simpler use cases with a primary node and read replicas:

```bash
aws elasticache create-replication-group \
    --replication-group-id my-redis-cluster \
    --replication-group-description "Production Redis cluster" \
    --engine redis \
    --engine-version 7.0 \
    --cache-node-type cache.r6g.large \
    --num-cache-clusters 3 \
    --cache-subnet-group-name my-redis-subnet-group \
    --security-group-ids sg-12345678 \
    --automatic-failover-enabled \
    --multi-az-enabled \
    --at-rest-encryption-enabled \
    --transit-encryption-enabled \
    --auth-token "YourStrongAuthToken123!" \
    --snapshot-retention-limit 7 \
    --snapshot-window "03:00-04:00" \
    --preferred-maintenance-window "sun:05:00-sun:06:00"
```

Using Terraform:

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "my-redis-cluster"
  description                = "Production Redis cluster"

  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3

  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]

  automatic_failover_enabled = true
  multi_az_enabled           = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  snapshot_retention_limit   = 7
  snapshot_window            = "03:00-04:00"
  maintenance_window         = "sun:05:00-sun:06:00"

  notification_topic_arn     = aws_sns_topic.redis_notifications.arn

  tags = {
    Environment = "production"
  }
}

resource "aws_elasticache_parameter_group" "redis" {
  family = "redis7"
  name   = "my-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }
}
```

### Option 2: Cluster Mode Enabled (Sharding)

For larger workloads requiring horizontal scaling:

```hcl
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id       = "my-redis-cluster-mode"
  description                = "Redis cluster with sharding"

  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.r6g.large"

  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.redis_cluster.name
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]

  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Cluster mode configuration
  num_node_groups            = 3  # Number of shards
  replicas_per_node_group    = 2  # Replicas per shard

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  snapshot_retention_limit   = 7

  tags = {
    Environment = "production"
  }
}

resource "aws_elasticache_parameter_group" "redis_cluster" {
  family = "redis7"
  name   = "my-redis-cluster-params"

  parameter {
    name  = "cluster-enabled"
    value = "yes"
  }
}
```

## Connecting to ElastiCache from Your Application

### Python Example

```python
import redis
from redis.cluster import RedisCluster

# For Cluster Mode Disabled
def get_redis_connection():
    return redis.Redis(
        host='my-redis-cluster.xxxxx.ng.0001.use1.cache.amazonaws.com',
        port=6379,
        password='YourStrongAuthToken123!',
        ssl=True,
        ssl_cert_reqs='required',
        decode_responses=True
    )

# For Cluster Mode Enabled
def get_redis_cluster_connection():
    return RedisCluster(
        host='my-redis-cluster-mode.xxxxx.clustercfg.use1.cache.amazonaws.com',
        port=6379,
        password='YourStrongAuthToken123!',
        ssl=True,
        decode_responses=True
    )

# Usage
redis_client = get_redis_connection()
redis_client.set('key', 'value')
value = redis_client.get('key')
print(f"Retrieved value: {value}")
```

### Node.js Example

```javascript
const Redis = require('ioredis');

// For Cluster Mode Disabled
const redis = new Redis({
  host: 'my-redis-cluster.xxxxx.ng.0001.use1.cache.amazonaws.com',
  port: 6379,
  password: 'YourStrongAuthToken123!',
  tls: {
    rejectUnauthorized: true
  }
});

// For Cluster Mode Enabled
const cluster = new Redis.Cluster([
  {
    host: 'my-redis-cluster-mode.xxxxx.clustercfg.use1.cache.amazonaws.com',
    port: 6379
  }
], {
  redisOptions: {
    password: 'YourStrongAuthToken123!',
    tls: {
      rejectUnauthorized: true
    }
  }
});

// Usage
async function example() {
  await redis.set('key', 'value');
  const value = await redis.get('key');
  console.log(`Retrieved value: ${value}`);
}
```

### Go Example

```go
package main

import (
    "context"
    "crypto/tls"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // For Cluster Mode Disabled
    rdb := redis.NewClient(&redis.Options{
        Addr:     "my-redis-cluster.xxxxx.ng.0001.use1.cache.amazonaws.com:6379",
        Password: "YourStrongAuthToken123!",
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
    })

    // Set and get a value
    err := rdb.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        panic(err)
    }

    val, err := rdb.Get(ctx, "key").Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Retrieved value: %s\n", val)
}
```

## Configuring CloudWatch Alarms

Set up monitoring and alerting for your Redis cluster:

```hcl
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redis CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "redis-current-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "Redis connection count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
}
```

## Security Best Practices

### 1. Enable Encryption

Always enable both at-rest and in-transit encryption:

```hcl
resource "aws_elasticache_replication_group" "redis" {
  # ... other configuration

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token  # Required with transit encryption
}
```

### 2. Use IAM Authentication (Redis 7.0+)

```python
import boto3
import redis

def get_redis_with_iam():
    session = boto3.Session()
    credentials = session.get_credentials()

    # Generate IAM auth token
    client = boto3.client('elasticache')
    token = client.generate_auth_token(
        CacheClusterId='my-redis-cluster',
        AuthTokenEnabled=True
    )

    return redis.Redis(
        host='my-redis-cluster.xxxxx.use1.cache.amazonaws.com',
        port=6379,
        password=token,
        ssl=True,
        decode_responses=True
    )
```

### 3. VPC Endpoints

Use VPC endpoints for secure, private connectivity:

```hcl
resource "aws_vpc_endpoint" "elasticache" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.elasticache"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  security_group_ids  = [aws_security_group.vpc_endpoint.id]
  private_dns_enabled = true
}
```

## Scaling Your Cluster

### Vertical Scaling (Change Node Type)

```bash
aws elasticache modify-replication-group \
    --replication-group-id my-redis-cluster \
    --cache-node-type cache.r6g.xlarge \
    --apply-immediately
```

### Horizontal Scaling (Add Shards - Cluster Mode Enabled)

```bash
aws elasticache modify-replication-group-shard-configuration \
    --replication-group-id my-redis-cluster-mode \
    --node-group-count 5 \
    --apply-immediately
```

### Add Read Replicas

```bash
aws elasticache increase-replica-count \
    --replication-group-id my-redis-cluster \
    --new-replica-count 3 \
    --apply-immediately
```

## Backup and Recovery

### Manual Snapshot

```bash
aws elasticache create-snapshot \
    --replication-group-id my-redis-cluster \
    --snapshot-name my-redis-backup-$(date +%Y%m%d)
```

### Restore from Snapshot

```bash
aws elasticache create-replication-group \
    --replication-group-id my-redis-restored \
    --replication-group-description "Restored Redis cluster" \
    --snapshot-name my-redis-backup-20240115 \
    --cache-node-type cache.r6g.large \
    --engine redis
```

## Performance Tuning

### Parameter Group Optimization

```hcl
resource "aws_elasticache_parameter_group" "optimized" {
  family = "redis7"
  name   = "optimized-redis-params"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  # Connection handling
  parameter {
    name  = "timeout"
    value = "300"
  }

  # Persistence (if needed)
  parameter {
    name  = "appendonly"
    value = "yes"
  }

  # Performance tuning
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
}
```

## Cost Optimization Tips

1. **Right-size your nodes**: Start with smaller instances and scale up based on actual usage
2. **Use Reserved Nodes**: Save up to 55% with 1 or 3-year reservations
3. **Optimize data structures**: Use hashes for objects instead of many string keys
4. **Set appropriate TTLs**: Prevent unbounded memory growth
5. **Monitor usage patterns**: Scale down during off-peak hours if possible

## Conclusion

AWS ElastiCache for Redis provides a robust, fully managed Redis solution that handles the operational complexity of running Redis at scale. By following this guide, you can set up a production-ready Redis cluster with proper security, monitoring, and scalability configurations.

Key takeaways:

- Always enable encryption and use strong authentication
- Configure Multi-AZ for high availability
- Set up CloudWatch alarms for proactive monitoring
- Use appropriate instance types and scaling strategies
- Implement regular backup schedules for disaster recovery

For more advanced configurations and use cases, refer to the AWS ElastiCache documentation and consider working with AWS support for production deployments.
