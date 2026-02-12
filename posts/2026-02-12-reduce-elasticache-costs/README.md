# How to Reduce ElastiCache Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ElastiCache, Cost Optimization, Redis, Caching

Description: Practical techniques to reduce Amazon ElastiCache costs including right-sizing nodes, using reserved nodes, data tiering, and optimizing your cache architecture.

---

ElastiCache is one of those services that starts small and grows quietly until it becomes a major line item. A single cache.r6g.xlarge node costs about $3,100 per year on-demand. Most production setups run at least a primary plus a replica, so you're looking at $6,200 before you've even considered cluster mode or multiple environments.

The good news is there are several effective ways to bring these costs down without sacrificing cache performance. Let's go through them.

## Right-Size Your Cache Nodes

Overprovisioning is the most common waste in ElastiCache. Teams often pick a node size based on a rough estimate and never revisit it.

Start by checking your actual memory and CPU utilization:

```bash
# Check memory utilization for an ElastiCache Redis cluster
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=CacheClusterId,Value=my-redis-cluster-001 \
  --start-time 2026-01-13T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z \
  --period 86400 \
  --statistics Average Maximum \
  --output table

# Check CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name EngineCPUUtilization \
  --dimensions Name=CacheClusterId,Value=my-redis-cluster-001 \
  --start-time 2026-01-13T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z \
  --period 86400 \
  --statistics Average Maximum \
  --output table
```

If your peak memory utilization is consistently below 50%, you're likely overprovisioned. A node running at 60-75% memory utilization is well-sized - you want headroom for traffic spikes, but not 50% of unused capacity.

Here's a quick sizing guide:

| Current Node | Memory | If Usage < 40% | Consider |
|---|---|---|---|
| cache.r6g.2xlarge | 52.82 GB | < 21 GB used | cache.r6g.xlarge (26.32 GB) |
| cache.r6g.xlarge | 26.32 GB | < 10.5 GB used | cache.r6g.large (13.07 GB) |
| cache.r6g.large | 13.07 GB | < 5 GB used | cache.r6g.medium (6.38 GB) |

## Use Reserved Nodes

Just like RDS Reserved Instances, ElastiCache offers reserved nodes with significant discounts. The savings range from 30% to 55% depending on the term and payment option.

```bash
# List available reserved cache node offerings
aws elasticache describe-reserved-cache-nodes-offerings \
  --cache-node-type cache.r6g.xlarge \
  --product-description "redis" \
  --query "ReservedCacheNodesOfferings[].{
    OfferingId: ReservedCacheNodesOfferingId,
    NodeType: CacheNodeType,
    Duration: Duration,
    FixedPrice: FixedPrice,
    OfferingType: OfferingType
  }" \
  --output table

# Purchase a reserved cache node
aws elasticache purchase-reserved-cache-nodes-offering \
  --reserved-cache-nodes-offering-id offering-id-here \
  --cache-node-count 2
```

For stable production workloads, 1-year All Upfront reservations are typically the best balance of savings and flexibility. See our detailed guide on [reducing RDS costs with reserved instances](https://oneuptime.com/blog/post/reduce-rds-costs-with-reserved-instances/view) for more on reservation strategies - the same principles apply.

## Use Data Tiering with r6gd Nodes

ElastiCache for Redis supports data tiering on r6gd node types. These nodes combine memory with local SSD storage, automatically moving less-frequently accessed data to SSD while keeping hot data in memory.

The r6gd nodes are about 60% cheaper per GB of total capacity compared to r6g nodes. If your dataset is large but only a portion is actively accessed, this can be a game-changer.

```bash
# Create a Redis cluster with data tiering enabled (r6gd nodes)
aws elasticache create-replication-group \
  --replication-group-id my-tiered-cache \
  --replication-group-description "Redis with data tiering" \
  --cache-node-type cache.r6gd.xlarge \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-clusters 2 \
  --data-tiering-enabled \
  --cache-parameter-group-name default.redis7
```

Data tiering works best when your access patterns follow the 80/20 rule - 80% of requests hit 20% of your data. Redis automatically manages what goes where based on access frequency.

## Optimize Your Cache Strategy

Sometimes the best way to reduce ElastiCache costs is to use less cache. Review your caching patterns:

**Remove stale data with TTLs.** Every key without a TTL sits in memory forever. Make sure all keys have appropriate expiration:

```python
import redis

r = redis.Redis(host='my-cluster.cache.amazonaws.com', port=6379)

# Always set TTLs when writing cache entries
r.setex(
    name='user:12345:profile',
    time=3600,  # 1 hour TTL
    value=serialized_profile
)

# For keys that should live longer but not forever
r.setex(
    name='product:catalog:full',
    time=86400,  # 24 hour TTL
    value=serialized_catalog
)

# Check for keys without TTLs (run in a maintenance window)
# Warning: SCAN can impact performance on large datasets
cursor = 0
no_ttl_count = 0
while True:
    cursor, keys = r.scan(cursor=cursor, count=100)
    for key in keys:
        if r.ttl(key) == -1:  # -1 means no TTL
            no_ttl_count += 1
    if cursor == 0:
        break

print(f"Keys without TTL: {no_ttl_count}")
```

**Compress large values.** If you're caching large JSON objects, compress them before storing:

```python
import redis
import gzip
import json

r = redis.Redis(host='my-cluster.cache.amazonaws.com', port=6379)

def cache_set(key, data, ttl=3600):
    # Compress data before caching to reduce memory usage
    serialized = json.dumps(data).encode('utf-8')
    compressed = gzip.compress(serialized)

    savings = (1 - len(compressed) / len(serialized)) * 100
    print(f"Compression saved {savings:.0f}% ({len(serialized)} -> {len(compressed)} bytes)")

    r.setex(key, ttl, compressed)

def cache_get(key):
    data = r.get(key)
    if data is None:
        return None
    return json.loads(gzip.decompress(data))
```

**Use appropriate data structures.** Redis hashes are more memory-efficient than storing individual string keys for related data:

```python
# Less efficient: individual keys
r.set('user:1000:name', 'Alice')
r.set('user:1000:email', 'alice@example.com')
r.set('user:1000:plan', 'premium')

# More efficient: hash
r.hset('user:1000', mapping={
    'name': 'Alice',
    'email': 'alice@example.com',
    'plan': 'premium'
})
```

## Reduce Replica Count

Multi-AZ replicas provide high availability, but do you need them in every environment? For development and staging, a single node without replicas is usually fine:

```bash
# Create a dev cache with no replicas
aws elasticache create-replication-group \
  --replication-group-id dev-cache \
  --replication-group-description "Dev environment cache" \
  --cache-node-type cache.t4g.medium \
  --engine redis \
  --num-cache-clusters 1

# For production, you still want replicas but maybe not three
aws elasticache create-replication-group \
  --replication-group-id prod-cache \
  --replication-group-description "Production cache" \
  --cache-node-type cache.r6g.large \
  --engine redis \
  --num-cache-clusters 2 \
  --multi-az-enabled \
  --automatic-failover-enabled
```

Each replica costs the same as the primary node. Dropping from 2 replicas to 1 in production cuts your node costs by 33%.

## Use Graviton-Based Instances

If you haven't already moved to the r6g or r7g instance families, you're paying more than you need to. Graviton-based ElastiCache nodes offer up to 20% better price-performance compared to x86 equivalents.

```bash
# Migrate from r5 to r6g (Graviton2)
aws elasticache modify-replication-group \
  --replication-group-id my-cache \
  --cache-node-type cache.r6g.large \
  --apply-immediately
```

## Schedule Non-Production Caches

Dev and staging caches don't need to run 24/7. While ElastiCache doesn't support native scheduling, you can automate cluster creation and deletion:

```python
import boto3

elasticache = boto3.client('elasticache')

def stop_dev_cache(event, context):
    """Delete dev cache cluster at end of business day"""
    try:
        # Create a final snapshot before deleting
        elasticache.delete_replication_group(
            ReplicationGroupId='dev-cache',
            FinalSnapshotIdentifier=f'dev-cache-nightly-backup'
        )
        print("Dev cache deletion initiated")
    except Exception as e:
        print(f"Error: {e}")

def start_dev_cache(event, context):
    """Recreate dev cache from snapshot at start of business day"""
    try:
        elasticache.create_replication_group(
            ReplicationGroupId='dev-cache',
            ReplicationGroupDescription='Dev cache',
            CacheNodeType='cache.r6g.large',
            Engine='redis',
            NumCacheClusters=1,
            SnapshotName='dev-cache-nightly-backup'
        )
        print("Dev cache creation initiated")
    except Exception as e:
        print(f"Error: {e}")
```

Running caches only during business hours (10 hours/day, weekdays only) cuts costs by roughly 70% for non-production environments. Learn more about this approach in our post on [scheduling non-production resources to save costs](https://oneuptime.com/blog/post/schedule-non-production-resources-to-save-costs/view).

## Summary

The biggest ElastiCache savings typically come from right-sizing (check your memory utilization), followed by reserved nodes for stable workloads, and data tiering for large datasets. Don't forget the operational optimizations: TTLs on all keys, compression for large values, and shutting down non-production caches after hours. Combined, these strategies can easily cut your ElastiCache bill by 40-60%.
