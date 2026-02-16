# How to Configure AOF Persistence in Azure Cache for Redis Premium Tier

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Redis, AOF Persistence, Caching, Azure Cache for Redis, Data Persistence, Premium Tier

Description: Learn how to configure Append Only File (AOF) persistence in Azure Cache for Redis Premium tier for durable data storage and recovery.

---

If you have ever lost cached data after a Redis restart and spent the next hour rebuilding warm caches, you know why persistence matters. Azure Cache for Redis Premium tier supports Append Only File (AOF) persistence, which logs every write operation so your data survives restarts, crashes, and maintenance windows. This guide walks you through setting it up, tuning it, and understanding what to expect in production.

## What Is AOF Persistence?

Redis offers two persistence models: RDB snapshots and AOF logs. RDB takes point-in-time snapshots at intervals you define. AOF, on the other hand, records every write command as it happens, appending each operation to a log file. When Redis restarts, it replays the AOF log to rebuild the dataset.

The tradeoff is straightforward. RDB gives you smaller files and faster restarts, but you can lose data between snapshots. AOF gives you much better durability - you lose at most one second of writes in the worst case - but the log files are larger and replay takes longer.

In Azure Cache for Redis, AOF persistence is only available on the Premium tier. The Standard and Basic tiers do not support any form of persistence.

## Why Use AOF Over RDB?

There are specific scenarios where AOF makes more sense than RDB:

- **Near-zero data loss tolerance**: If your application treats Redis as a primary data store rather than a disposable cache, AOF minimizes the window of potential data loss.
- **Financial or transactional workloads**: When every write matters and you cannot afford to lose even a few minutes of data.
- **Session stores with critical state**: If user sessions contain cart data, authentication tokens, or workflow state that would be expensive to rebuild.
- **Compliance requirements**: Some regulatory environments require that all data mutations are logged.

RDB is fine when your cache is truly ephemeral and your application can gracefully handle a cold cache. But when that is not the case, AOF is the safer choice.

## Prerequisites

Before you configure AOF persistence, make sure you have the following:

- An Azure subscription with permissions to create or modify Redis resources
- Azure Cache for Redis Premium tier (P1 or higher) - persistence is not available on lower tiers
- An Azure Storage account in the same region as your Redis cache (required for storing AOF files)
- Azure CLI or access to the Azure Portal

## Step 1: Create a Premium Tier Cache (If You Do Not Have One)

If you already have a Premium tier cache, skip to Step 2. Otherwise, you can create one using the Azure CLI.

The following command creates a Premium P1 cache in East US with AOF persistence in mind:

```bash
# Create a resource group for the Redis cache
az group create --name rg-redis-prod --location eastus

# Create a Premium tier Redis cache (P1 is the smallest Premium SKU)
az redis create \
  --name my-redis-aof-cache \
  --resource-group rg-redis-prod \
  --location eastus \
  --sku Premium \
  --vm-size P1 \
  --shard-count 0
```

The `--shard-count 0` means no clustering. You can add shards later if you need horizontal scaling.

## Step 2: Create a Storage Account for AOF Files

AOF files are persisted to an Azure Storage account. This storage account must be in the same region as your Redis cache, and it should be a General Purpose v2 account.

```bash
# Create a storage account in the same region as Redis
az storage account create \
  --name redisaofstorage2026 \
  --resource-group rg-redis-prod \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

A few things to keep in mind about the storage account:

- Use Standard_LRS (locally redundant) for most cases. If you want geo-redundancy for the AOF files themselves, use Standard_GRS, but this adds cost.
- Do not enable firewall rules on the storage account that would block the Redis service. Azure Cache for Redis needs direct access.
- Do not use a storage account that has a hierarchical namespace enabled (Azure Data Lake Storage Gen2). It is not supported.

## Step 3: Enable AOF Persistence

Now configure the cache to use AOF persistence. You can do this through the Azure Portal or the CLI.

**Using Azure Portal:**

1. Navigate to your Azure Cache for Redis instance in the portal.
2. Under Settings, click "Data persistence".
3. Select "AOF" as the persistence type.
4. Choose your AOF frequency: "Every second" (fsync every second) or "Every write" (fsync on every operation).
5. Select the storage account you created.
6. Click Save.

**Using Azure CLI:**

```bash
# Get the storage account connection string
STORAGE_CONN=$(az storage account show-connection-string \
  --name redisaofstorage2026 \
  --resource-group rg-redis-prod \
  --query connectionString -o tsv)

# Enable AOF persistence with fsync every second
az redis update \
  --name my-redis-aof-cache \
  --resource-group rg-redis-prod \
  --set "redisConfiguration.aof-backup-enabled=true" \
  --set "redisConfiguration.aof-storage-connection-string-0=$STORAGE_CONN"
```

After enabling persistence, Redis will restart. Plan for a brief period of unavailability - typically 30 to 90 seconds depending on the size of your dataset.

## Step 4: Choose Your Fsync Policy

The AOF fsync policy determines how often data is flushed from the OS buffer to disk. Azure Cache for Redis gives you two options:

- **Every second (everysec)**: Redis calls fsync once per second. This is the recommended default. You might lose up to one second of writes in a catastrophic failure, but performance impact is minimal.
- **Every write (always)**: Redis calls fsync after every write command. This gives maximum durability but significantly impacts throughput - expect 30-50% lower write performance.

For most production workloads, "every second" is the right choice. The "every write" option should only be used when you truly cannot lose a single operation.

## Step 5: Verify Persistence Is Active

After the cache restarts, verify that AOF persistence is running.

```bash
# Check the Redis configuration to confirm AOF is enabled
az redis show \
  --name my-redis-aof-cache \
  --resource-group rg-redis-prod \
  --query "redisConfiguration" -o json
```

You should see `aof-backup-enabled` set to `true` in the output. You can also connect to the Redis instance using `redis-cli` and run:

```bash
# Connect to the Redis cache and check persistence info
redis-cli -h my-redis-aof-cache.redis.cache.windows.net -p 6380 -a <your-access-key> --tls

# Inside the Redis CLI, check the server info for persistence
INFO persistence
```

Look for `aof_enabled:1` in the output. You should also see `aof_current_size` growing as writes come in.

## Performance Considerations

AOF persistence is not free from a performance perspective. Here is what to expect:

**Write Latency**: With the "everysec" policy, you will see a small increase in P99 latency - typically 1-3 milliseconds. With "always", the increase is more significant and variable.

**Memory Overhead**: The AOF rewrite process (which compacts the log) temporarily requires extra memory. Azure recommends keeping memory usage below 80% to leave room for the rewrite buffer.

**Storage Costs**: AOF files can grow large, especially under heavy write loads. The rewrite process compacts them, but between rewrites, the file can be 2-5x the size of your actual dataset.

**Network**: AOF files are written to Azure Storage, which means there is network I/O involved. In the Premium tier, this happens over Azure backbone networks, so latency is low, but it is still something to be aware of.

## Monitoring AOF Health

Set up alerts to catch AOF issues before they become problems:

- **Monitor `usedmemorypercentage`**: If this exceeds 80%, the AOF rewrite might fail due to insufficient memory.
- **Monitor `cacheWrite` and `serverLoad`**: A spike in server load during AOF rewrites is normal, but sustained high load might indicate the cache is undersized.
- **Check the storage account**: Verify that AOF files are being written. If the storage account runs out of space or becomes inaccessible, persistence silently stops.

You can set up these alerts in Azure Monitor:

```bash
# Create an alert rule for high memory usage
az monitor metrics alert create \
  --name redis-high-memory \
  --resource-group rg-redis-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-redis-prod/providers/Microsoft.Cache/redis/my-redis-aof-cache" \
  --condition "avg usedmemorypercentage > 80" \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-redis-prod/providers/Microsoft.Insights/actionGroups/ops-team" \
  --description "Redis memory usage exceeds 80%, AOF rewrite may fail"
```

## Handling Failover and Recovery

When a Premium tier cache with AOF persistence restarts or fails over, Redis replays the AOF log to restore data. The time this takes depends on the size of the log file. For a cache with 10 GB of data, expect recovery to take 3-8 minutes.

During recovery, the cache is unavailable. Your application should handle this gracefully with retry logic and circuit breakers. Do not assume Redis is always there.

If the AOF file becomes corrupted - which is rare but possible after a hard crash - Azure will attempt to use the last valid AOF checkpoint. In the worst case, you might fall back to the most recent RDB snapshot if one exists.

## Common Mistakes

1. **Using a storage account in a different region**: This causes high latency and can lead to persistence failures. Always co-locate.
2. **Forgetting to monitor storage capacity**: AOF files grow. If the storage account fills up, persistence stops without a loud alarm.
3. **Running memory at 95%+**: The AOF rewrite process needs memory headroom. Without it, the rewrite fails, the AOF file keeps growing, and eventually you hit problems.
4. **Enabling AOF on Basic or Standard tiers**: It simply does not work. You need Premium.

## Wrapping Up

AOF persistence in Azure Cache for Redis Premium tier is a solid option when you need your cached data to survive restarts and failures. The setup is straightforward: create a storage account, flip the persistence setting to AOF, choose your fsync policy, and monitor the health metrics. For most workloads, the "every second" fsync policy gives the best balance of durability and performance. Just keep an eye on memory usage and storage capacity, and your persistent cache will serve you well.
