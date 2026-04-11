# How to Configure Azure Cache for Redis Clustering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure Cache for Redis, Redis Cluster, Azure, Sharding

Description: Learn how to enable and configure Redis clustering on Azure Cache for Redis Premium tier to scale horizontally across multiple shards.

---

## What Redis Clustering Provides

Redis clustering on Azure Cache for Redis distributes data across multiple shards using CRC16 hashing over 16,384 hash slots. Each shard handles a subset of these slots, enabling:

- Horizontal scaling beyond the single-node memory limit (up to 120 GB per shard on P5)
- Write scaling across shards
- Higher aggregate throughput

Azure Cache for Redis supports up to 10 shards (GA) in cluster mode on the Premium tier, with up to 30 shards available in preview. Clustering is also available on the Enterprise and Enterprise Flash tiers. Optional zone redundancy is supported per shard.

## Prerequisites

Clustering is available on the Premium, Enterprise, and Enterprise Flash tiers. This post focuses on the Premium tier. You need:

- Premium tier cache (P1 or higher)
- Client libraries that support Redis Cluster protocol
- Application code aware of key hash tags if you use multi-key operations

## Enabling Clustering via Azure CLI

```bash
# Create a new Premium cache with clustering (3 shards)
az redis create \
  --name my-clustered-cache \
  --resource-group myRG \
  --location eastus \
  --sku Premium \
  --vm-size P3 \
  --shard-count 3

# Enable clustering on an existing Premium cache
az redis update \
  --name my-existing-premium-cache \
  --resource-group myRG \
  --set shardCount=3
```

Enabling clustering on an existing cache may cause brief connection blips, but the cache remains available during the operation.

## Terraform Configuration

```hcl
resource "azurerm_redis_cache" "clustered" {
  name                = "my-clustered-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 3      # P3 = 26 GB per shard
  family              = "P"
  sku_name            = "Premium"
  shard_count         = 3      # 3 shards = 78 GB total capacity

  # Zone redundancy for each shard
  zones = ["1", "2", "3"]

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
}

output "redis_hostname" {
  value = azurerm_redis_cache.clustered.hostname
}

output "redis_port" {
  value = azurerm_redis_cache.clustered.ssl_port
}
```

## Connecting to a Clustered Azure Cache

Azure Cache for Redis uses the cluster configuration endpoint. Clients must use cluster-aware connection mode.

### StackExchange.Redis (.NET)

```csharp
using StackExchange.Redis;

var config = new ConfigurationOptions
{
    EndPoints = { { "my-clustered-cache.redis.cache.windows.net", 6380 } },
    Password = "your-access-key",
    Ssl = true,
    SslProtocols = System.Security.Authentication.SslProtocols.Tls12,
    ConnectTimeout = 5000,
    SyncTimeout = 5000,
    // Cluster mode is auto-detected
};

var connection = await ConnectionMultiplexer.ConnectAsync(config);
var db = connection.GetDatabase();

// Basic operations work seamlessly
await db.StringSetAsync("user:1001", "Alice", TimeSpan.FromHours(1));
var value = await db.StringGetAsync("user:1001");
```

### Python (redis-py with cluster support)

```python
from redis.cluster import RedisCluster

client = RedisCluster(
    host='my-clustered-cache.redis.cache.windows.net',
    port=6380,
    password='your-access-key',
    ssl=True,
    ssl_cert_reqs=None,
    decode_responses=True
)

# Works like regular Redis
client.set('product:123', 'Widget', ex=3600)
value = client.get('product:123')
print(value)
```

### Node.js (ioredis)

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster(
  [
    {
      host: 'my-clustered-cache.redis.cache.windows.net',
      port: 6380
    }
  ],
  {
    redisOptions: {
      password: 'your-access-key',
      tls: {},
    },
    dnsLookup: (address, callback) => callback(null, address),
    slotsRefreshTimeout: 2000,
  }
);

await cluster.set('key', 'value', 'EX', 3600);
const val = await cluster.get('key');
```

## Understanding Hash Slots and Key Distribution

Redis Cluster uses 16,384 hash slots distributed across shards. You can control which shard a key maps to using hash tags.

```bash
# Key distribution - these go to potentially different shards
SET user:1001 "Alice"
SET product:999 "Widget"
SET order:5555 "Pending"

# Hash tags - keys in {} use that portion for slot calculation
# All these keys map to the same slot (same {}contents)
SET {user:1001}:profile "..."
SET {user:1001}:orders "..."
SET {user:1001}:preferences "..."

# This allows multi-key operations on these keys
MGET {user:1001}:profile {user:1001}:orders
```

```python
# Safe multi-key operations using hash tags
def get_user_data(client, user_id):
    # Use hash tag to ensure all user keys are on same shard
    keys = [
        f"{{{user_id}}}:profile",
        f"{{{user_id}}}:orders",
        f"{{{user_id}}}:preferences"
    ]
    return client.mget(keys)

# Pipelines work across shards - commands are automatically routed to the correct shard
# Multi-key commands within a pipeline still require all keys on the same shard
pipeline = client.pipeline()
pipeline.set(f"{{user:1001}}:profile", "Alice")
pipeline.set(f"{{user:1001}}:orders", "[]")
pipeline.execute()
```

## Multi-Key Commands in Cluster Mode

Some Redis commands operating on multiple keys fail in cluster mode if keys are on different shards.

```python
# This FAILS in cluster mode if keys are on different shards
# client.mset({'key1': 'val1', 'key2': 'val2'})  # Error!

# Option 1: Use hash tags to co-locate keys
client.mset({'{tag}:key1': 'val1', '{tag}:key2': 'val2'})  # Works

# Option 2: Use individual commands
pipeline = client.pipeline()
pipeline.set('key1', 'val1')
pipeline.set('key2', 'val2')
pipeline.execute()  # Works - each command goes to its own shard

# SUNIONSTORE, SDIFFSTORE, ZUNIONSTORE - require keys on same shard
# Use hash tags to ensure co-location
```

## Monitoring Cluster Health

```bash
# View cache metrics per shard via Azure Monitor
az monitor metrics list \
  --resource /subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Cache/redis/my-clustered-cache \
  --metric UsedMemoryPercentage \
  --dimension ShardId

# Check cluster info via redis-cli
redis-cli \
  -h my-clustered-cache.redis.cache.windows.net \
  -p 6380 \
  --tls \
  -a "your-access-key" \
  CLUSTER INFO

# Check slot distribution
redis-cli \
  -h my-clustered-cache.redis.cache.windows.net \
  -p 6380 \
  --tls \
  -a "your-access-key" \
  CLUSTER NODES
```

Key Azure Monitor metrics for clustered cache:

- `UsedMemoryPercentage` per shard - detect imbalanced key distribution
- `CacheHits` / `CacheMisses` per shard
- `ConnectedClients` - total connections

## Scaling Shards

You can add or remove shards while the cache is online (though brief disruption may occur).

```bash
# Scale from 3 to 5 shards
az redis update \
  --name my-clustered-cache \
  --resource-group myRG \
  --set shardCount=5
```

Azure rebalances slot assignments automatically when you change shard count.

## Summary

Azure Cache for Redis clustering (Premium, Enterprise, and Enterprise Flash tiers) enables horizontal scaling across up to 10 shards (GA) using Redis Cluster protocol, with up to 30 shards available in preview. Use hash tags (`{tag}:key`) to co-locate related keys on the same shard when you need multi-key operations or pipelines. Connect using cluster-aware clients like StackExchange.Redis for .NET, redis-py with cluster support for Python, or ioredis for Node.js. Monitor per-shard memory usage to detect key distribution imbalances.
