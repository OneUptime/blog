# How to Migrate Redis Between AWS Regions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AWS, ElastiCache, Migration, Cloud

Description: Learn how to migrate Redis data between AWS regions using ElastiCache Global Datastore, RDB export, or cross-region replication with minimal downtime.

---

Moving a Redis workload to a different AWS region requires careful planning around data transfer, downtime, and connection cutover. This guide covers three approaches depending on whether you use Amazon ElastiCache or self-managed Redis on EC2.

## Option 1: ElastiCache Global Datastore (ElastiCache Only)

AWS ElastiCache Global Datastore enables cross-region replication with near-real-time sync. This is the lowest-downtime option for managed Redis.

```bash
# Using AWS CLI - create a global datastore from your primary cluster
aws elasticache create-global-replication-group \
  --global-replication-group-id-suffix my-global-cluster \
  --primary-replication-group-id my-redis-primary \
  --region us-east-1

# Add a secondary cluster in the target region
aws elasticache create-replication-group \
  --replication-group-id my-redis-secondary \
  --replication-group-description "Secondary in us-west-2" \
  --global-replication-group-id my-global-cluster \
  --region us-west-2

# Check status
aws elasticache describe-global-replication-groups \
  --global-replication-group-id my-global-cluster
```

Once the secondary is in sync, promote it to primary and update your application endpoints:

```bash
aws elasticache failover-global-replication-group \
  --global-replication-group-id my-global-cluster \
  --primary-region us-west-2 \
  --primary-replication-group-id my-redis-secondary
```

## Option 2: RDB Snapshot Transfer (ElastiCache)

For ElastiCache without Global Datastore, export an RDB snapshot and restore it in the target region.

**Step 1: Create a snapshot**

```bash
aws elasticache create-snapshot \
  --replication-group-id my-redis-cluster \
  --snapshot-name redis-migration-snapshot \
  --region us-east-1
```

**Step 2: Copy snapshot to target region**

```bash
aws elasticache copy-snapshot \
  --source-snapshot-name redis-migration-snapshot \
  --target-snapshot-name redis-migration-snapshot-west \
  --region us-west-2
```

**Step 3: Restore in target region**

```bash
aws elasticache create-replication-group \
  --replication-group-id my-redis-west \
  --replication-group-description "Redis US West" \
  --snapshot-name redis-migration-snapshot-west \
  --cache-node-type cache.r7g.large \
  --region us-west-2
```

## Option 3: Self-Managed Redis on EC2

If you run Redis on EC2, use cross-region replication directly between instances.

**Step 1: Set up VPC peering or Transit Gateway between regions**

```bash
# Create VPC peering connection
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-source123 \
  --peer-vpc-id vpc-dest456 \
  --peer-region us-west-2

# Accept the peering connection in the target region
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-xxxxxxxxxxxx \
  --region us-west-2
```

**Step 2: Configure Redis replica in target region**

```bash
# On the target EC2 instance, configure Redis as replica
redis-cli REPLICAOF <source-private-ip> 6379

# Verify replication
redis-cli INFO replication | grep -E "role|master_link_status"
```

**Step 3: Promote and cutover**

```bash
# When offsets match, promote the replica
redis-cli -h <target-host> REPLICAOF NO ONE

# Update application DNS or connection strings
```

## Validate After Migration

```bash
# Compare key counts
redis-cli -h <source-host> DBSIZE
redis-cli -h <target-host> DBSIZE

# Spot-check data
redis-cli -h <target-host> RANDOMKEY
redis-cli -h <target-host> PING

# Check memory
redis-cli -h <target-host> INFO memory | grep used_memory_human
```

## Update Application Configuration

```python
import os
import redis

# Use environment variable for region-specific endpoint
r = redis.Redis(
    host=os.environ["REDIS_HOST"],  # Update to new region endpoint
    port=6379,
    password=os.environ["REDIS_PASSWORD"],
    ssl=True  # ElastiCache in-transit encryption
)
```

## Summary

For ElastiCache, Global Datastore is the best option for live migration with minimal downtime. For snapshot-based migrations or self-managed Redis, cross-region replication through VPC peering provides a safe path. Always validate key counts and spot-check data after migration before decommissioning the source cluster.
