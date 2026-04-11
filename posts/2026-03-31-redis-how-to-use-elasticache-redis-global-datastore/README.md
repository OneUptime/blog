# How to Use ElastiCache Redis Global Datastore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, Global Datastore, AWS, Multi-Region, Disaster Recovery

Description: Learn how to set up and use ElastiCache Global Datastore to replicate Redis data across AWS regions for low-latency global reads and disaster recovery.

---

## What Is ElastiCache Global Datastore

ElastiCache Global Datastore is an AWS feature that enables cross-region replication for ElastiCache Redis clusters. It provides:

- Active-passive replication across up to 3 AWS regions
- Sub-second replication lag for reads from secondary regions
- Manual failover to promote a secondary cluster to primary via CLI, API, or console
- Centralized management of clusters across regions

This is useful for globally distributed applications that need low-latency reads in multiple regions or require cross-region disaster recovery.

## Architecture Overview

```text
                Primary Region (us-east-1)
                  Primary Cluster (read/write)
                     /              \
                    /                \
   async replication            async replication
                  /                    \
                 /                      \
Secondary Region 1 (eu-west-1)    Secondary Region 2 (ap-southeast-1)
  Secondary Cluster (read-only)     Secondary Cluster (read-only)
```

Only the primary cluster accepts writes. Secondary clusters are read-only and receive replicated data automatically.

## Creating a Global Datastore via AWS Console

1. Navigate to ElastiCache in the AWS Console
2. Select an existing Redis replication group (cluster mode enabled or disabled, Redis 5.0.6+)
3. Click "Add Global Datastore"
4. Give the global datastore a name
5. Add secondary regions by clicking "Add region"
6. Select the node type and replica count for each secondary

## Creating a Global Datastore via AWS CLI

```bash
# Step 1: Create the primary cluster in us-east-1
aws elasticache create-replication-group \
  --replication-group-id my-primary-cluster \
  --replication-group-description "Primary for Global Datastore" \
  --num-cache-clusters 2 \
  --cache-node-type cache.r7g.large \
  --engine redis \
  --engine-version 7.1 \
  --automatic-failover-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --region us-east-1

# Step 2: Create the Global Datastore
aws elasticache create-global-replication-group \
  --global-replication-group-id-suffix my-global-store \
  --primary-replication-group-id my-primary-cluster \
  --region us-east-1

# Step 3: Add a secondary region
aws elasticache create-replication-group \
  --replication-group-id my-secondary-eu \
  --replication-group-description "Secondary EU for Global Datastore" \
  --global-replication-group-id ldgnf-my-global-store \
  --num-cache-clusters 2 \
  --cache-node-type cache.r7g.large \
  --region eu-west-1
```

## Terraform Configuration

```hcl
# Primary cluster in us-east-1
resource "aws_elasticache_replication_group" "primary" {
  provider                   = aws.us_east_1
  replication_group_id       = "global-primary"
  description                = "Primary replication group"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  engine_version             = "7.1"
}

# Global Datastore
resource "aws_elasticache_global_replication_group" "global" {
  global_replication_group_id_suffix = "my-app"
  primary_replication_group_id       = aws_elasticache_replication_group.primary.id
}

# Secondary cluster in eu-west-1
resource "aws_elasticache_replication_group" "secondary_eu" {
  provider                        = aws.eu_west_1
  replication_group_id            = "global-secondary-eu"
  description                     = "Secondary EU replication group"
  global_replication_group_id     = aws_elasticache_global_replication_group.global.global_replication_group_id
  num_cache_clusters              = 2
  automatic_failover_enabled      = true
}
```

## Connecting to Regional Clusters

Each region has its own endpoint. Applications should connect to the local region's endpoint for lowest latency reads.

```python
import redis

def get_regional_redis_client(region):
    """Get Redis client for the local region"""
    # In production, retrieve endpoint from Parameter Store or environment
    endpoints = {
        'us-east-1': 'primary.abc123.0001.use1.cache.amazonaws.com',
        'eu-west-1': 'secondary.def456.0001.euw1.cache.amazonaws.com',
        'ap-southeast-1': 'secondary.ghi789.0001.apse1.cache.amazonaws.com',
    }

    host = endpoints.get(region)
    if not host:
        raise ValueError(f"No Redis endpoint for region: {region}")

    return redis.Redis(host=host, port=6379, ssl=True, decode_responses=True)

# Applications in EU read from local secondary
eu_client = get_regional_redis_client('eu-west-1')
value = eu_client.get('user:1001:profile')

# Writes must go to primary (us-east-1)
primary_client = get_regional_redis_client('us-east-1')
primary_client.set('user:1001:profile', '{"name":"Alice"}', ex=3600)
```

## Handling Read/Write Routing in Application Code

```python
class GlobalRedisClient:
    def __init__(self, local_region, primary_region='us-east-1'):
        self.local_client = get_regional_redis_client(local_region)
        self.primary_client = get_regional_redis_client(primary_region)
        self.is_primary = (local_region == primary_region)

    def get(self, key):
        """Read from local region"""
        return self.local_client.get(key)

    def set(self, key, value, **kwargs):
        """Write always goes to primary"""
        return self.primary_client.set(key, value, **kwargs)

    def delete(self, key):
        """Deletes must go to primary"""
        return self.primary_client.delete(key)

    def get_with_write_fallback(self, key):
        """Read from local, fallback to primary if key not yet replicated"""
        value = self.local_client.get(key)
        if value is None and not self.is_primary:
            # Might be a very recent write not yet replicated
            value = self.primary_client.get(key)
        return value

client = GlobalRedisClient(local_region='eu-west-1')
```

## Failover: Promoting a Secondary to Primary

If the primary region becomes unavailable, promote a secondary to primary.

```bash
# Initiate failover to promote eu-west-1 secondary
aws elasticache failover-global-replication-group \
  --global-replication-group-id ldgnf-my-app \
  --primary-region eu-west-1 \
  --primary-replication-group-id my-secondary-eu

# Check status
aws elasticache describe-global-replication-groups \
  --global-replication-group-id ldgnf-my-app \
  --query 'GlobalReplicationGroups[0].Status'
```

After failover, update your application's write endpoint to point to the new primary.

## Monitoring Replication Lag

```bash
# Check replication lag in CloudWatch for secondary clusters
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name GlobalDatastoreReplicationLag \
  --dimensions Name=ReplicationGroupId,Value=my-secondary-eu \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T01:00:00Z \
  --period 60 \
  --statistics Average
```

Key CloudWatch metrics for Global Datastore:

- `GlobalDatastoreReplicationLag` - replication lag in seconds (target: under 1 second)
- `CurrConnections` - active connections per region
- `CacheHits` / `CacheMisses` - effectiveness per region

## Cost Considerations

Global Datastore incurs additional costs:

```text
Data transfer charges:
- ~$0.02/GB for cross-region replication traffic
- Applies to all writes that replicate to secondary regions

Node costs:
- Each region's cluster is billed separately
- 3-region setup: roughly 3x the node cost of a single-region cluster

Example (cache.r7g.large, 2 nodes, 3 regions):
- Node cost: 6 nodes x $0.166/hr = ~$720/month
- Plus replication data transfer
```

## Summary

ElastiCache Global Datastore enables cross-region Redis replication for globally distributed applications, providing low-latency local reads and cross-region disaster recovery. Set up involves creating a primary cluster, wrapping it in a Global Datastore, and adding secondary clusters in additional regions. Applications should route reads to the local regional endpoint and writes to the primary, with manual failover available via CLI, API, or console when the primary region fails.
