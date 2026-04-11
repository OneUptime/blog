# How to Scale ElastiCache Redis Cluster Up and Down

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, Scaling, AWS, Performance

Description: Learn how to scale Amazon ElastiCache Redis clusters vertically by changing node types and horizontally by adding or removing shards and replicas.

---

## Types of Scaling for ElastiCache Redis

ElastiCache Redis supports two scaling dimensions:

- **Vertical scaling (scale up/down)**: Change the node type to a larger or smaller instance (e.g., r7g.large to r7g.xlarge)
- **Horizontal scaling (scale out/in)**: Add or remove shards (cluster mode enabled) or read replicas

### Cluster Mode Disabled vs Enabled

- **Cluster mode disabled**: Single shard, can add read replicas (max 5), can change node type
- **Cluster mode enabled**: Multiple shards, can add/remove shards, can change node type online

## Vertical Scaling: Changing Node Type

Vertical scaling triggers a rolling replacement. For cluster mode disabled with Multi-AZ:

```bash
# Scale up from r7g.large to r7g.xlarge
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --cache-node-type cache.r7g.xlarge \
  --apply-immediately

# Check status
aws elasticache describe-replication-groups \
  --replication-group-id my-cluster \
  --query 'ReplicationGroups[0].{Status:Status,NodeType:CacheNodeType}'
```

With `--apply-immediately`, the change starts immediately but causes a brief failover. Without it, the change happens during the next maintenance window.

```bash
# Scale down from r7g.xlarge to r7g.large (schedule for maintenance window)
aws elasticache modify-replication-group \
  --replication-group-id my-cluster \
  --cache-node-type cache.r7g.large
  # No --apply-immediately, happens in maintenance window
```

## Terraform: Vertical Scaling

```hcl
variable "node_type" {
  description = "ElastiCache node type"
  default     = "cache.r7g.large"
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "my-cluster"
  description                = "Main Redis cluster"
  node_type                  = var.node_type  # Change this to scale vertically
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  apply_immediately          = false  # Apply in maintenance window
}
```

To scale: change `var.node_type` and run `terraform apply`.

## Horizontal Scaling: Adding Read Replicas (Cluster Mode Disabled)

```bash
# Add a read replica to handle more read traffic
aws elasticache increase-replica-count \
  --replication-group-id my-cluster \
  --new-replica-count 3 \
  --apply-immediately

# Remove a read replica
aws elasticache decrease-replica-count \
  --replication-group-id my-cluster \
  --new-replica-count 1 \
  --apply-immediately
```

## Horizontal Scaling: Adding Shards (Cluster Mode Enabled)

```bash
# Add shards to a cluster-mode-enabled cluster
# Current: 2 shards, Target: 4 shards
aws elasticache modify-replication-group-shard-configuration \
  --replication-group-id my-cluster-mode \
  --node-group-count 4 \
  --resharding-configuration '[
    {"NodeGroupId":"0001","PreferredAvailabilityZones":["us-east-1a","us-east-1b"]},
    {"NodeGroupId":"0002","PreferredAvailabilityZones":["us-east-1a","us-east-1b"]},
    {"NodeGroupId":"0003","PreferredAvailabilityZones":["us-east-1c","us-east-1a"]},
    {"NodeGroupId":"0004","PreferredAvailabilityZones":["us-east-1b","us-east-1c"]}
  ]' \
  --apply-immediately

# Scale in: reduce from 4 shards to 2
aws elasticache modify-replication-group-shard-configuration \
  --replication-group-id my-cluster-mode \
  --node-group-count 2 \
  --node-groups-to-remove "0003" "0004" \
  --apply-immediately
```

## Terraform: Horizontal Scaling with Cluster Mode

```hcl
resource "aws_elasticache_replication_group" "cluster" {
  replication_group_id       = "my-cluster-mode"
  description                = "Redis cluster mode enabled"
  node_type                  = "cache.r7g.large"
  num_node_groups            = 4  # Number of shards - change to scale out/in
  replicas_per_node_group    = 1  # Replicas per shard
  automatic_failover_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
}
```

## Monitoring Before and After Scaling

```python
import boto3
from datetime import datetime, timedelta

def get_scaling_metrics(cache_cluster_id):
    cw = boto3.client('cloudwatch', region_name='us-east-1')
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=1)

    metrics = ['BytesUsedForCache', 'FreeableMemory',
               'EngineCPUUtilization', 'CurrConnections',
               'NetworkBytesIn', 'NetworkBytesOut']

    results = {}
    for metric in metrics:
        response = cw.get_metric_statistics(
            Namespace='AWS/ElastiCache',
            MetricName=metric,
            Dimensions=[{'Name': 'CacheClusterId', 'Value': cache_cluster_id}],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Average', 'Maximum']
        )
        if response['Datapoints']:
            dp = response['Datapoints'][0]
            results[metric] = {'avg': dp['Average'], 'max': dp['Maximum']}

    return results

# Run before scaling to establish baseline (use a cache cluster ID, e.g., my-cluster-001)
metrics_before = get_scaling_metrics('my-cluster-001')

# Trigger scaling...

# Run after scaling to verify improvement
metrics_after = get_scaling_metrics('my-cluster-001')
```

## Scaling Recommendations by Metric

```text
Scale UP (larger node type) when:
  - FreeableMemory < 10% of total
  - EngineCPUUtilization > 70% sustained
  - SwapUsage > 0 (any swap is a red flag)

Add Read Replicas when:
  - GetTypeCmds rate exceeds what primary can handle
  - You need read scaling without resharding

Add Shards (cluster mode enabled) when:
  - Write throughput is the bottleneck
  - Single shard memory approaching node limit
  - Need to distribute load across more nodes

Scale DOWN when:
  - FreeableMemory > 50% consistently
  - CPU < 20% consistently
  - You want to reduce costs
```

## Auto Scaling with ElastiCache Serverless

If you want to avoid manual scaling decisions entirely, consider ElastiCache Serverless:

```hcl
resource "aws_elasticache_serverless_cache" "main" {
  engine = "redis"
  name   = "my-serverless-cache"

  cache_usage_limits {
    data_storage {
      maximum = 100  # GB
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 5000  # Adjust based on expected load
    }
  }

  security_group_ids = [aws_security_group.redis.id]
  subnet_ids         = var.private_subnet_ids
}
```

Serverless automatically scales compute and memory based on actual usage.

## Zero-Downtime Scaling Checklist

```text
Before scaling:
  1. Check current memory and CPU in CloudWatch
  2. Verify Multi-AZ is enabled (required for no-downtime vertical scaling)
  3. Schedule during low-traffic period if possible
  4. Notify team of planned maintenance

During scaling:
  1. Monitor CurrConnections for connection drops
  2. Watch application error rates
  3. Verify ReplicationLag stays low
  4. Cluster mode shard additions are online with no restart needed

After scaling:
  1. Confirm new node type in console or CLI
  2. Verify cache hit ratios returned to normal
  3. Update monitoring thresholds if needed
```

## Summary

ElastiCache Redis supports both vertical scaling (node type changes) and horizontal scaling (adding replicas or shards). Vertical scaling causes a brief failover when applied immediately, so schedule it during maintenance windows for production. Horizontal scaling by adding shards in cluster mode is online with no interruption. Monitor FreeableMemory and EngineCPUUtilization to determine when to scale, and use ElastiCache Serverless for workloads with highly variable traffic patterns.
