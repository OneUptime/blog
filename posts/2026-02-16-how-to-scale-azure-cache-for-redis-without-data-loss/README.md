# How to Scale Azure Cache for Redis Without Data Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Redis, Scaling, Data Migration, Azure Cache for Redis, High Availability, Performance

Description: Learn how to scale Azure Cache for Redis up, down, or out without losing cached data, including best practices and potential pitfalls.

---

Your Redis cache started as a Standard C1 and it was plenty. But traffic grew, memory usage crept up, and now you need more capacity. The question everyone asks at this point is: can I scale without losing all my cached data? The answer is yes, but it depends on how you scale and which direction you go. This guide covers every scaling scenario and what happens to your data in each one.

## Understanding the Scaling Options

Azure Cache for Redis gives you three ways to scale:

1. **Scale up (vertical)**: Move to a larger cache size within the same tier (e.g., C1 to C2, or P1 to P2).
2. **Scale out (horizontal)**: Add shards to a clustered cache (Premium tier only).
3. **Scale down**: Move to a smaller cache size (same tier only).
4. **Change tiers**: Move between Basic, Standard, and Premium tiers.

Each of these has different implications for data preservation.

## Scaling Up Within the Same Tier

This is the safest scaling operation. When you scale from C1 to C2 (or P1 to P3), Azure provisions a new, larger cache behind the scenes, migrates your data, and switches the DNS to point to the new instance. Your data is preserved.

```bash
# Scale up from Standard C1 to Standard C3
az redis update \
  --name my-redis-cache \
  --resource-group rg-redis \
  --sku Standard \
  --vm-size C3
```

What happens during the scale-up:

1. Azure creates a new cache node with the target size.
2. Data from the existing cache is replicated to the new node.
3. Once replication is complete, traffic is switched to the new node.
4. The old node is decommissioned.

**Downtime**: Expect a brief connectivity interruption (typically 5-30 seconds) during the DNS switchover. Your application should handle this with retry logic.

**Duration**: The entire process takes 20-60 minutes depending on the size of your dataset.

**Data loss risk**: Minimal. The replication step ensures data is copied before the switch. However, writes that occur during the final switchover moment might be lost if your application does not retry.

### Best Practices for Scaling Up

```csharp
// Make sure your Redis client has retry logic configured
var configOptions = new ConfigurationOptions
{
    EndPoints = { "my-redis-cache.redis.cache.windows.net:6380" },
    Password = "<access-key>",
    Ssl = true,
    AbortOnConnectFail = false, // Do not crash if connection fails during scaling
    ConnectRetry = 3,           // Retry connection attempts
    ReconnectRetryPolicy = new ExponentialRetry(5000), // Exponential backoff
    ConnectTimeout = 15000      // Increase timeout during scaling operations
};

var connection = ConnectionMultiplexer.Connect(configOptions);
```

## Scaling Out with Clustering (Premium Tier)

If you are on the Premium tier, you can enable clustering and add shards. Each shard is a primary/replica pair, and data is distributed across shards using hash slots. Adding shards increases both memory capacity and throughput.

```bash
# Enable clustering with 3 shards on a Premium cache
az redis update \
  --name my-premium-cache \
  --resource-group rg-redis \
  --shard-count 3
```

Increasing the shard count from 1 to 3 (or 3 to 6, etc.) triggers a rebalancing operation. Redis redistributes hash slots across the new set of shards, moving data as needed.

**Data preservation**: Yes, data is preserved during shard scaling. The rebalancing process moves data between shards without deleting it.

**Downtime**: There will be brief connectivity interruptions as the cluster reconfigures. Individual shard failovers happen sequentially.

**Duration**: 20-45 minutes per shard added. Adding 3 shards could take over an hour.

**Important caveat**: Multi-key operations that span different hash slots will fail during the rebalancing. If your application uses MGET, MSET, or Lua scripts that access keys across shards, those operations might throw CROSSSLOT errors during the migration.

## Scaling Down Within the Same Tier

Scaling down (e.g., C3 to C1, or P3 to P1) is supported and data is preserved, provided the target cache size can hold all your current data.

```bash
# Scale down from Standard C3 to Standard C2
az redis update \
  --name my-redis-cache \
  --resource-group rg-redis \
  --sku Standard \
  --vm-size C2
```

**The critical check**: Before scaling down, verify that your dataset fits in the smaller cache. If your C3 cache (13 GB) has 8 GB of data and you try to scale to C1 (1 GB), the operation will fail.

```bash
# Check current memory usage before scaling down
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Cache/redis/my-redis-cache" \
  --metric "usedmemory" \
  --aggregation Average \
  --interval PT5M \
  --output table
```

Rule of thumb: your dataset should use no more than 70% of the target cache size. The remaining 30% is needed for overhead, fragmentation, and the replication buffer during the scale operation.

## Changing Tiers

This is where it gets tricky. Tier changes have different data preservation behaviors:

### Basic to Standard: Data May Be Lost

Moving from Basic to Standard adds replication. The process involves provisioning new nodes, and data may not be preserved. Plan for a cold cache after this operation.

### Standard to Premium: Data Is Preserved

This is a supported scaling path and data is typically preserved. The process is similar to scaling up within a tier.

```bash
# Scale from Standard to Premium P1
az redis update \
  --name my-redis-cache \
  --resource-group rg-redis \
  --sku Premium \
  --vm-size P1
```

### Premium to Standard: Not Supported Directly

You cannot scale down from Premium to Standard. You would need to create a new Standard cache, export your data from the Premium cache, and import it into the Standard cache.

### Export/Import for Tier Migration

When direct scaling is not supported, use the export/import feature (Premium tier has this built in):

```bash
# Step 1: Export data from the Premium cache to a storage account
az redis export \
  --name my-premium-cache \
  --resource-group rg-redis \
  --prefix redis-export \
  --container "https://mystorageaccount.blob.core.windows.net/redis-exports" \
  --file-format rdb

# Step 2: Create the new Standard or Premium cache
az redis create \
  --name my-new-cache \
  --resource-group rg-redis \
  --location eastus \
  --sku Standard \
  --vm-size C3

# Step 3: Import data into the new cache (only available on Premium target)
az redis import \
  --name my-new-cache \
  --resource-group rg-redis \
  --files "https://mystorageaccount.blob.core.windows.net/redis-exports/redis-export.rdb"
```

Note that import is only available on Premium tier targets. If your target is Standard tier, you will need to warm the cache through your application.

## Reducing Shards Without Data Loss

If you added too many shards and want to reduce them, you can decrease the shard count on a Premium clustered cache.

```bash
# Reduce from 6 shards to 3
az redis update \
  --name my-premium-cache \
  --resource-group rg-redis \
  --shard-count 3
```

Data is redistributed to the remaining shards. However, if the remaining shards do not have enough memory to hold all the data, the operation will fail or trigger evictions.

## Preparing Your Application for Scaling

Regardless of the scaling direction, your application should be ready for brief connectivity disruptions. Here is a checklist:

**1. Retry Logic**: Ensure your Redis client retries failed commands with exponential backoff.

**2. Circuit Breaker**: If Redis is unavailable during scaling, fall back to the database instead of failing the entire request.

**3. Connection Pool Monitoring**: Watch for connection pool exhaustion during the scaling window.

**4. No Hardcoded IPs**: Always use the hostname, not the IP address. The IP will change during scaling.

**5. Schedule During Low Traffic**: While scaling is non-destructive, the brief interruption is best experienced during off-peak hours.

```python
# Python example with retry logic for Redis operations
import redis
from redis.retry import Retry
from redis.backoff import ExponentialBackoff

# Configure client with retry behavior suitable for scaling events
retry_policy = Retry(ExponentialBackoff(), retries=5)

client = redis.Redis(
    host='my-redis-cache.redis.cache.windows.net',
    port=6380,
    password='<access-key>',
    ssl=True,
    retry=retry_policy,
    retry_on_timeout=True,
    socket_connect_timeout=15,
    socket_timeout=15
)
```

## Monitoring During Scaling

Keep an eye on these metrics during and after a scaling operation:

- **Server Load**: Should stabilize after scaling completes.
- **Connected Clients**: Should return to normal after the DNS switch.
- **Used Memory Percentage**: Should drop after scaling up (more total memory available).
- **Operations Per Second**: Might temporarily dip during the switch, then recover.
- **Errors**: Watch for error spikes in Azure Monitor and your application logs.

## Wrapping Up

Scaling Azure Cache for Redis without data loss is straightforward if you stick to within-tier scaling (up or down) or Standard-to-Premium tier changes. Cluster shard changes also preserve data, though they take longer and can affect multi-key operations during the rebalance. The keys to a smooth scaling experience are retry logic in your client, scheduling during low-traffic periods, and verifying your data fits in the target size before scaling down. Plan ahead, and scaling becomes a routine operation rather than a risky one.
