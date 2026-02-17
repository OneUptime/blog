# How to Set Up Geo-Replication for Azure Cache for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Redis, Geo-Replication, Caching, Disaster Recovery, Azure Cache for Redis, High Availability

Description: A step-by-step guide to configuring geo-replication for Azure Cache for Redis to achieve cross-region data redundancy and faster reads.

---

When your application serves users across multiple continents, a single Redis cache in one region creates an obvious bottleneck. Users on the other side of the world deal with higher latency, and if that region goes down, your cache goes with it. Geo-replication for Azure Cache for Redis solves both problems by linking cache instances across Azure regions.

## Understanding Geo-Replication in Azure Cache for Redis

Geo-replication in Azure Cache for Redis creates a link between two Premium tier cache instances. One acts as the primary (the cache your application writes to), and the other acts as the secondary (a read-only replica in another region). Data written to the primary is asynchronously replicated to the secondary.

There are two flavors of geo-replication available:

- **Passive geo-replication** (available on Premium tier): Links two independent cache instances. The secondary is read-only. Failover is manual.
- **Active geo-replication** (available on Enterprise tier): Allows writes to multiple linked caches simultaneously using conflict-free replicated data types (CRDTs). Failover is automatic.

This guide focuses on passive geo-replication with the Premium tier, since it is the most commonly used option and does not require the Enterprise tier pricing.

## Prerequisites

Before starting, you will need:

- Two Azure Cache for Redis instances on the Premium tier, in different Azure regions
- Both caches must have the same SKU size (e.g., both P1 or both P2)
- Neither cache can already be part of a geo-replication link
- Both caches must not have clustering enabled, or if clustering is used, both must have the same number of shards
- Azure CLI version 2.40 or later, or access to the Azure Portal

## Step 1: Create Two Premium Tier Caches

If you already have two Premium caches in different regions, skip ahead. Otherwise, create them.

```bash
# Create the primary cache in East US
az redis create \
  --name redis-primary-eastus \
  --resource-group rg-redis-geo \
  --location eastus \
  --sku Premium \
  --vm-size P1

# Create the secondary cache in West Europe
az redis create \
  --name redis-secondary-westeu \
  --resource-group rg-redis-geo \
  --location westeurope \
  --sku Premium \
  --vm-size P1
```

Both caches must use the same `--vm-size`. If the primary is P2, the secondary must also be P2. Mismatched sizes will cause the linking step to fail.

Wait for both caches to reach the "Running" state before proceeding. This usually takes 15-20 minutes per cache.

```bash
# Check the provisioning state of both caches
az redis show --name redis-primary-eastus --resource-group rg-redis-geo --query "provisioningState"
az redis show --name redis-secondary-westeu --resource-group rg-redis-geo --query "provisioningState"
```

## Step 2: Link the Caches

Geo-replication is established by creating a link from the secondary to the primary. This is a one-way relationship: the primary receives writes, and the secondary receives replicated data.

**Using the Azure Portal:**

1. Go to your primary cache (redis-primary-eastus) in the Azure Portal.
2. Under Settings, click "Geo-replication".
3. Click "Add cache replication link".
4. Select the secondary cache (redis-secondary-westeu) from the list.
5. Click "Link".

**Using Azure CLI:**

```bash
# Get the resource ID of the primary cache
PRIMARY_ID=$(az redis show \
  --name redis-primary-eastus \
  --resource-group rg-redis-geo \
  --query id -o tsv)

# Create the geo-replication link from the secondary to the primary
az redis server-link create \
  --name redis-secondary-westeu \
  --resource-group rg-redis-geo \
  --server-to-link $PRIMARY_ID \
  --replication-role Secondary
```

The linking process takes a few minutes. During this time, the secondary cache will sync with the primary. If the primary has existing data, the initial sync can take longer depending on data size.

## Step 3: Verify the Replication Link

After linking, verify that replication is active and healthy.

```bash
# List all geo-replication links for the secondary cache
az redis server-link list \
  --name redis-secondary-westeu \
  --resource-group rg-redis-geo \
  -o table
```

You should see output showing the link status as "Linked" and the replication role as "Secondary". If the status shows "Provisioning", wait a few more minutes.

You can also check from the primary side:

```bash
# List links from the primary cache perspective
az redis server-link list \
  --name redis-primary-eastus \
  --resource-group rg-redis-geo \
  -o table
```

## Step 4: Test Replication

Write some data to the primary and verify it appears on the secondary.

```bash
# Write a test key to the primary cache
redis-cli -h redis-primary-eastus.redis.cache.windows.net \
  -p 6380 --tls -a <primary-access-key> \
  SET geo-test-key "hello-from-primary"

# Read the test key from the secondary cache (may take a moment to replicate)
redis-cli -h redis-secondary-westeu.redis.cache.windows.net \
  -p 6380 --tls -a <secondary-access-key> \
  GET geo-test-key
```

The secondary should return `"hello-from-primary"`. Replication lag is typically under one second for small payloads, but it can increase under heavy write loads.

Note that you cannot write to the secondary cache. Attempting a SET command on the secondary will return an error.

## Step 5: Configure Your Application

Your application needs to know about both caches and route traffic appropriately. The typical pattern is:

- **Writes** always go to the primary cache.
- **Reads** can go to either the primary (for strong consistency) or the secondary (for lower latency in the secondary's region).

Here is a simplified example in Python showing how you might implement this routing:

```python
import redis

# Primary cache connection - used for all writes
primary = redis.Redis(
    host='redis-primary-eastus.redis.cache.windows.net',
    port=6380,
    password='<primary-access-key>',
    ssl=True,
    decode_responses=True
)

# Secondary cache connection - used for reads in the Europe region
secondary = redis.Redis(
    host='redis-secondary-westeu.redis.cache.windows.net',
    port=6380,
    password='<secondary-access-key>',
    ssl=True,
    decode_responses=True
)

def cache_write(key, value, ttl=3600):
    """All writes go to the primary cache."""
    primary.setex(key, ttl, value)

def cache_read(key, prefer_local=True):
    """Reads go to secondary if prefer_local is True, otherwise primary."""
    if prefer_local:
        result = secondary.get(key)
        if result is not None:
            return result
    # Fall back to primary if key not found on secondary
    return primary.get(key)
```

In a real production setup, you would use your application's region detection or a configuration flag to decide which cache to read from.

## Handling Failover

Passive geo-replication does not support automatic failover. If the primary region goes down, you need to manually promote the secondary to become the new primary. Here is how:

### Step 1: Unlink the Caches

Before promoting the secondary, you must break the replication link.

```bash
# Remove the geo-replication link
az redis server-link delete \
  --name redis-secondary-westeu \
  --resource-group rg-redis-geo \
  --linked-server-name redis-primary-eastus
```

### Step 2: Update Your Application

After unlinking, the secondary becomes a standalone read-write cache. Update your application's connection strings to point to this cache for both reads and writes.

### Step 3: Re-establish Replication (When Ready)

Once the original primary region recovers, you can either:
- Create a new replication link with the recovered cache as the secondary
- Or set up a fresh primary in a new region and link the current cache to it

The key point is that failover is a manual, multi-step process. If you need automatic failover, consider the Enterprise tier with active geo-replication.

## Monitoring Replication Health

Keep an eye on replication lag and link health with Azure Monitor.

```bash
# Check replication metrics
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-redis-geo/providers/Microsoft.Cache/redis/redis-secondary-westeu" \
  --metric "ReplicationLag" \
  --interval PT1M
```

Set up an alert if replication lag exceeds your tolerance threshold:

```bash
# Alert if replication lag exceeds 30 seconds
az monitor metrics alert create \
  --name redis-geo-lag-alert \
  --resource-group rg-redis-geo \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-redis-geo/providers/Microsoft.Cache/redis/redis-secondary-westeu" \
  --condition "avg ReplicationLag > 30" \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-redis-geo/providers/Microsoft.Insights/actionGroups/ops-team"
```

## Limitations to Know About

Before committing to geo-replication, be aware of these constraints:

- **Premium tier only**: Standard and Basic tiers do not support geo-replication.
- **Same SKU size required**: Both caches must have the same VM size.
- **Manual failover**: Passive geo-replication requires manual intervention to fail over.
- **No cascading replication**: You cannot chain multiple secondaries. It is strictly one primary to one secondary.
- **Data persistence interactions**: If both caches have persistence enabled, they maintain independent persistence. The secondary's persistence is based on its replicated data.
- **Write latency**: Writes to the primary are not slowed by replication (it is async), but this means the secondary can be slightly behind.

## Cost Considerations

Geo-replication effectively doubles your cache cost because you are running two Premium tier instances. Make sure the benefits justify the expense:

- If you only need disaster recovery, consider whether periodic RDB backups to geo-redundant storage might be sufficient and cheaper.
- If you need low-latency reads in multiple regions, geo-replication is worth the cost.
- If you need active-active writes across regions, you will need the Enterprise tier, which is significantly more expensive.

## Wrapping Up

Geo-replication for Azure Cache for Redis gives you cross-region data redundancy and the ability to serve reads from a cache closer to your users. The setup is straightforward: create two Premium tier caches, link them, and route your application traffic accordingly. Just remember that failover is manual with passive geo-replication, so build your runbooks and test the failover process before you actually need it in production.
