# How to Configure ElastiCache Redis Automatic Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, AWS, Failover, High Availability

Description: Learn how to enable and configure ElastiCache Redis automatic failover so AWS promotes a replica to primary without manual intervention during node failures.

---

Automatic failover in ElastiCache Redis means that when the primary node becomes unavailable, AWS detects the failure and promotes the replica with the least replication lag - typically within 60-120 seconds.

## Prerequisites

- Multi-AZ must be enabled
- At least one read replica in a different AZ
- Redis engine 2.8.6 or later

## Enabling Automatic Failover on a New Cluster

```bash
aws elasticache create-replication-group \
  --replication-group-id my-cluster \
  --replication-group-description "Cluster with auto failover" \
  --engine redis \
  --engine-version "7.1" \
  --cache-node-type cache.r7g.large \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --cache-subnet-group-name my-subnet-group
```

## Enabling on an Existing Cluster

```bash
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --apply-immediately
```

## Terraform

```hcl
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "my-cluster"
  description                = "Auto failover enabled"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  engine_version             = "7.1"
  subnet_group_name          = aws_elasticache_subnet_group.main.name
}
```

## Testing Failover

Use the `test-failover` API to trigger a real failover on your cluster so you can validate your application handles it correctly:

```bash
aws elasticache test-failover \
  --replication-group-id my-cluster \
  --node-group-id 0001
```

Monitor the failover progress:

```bash
aws elasticache describe-events \
  --source-type replication-group \
  --source-identifier my-cluster \
  --duration 60
```

## Application Retry Logic

During the 60-120 second window, your application will see connection errors. Implement retry with backoff:

```python
import redis
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=10))
def get_cached_value(key: str):
    client = redis.Redis(
        host="my-cluster.abc.cache.amazonaws.com",
        port=6379,
        ssl=True,
        socket_connect_timeout=2,
    )
    return client.get(key)
```

## Failover Events

ElastiCache publishes SNS notifications during failover:

```bash
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --notification-topic-arn arn:aws:sns:us-east-1:123456789:redis-alerts
```

Event types to watch:

```text
- Automatic failover has been triggered for replication group
- Failover from master node to replica node completed
- Test Failover API called for node group
```

## CloudWatch Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name elasticache-replication-lag \
  --metric-name ReplicationLag \
  --namespace AWS/ElastiCache \
  --statistic Maximum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

## Summary

Automatic failover with Multi-AZ ensures ElastiCache Redis recovers from primary node failures without manual intervention. Enable it on new or existing clusters, test it with the `test-failover` API, and add application-side retry logic to tolerate the brief reconnect window. Monitor `ReplicationLag` to ensure replicas stay in sync before a real failure occurs.
