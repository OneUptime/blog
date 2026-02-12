# How to Scale ElastiCache Redis Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ElastiCache, Redis, Scaling, Performance

Description: Learn how to scale ElastiCache Redis clusters vertically and horizontally, add shards, add replicas, and handle scaling operations with minimal downtime.

---

Your Redis cluster is running hot. Maybe memory is filling up, CPU is maxed, or you're hitting connection limits. Whatever the trigger, you need to scale. ElastiCache Redis gives you multiple scaling options - vertical (bigger nodes), horizontal (more shards or replicas), or both. The right approach depends on what's actually constrained.

Let's go through each scaling strategy with practical steps.

## Diagnosing What to Scale

Before scaling, figure out what's actually the bottleneck:

```bash
# Check CPU - is the engine thread maxed out?
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name EngineCPUUtilization \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --start-time $(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average Maximum

# Check memory - are you running out of space?
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --start-time $(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average Maximum

# Check connections - hitting the limit?
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CurrConnections \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --start-time $(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum

# Check network - saturating bandwidth?
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name NetworkBytesIn \
  --dimensions Name=CacheClusterId,Value=my-redis-001 \
  --start-time $(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average Maximum
```

Here's a quick decision matrix:

| Bottleneck | Solution |
|-----------|---------|
| Memory full | Scale up (bigger node) or scale out (more shards) |
| CPU maxed | Scale up or add shards to distribute writes |
| Read heavy | Add read replicas |
| Write heavy | Add shards (cluster mode enabled only) |
| Connections maxed | Scale up (bigger nodes have higher limits) or add replicas |
| Network saturated | Scale up to a bigger instance class |

## Vertical Scaling (Scale Up/Down)

Vertical scaling means changing the node type to a bigger or smaller instance. This gives you more memory, CPU, and network bandwidth.

### Cluster Mode Disabled

```bash
# Scale up the node type (causes a brief outage during failover)
aws elasticache modify-replication-group \
  --replication-group-id my-redis-cluster \
  --cache-node-type cache.r6g.xlarge \
  --apply-immediately
```

What happens during a vertical scale:
1. ElastiCache creates new nodes with the new instance type
2. Data is synced to the new nodes
3. A failover occurs (brief outage, typically under 30 seconds with Multi-AZ)
4. Old nodes are terminated

### Cluster Mode Enabled

For cluster mode enabled, the process is similar but happens shard by shard:

```bash
# Scale up cluster mode enabled Redis
aws elasticache modify-replication-group \
  --replication-group-id my-redis-cluster \
  --cache-node-type cache.r6g.xlarge \
  --apply-immediately
```

## Horizontal Scaling - Adding Read Replicas

If your workload is read-heavy, adding replicas distributes read traffic across more nodes.

### Adding Replicas (Cluster Mode Disabled)

```bash
# Add replicas (going from 1 to 3 replicas)
aws elasticache increase-replica-count \
  --replication-group-id my-redis-cluster \
  --new-replica-count 3 \
  --apply-immediately
```

Monitor the replica addition:

```bash
# Check status of the replication group
aws elasticache describe-replication-groups \
  --replication-group-id my-redis-cluster \
  --query 'ReplicationGroups[0].{
    Status:Status,
    NodeCount:MemberClusters,
    Nodes:NodeGroups[0].NodeGroupMembers[*].{
      Id:CacheClusterId,
      Role:CurrentRole,
      AZ:PreferredAvailabilityZone
    }
  }'
```

### Adding Replicas (Cluster Mode Enabled)

For cluster mode enabled, you add replicas per shard:

```bash
# Add a replica to each shard
aws elasticache increase-replica-count \
  --replication-group-id my-redis-cluster \
  --new-replica-count 2 \
  --apply-immediately
```

### Removing Replicas

When traffic decreases, remove replicas to save cost:

```bash
# Remove replicas (going from 3 to 1 replica)
aws elasticache decrease-replica-count \
  --replication-group-id my-redis-cluster \
  --new-replica-count 1 \
  --apply-immediately
```

## Horizontal Scaling - Adding Shards (Cluster Mode Enabled)

Adding shards increases your total memory capacity and write throughput. This is only available in cluster mode enabled.

### Resharding (Adding Shards)

```bash
# Add shards (going from 3 to 5 shards)
aws elasticache modify-replication-group-shard-configuration \
  --replication-group-id my-redis-cluster \
  --node-group-count 5 \
  --apply-immediately
```

ElastiCache redistributes the hash slots across the new shard configuration. This happens online - your cluster stays available during the resharding operation.

### Resharding with Specific Slot Distribution

For more control over how data is distributed:

```bash
# Add shards with specific slot distribution
aws elasticache modify-replication-group-shard-configuration \
  --replication-group-id my-redis-cluster \
  --node-group-count 4 \
  --resharding-configuration \
    "NodeGroupId=0001,PreferredAvailabilityZones=us-east-1a,us-east-1b" \
    "NodeGroupId=0002,PreferredAvailabilityZones=us-east-1b,us-east-1c" \
    "NodeGroupId=0003,PreferredAvailabilityZones=us-east-1a,us-east-1c" \
    "NodeGroupId=0004,PreferredAvailabilityZones=us-east-1a,us-east-1b" \
  --apply-immediately
```

### Removing Shards

You can also scale in by removing shards:

```bash
# Remove shards (going from 5 to 3 shards)
aws elasticache modify-replication-group-shard-configuration \
  --replication-group-id my-redis-cluster \
  --node-group-count 3 \
  --node-groups-to-remove 0004 0005 \
  --apply-immediately
```

## Terraform for Scaled Configurations

Here's a Terraform configuration that's easy to scale:

```hcl
variable "redis_node_type" {
  description = "ElastiCache node type"
  default     = "cache.r6g.large"
}

variable "redis_num_shards" {
  description = "Number of shards (node groups)"
  default     = 3
}

variable "redis_replicas_per_shard" {
  description = "Number of replicas per shard"
  default     = 1
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "my-scalable-redis"
  description          = "Scalable Redis cluster"

  engine         = "redis"
  engine_version = "7.0"
  node_type      = var.redis_node_type

  # Cluster mode configuration
  num_node_groups         = var.redis_num_shards
  replicas_per_node_group = var.redis_replicas_per_shard

  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = 7
}

# To scale, just change the variables:
# terraform apply -var="redis_node_type=cache.r6g.xlarge"
# terraform apply -var="redis_num_shards=5"
# terraform apply -var="redis_replicas_per_shard=2"
```

## Scaling Best Practices

**Test scaling in a non-production environment first.** Resharding and node type changes can behave differently depending on your data patterns.

**Monitor during and after scaling.** Keep an eye on CloudWatch metrics during the operation. Check for increased latency, connection errors, or failed operations. See the guide on [monitoring ElastiCache with CloudWatch](https://oneuptime.com/blog/post/monitor-elasticache-with-cloudwatch/view).

**Scale before you need to.** If memory is at 80% and growing, scale now. Don't wait until 95%.

**Plan for the backup memory overhead.** Redis needs extra memory for background saves (RDB snapshots). Keep at least 25% memory free after scaling.

**Use cluster mode enabled for production workloads that might need to scale.** You can't add shards to a cluster mode disabled setup. If there's any chance you'll outgrow a single shard, start with cluster mode enabled.

**Schedule scaling during low-traffic periods.** Vertical scaling causes a brief failover. Resharding stays online but adds load.

## Auto-Scaling with Application Auto Scaling

ElastiCache Redis cluster mode enabled supports auto-scaling for the number of shards and replicas:

```bash
# Register the ElastiCache cluster for auto scaling
aws application-autoscaling register-scalable-target \
  --service-namespace elasticache \
  --resource-id replication-group/my-redis-cluster \
  --scalable-dimension elasticache:replication-group:NodeGroups \
  --min-capacity 2 \
  --max-capacity 10

# Create a target tracking policy for CPU-based scaling
aws application-autoscaling put-scaling-policy \
  --service-namespace elasticache \
  --resource-id replication-group/my-redis-cluster \
  --scalable-dimension elasticache:replication-group:NodeGroups \
  --policy-name redis-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ElastiCachePrimaryEngineCPUUtilization"
    },
    "ScaleInCooldown": 600,
    "ScaleOutCooldown": 300
  }'
```

## Wrapping Up

Scaling ElastiCache Redis comes down to understanding your bottleneck. Memory-bound? Scale up or add shards. Read-heavy? Add replicas. Write-heavy? Add shards. Connection-heavy? Scale up. Start with the right architecture (cluster mode enabled) and you'll have the flexibility to handle whatever growth throws at you.

For more ElastiCache management, check out the guide on [configuring ElastiCache Redis replication](https://oneuptime.com/blog/post/configure-elasticache-redis-replication/view) and [enabling encryption](https://oneuptime.com/blog/post/enable-elasticache-redis-encryption/view) for security.
