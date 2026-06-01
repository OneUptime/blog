# How to Configure AOF Persistence in Azure Cache for Redis Premium Tier

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Redis, AOF Persistence, Caching, Azure Cache for Redis, Data Persistence, Premium Tier

Description: Learn how to configure Append Only File (AOF) persistence in Azure Cache for Redis Premium tier for durable data storage and recovery.

---

If you have ever lost cached data after a Redis restart and spent the next hour rebuilding warm caches, you know why persistence matters. Azure Cache for Redis Premium tier supports Append Only File (AOF) persistence, which logs every write operation so your data survives restarts, crashes, and maintenance windows. This guide walks you through setting it up, tuning it, and understanding what to expect in production.

One important planning note: Microsoft has announced that Azure Cache for Redis Basic, Standard, and Premium tiers retire on September 30, 2028. If you are building a new workload, evaluate Azure Managed Redis as part of your design.

## What Is AOF Persistence?

Redis offers two persistence models: RDB snapshots and AOF logs. RDB takes point-in-time snapshots at intervals you define. AOF, on the other hand, records every write command as it happens, appending each operation to a log file. When Redis restarts, it replays the AOF log to rebuild the dataset.

The tradeoff is straightforward. RDB gives you smaller files and faster restarts, but you can lose data between snapshots. AOF gives you much better durability because writes are saved to the log once per second in Azure Cache for Redis Premium, but the log files are larger and replay takes longer.

In Azure Cache for Redis, AOF persistence is available on the Premium tier. The Standard and Basic tiers do not support persistence. Enterprise and Enterprise Flash tiers also support persistence in preview, but this guide focuses on Premium.

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
- An Azure Storage account in the same region as your Redis cache (required for storing AOF files on Premium)
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
  --vm-size p1
```

Omitting `--shard-count` creates a non-clustered cache. You can add shards later if you need horizontal scaling.

## Step 2: Create a Storage Account for AOF Files

AOF files are persisted to an Azure Storage account. This storage account must be in the same region as your Redis cache, and it should be a General Purpose v2 account.

```bash
# Create a storage account in the same region as Redis
az storage account create \
  --name redisaofstorage2026 \
  --resource-group rg-redis-prod \
  --location eastus \
  --sku Premium_LRS \
  --kind StorageV2
```

A few things to keep in mind about the storage account:

- A Premium storage account is recommended because it has higher throughput for persistence writes. If you choose Standard storage, validate that its throughput limits can handle your write volume.
- Firewall rules on the storage account can prevent persistence from working. If you need firewall restrictions, use managed identity based authentication and configure the storage account firewall exceptions carefully.
- Do not use a storage account that has a hierarchical namespace enabled (Azure Data Lake Storage Gen2). It is not supported.

## Step 3: Enable AOF Persistence

Now configure the cache to use AOF persistence. You can do this through the Azure Portal or the CLI.

**Using Azure Portal:**

1. Navigate to your Azure Cache for Redis instance in the portal.
2. Under Settings, click "Data persistence".
3. Select "AOF" as the persistence type.
4. Select the storage account you created.
5. Choose the storage account authentication method, such as Storage Key or Managed Identity.
6. Click Save.

**Using Azure CLI:**

```bash
# Get the storage account connection string
STORAGE_CONN=$(az storage account show-connection-string \
  --name redisaofstorage2026 \
  --resource-group rg-redis-prod \
  --query connectionString -o tsv)

# Enable AOF persistence
az redis update \
  --name my-redis-aof-cache \
  --resource-group rg-redis-prod \
  --set "redisConfiguration.aof-backup-enabled"="true" \
        "redisConfiguration.aof-storage-connection-string-0"="$STORAGE_CONN"
```

After enabling persistence, the cache performs a configuration update. Plan for a brief period of reduced availability or disruption while the update is applied.

## Step 4: Understand the AOF Write Frequency

In Redis itself, the AOF fsync policy determines how often data is flushed from the OS buffer to disk. Redis supports policies such as `appendfsync everysec` and `appendfsync always`.

Azure Cache for Redis Premium AOF persistence saves write operations to the Azure Storage account once per second. The "Always write" option is not a setting to use for Premium AOF persistence in the current Azure documentation, and Microsoft has retired the always-write option for Enterprise and Enterprise Flash tiers because of performance limitations.

For most production workloads, the once-per-second behavior is the balance Azure provides between durability and performance. If you truly cannot lose a single operation, Redis should not be the only system of record.

## Step 5: Verify Persistence Is Active

After the configuration update completes, verify that AOF persistence is running.

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

**Throughput and Latency**: AOF persistence affects throughput and can increase latency because persistence runs on the primary and replica processes. Watch CPU and Server Load closely after enabling it.

**Memory and Rewrite Overhead**: The AOF rewrite process compacts the log and can make the cache reach performance limits sooner, especially with large datasets. Leave memory and CPU headroom.

**Storage Costs**: AOF files can grow large, especially under heavy write loads. The rewrite process compacts them, but persistence can still write frequently enough that storage costs matter, especially if blob soft delete is enabled.

**Network**: AOF files are written to Azure Storage, which means there is network I/O involved. In the Premium tier, this happens over Azure backbone networks, so latency is low, but it is still something to be aware of.

## Monitoring AOF Health

Set up alerts to catch AOF issues before they become problems:

- **Monitor `usedmemorypercentage` and `usedmemoryRss`**: High memory usage or fragmentation can create memory pressure during persistence and normal cache operations.
- **Monitor `allcacheWrite`, `serverLoad`, and `Errors`**: A spike in server load during AOF rewrites can happen, but sustained high load might indicate the cache is undersized. The `Errors` metric includes AOF-related persistence errors.
- **Check the storage account**: Verify that AOF files are being written and that firewall, throughput, and soft delete settings are not interfering with persistence.

You can set up these alerts in Azure Monitor:

```bash
# Create an alert rule for high memory usage
az monitor metrics alert create \
  --name redis-high-memory \
  --resource-group rg-redis-prod \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-redis-prod/providers/Microsoft.Cache/redis/my-redis-aof-cache" \
  --condition "avg usedmemorypercentage > 80" \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-redis-prod/providers/Microsoft.Insights/actionGroups/ops-team" \
  --description "Redis memory usage exceeds 80%; investigate memory pressure"
```

## Handling Failover and Recovery

When a Premium tier cache with AOF persistence recovers after a failure that takes down both the primary and replica, Redis replays the AOF log to restore data. The time this takes depends on the size of the log file and the amount of write activity it contains.

During recovery, the cache is unavailable. Your application should handle this gracefully with retry logic and circuit breakers. Do not assume Redis is always there.

Persistence is not a backup or point-in-time recovery feature. If corrupted data is written to Redis, the corrupted data is persisted too. Use the Export feature or another backup strategy when you need recoverable backups outside the cache.

## Common Mistakes

1. **Using a storage account in a different region**: This causes high latency and can lead to persistence failures. Always co-locate.
2. **Forgetting to monitor storage errors and costs**: AOF files grow and are written frequently. Soft delete and persistence writes can create unexpected storage costs.
3. **Running memory and server load too high**: The AOF rewrite process needs headroom. Without it, rewrites take longer and latency can increase.
4. **Enabling AOF on Basic or Standard tiers**: It simply does not work. You need Premium.

## Wrapping Up

AOF persistence in Azure Cache for Redis Premium tier is a solid option when you need your cached data to survive restarts and failures. The setup is straightforward: create a storage account, flip the persistence setting to AOF, and monitor the health metrics. For most workloads, Azure's once-per-second AOF persistence gives a practical balance of durability and performance. Just keep an eye on memory usage, server load, persistence errors, and storage costs, and your persistent cache will serve you well.
