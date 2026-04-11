# How to Configure Azure Cache for Redis Data Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure Cache for Redis, Persistence, RDB, AOF, Azure

Description: Learn how to configure RDB and AOF data persistence for Azure Cache for Redis Premium tier to protect against data loss on node restarts.

---

## Why Configure Persistence on Azure Cache for Redis

By default, Azure Cache for Redis stores all data in memory. When a node restarts due to maintenance, update, or failure, the cache is empty. For many caching use cases, this is acceptable - you just re-warm the cache. However, for use cases like:

- Session stores where re-authentication is disruptive
- Rate limiting counters
- Leaderboards that take time to rebuild
- Feature flag stores

Data persistence lets the cache reload data from disk after restart, reducing cold-start impact.

**Note**: Persistence is available on the Premium tier (covered in this guide) and on Enterprise/Enterprise Flash tiers.

## Persistence Options

### RDB (Redis Database)

Point-in-time snapshots saved to Azure Blob Storage at configurable intervals. The cache can restart and reload from the most recent snapshot.

- Faster restarts (loads snapshot directly)
- Some data loss between last snapshot and restart
- Lower storage cost (single compressed file)

### AOF (Append Only File)

Logs every write operation. On restart, replays all operations to reconstruct state.

- Minimal data loss (at most 1 second of writes)
- Slower restart for large datasets
- Higher storage cost (growing log file)

## Configuring RDB Persistence via Azure CLI

```bash
# First, get the storage account connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name myredisstorage \
  --resource-group myRG \
  --query connectionString \
  --output tsv)

# Create Premium cache with RDB persistence
az redis create \
  --name my-persistent-cache \
  --resource-group myRG \
  --location eastus \
  --sku Premium \
  --vm-size P2 \
  --redis-configuration '{
    "rdb-backup-enabled": "true",
    "rdb-backup-frequency": "60",
    "rdb-backup-max-snapshot-count": "1",
    "rdb-storage-connection-string": "'"$STORAGE_CONNECTION_STRING"'"
  }'
```

RDB backup frequency options: 15, 30, 60, 360, 720, or 1440 minutes.

## Configuring AOF Persistence via Azure CLI

```bash
# Enable AOF with second-write persistence
az redis create \
  --name my-aof-cache \
  --resource-group myRG \
  --location eastus \
  --sku Premium \
  --vm-size P2 \
  --redis-configuration '{
    "aof-backup-enabled": "true",
    "aof-storage-connection-string-0": "'"$STORAGE_CONNECTION_STRING_PRIMARY"'",
    "aof-storage-connection-string-1": "'"$STORAGE_CONNECTION_STRING_SECONDARY"'"
  }'
```

Two storage connection strings provide redundancy for the AOF file.

## Terraform Configuration

```hcl
# Storage account for Redis persistence data
resource "azurerm_storage_account" "redis_persistence" {
  name                     = "myredispersistence"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant for persistence data

  blob_properties {
    versioning_enabled = true
  }
}

# Premium cache with RDB persistence
resource "azurerm_redis_cache" "persistent" {
  name                = "my-persistent-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 2
  family              = "P"
  sku_name            = "Premium"

  redis_configuration {
    # RDB persistence
    rdb_backup_enabled            = true
    rdb_backup_frequency          = 60      # Every 60 minutes
    rdb_backup_max_snapshot_count = 1
    rdb_storage_connection_string = azurerm_storage_account.redis_persistence.primary_connection_string

    maxmemory_policy = "noeviction"  # Important: don't evict data if using as primary store
  }
}

# Premium cache with AOF persistence
resource "azurerm_redis_cache" "aof_persistent" {
  name                = "my-aof-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 2
  family              = "P"
  sku_name            = "Premium"

  redis_configuration {
    # AOF persistence
    aof_backup_enabled              = true
    aof_storage_connection_string_0 = azurerm_storage_account.redis_persistence.primary_connection_string
    aof_storage_connection_string_1 = azurerm_storage_account.redis_persistence.secondary_connection_string

    maxmemory_policy = "noeviction"
  }
}
```

## Updating Persistence Settings on Existing Cache

```bash
# Update an existing Premium cache to enable RDB persistence
az redis update \
  --name my-existing-cache \
  --resource-group myRG \
  --set redisConfiguration.rdb-backup-enabled=true \
  --set redisConfiguration.rdb-backup-frequency=60 \
  --set redisConfiguration.rdb-backup-max-snapshot-count=1 \
  --set redisConfiguration.rdb-storage-connection-string="$STORAGE_CONNECTION_STRING"
```

## Verifying Persistence Status

```bash
# Check current persistence configuration
az redis show \
  --name my-persistent-cache \
  --resource-group myRG \
  --query "redisConfiguration" \
  --output table
```

```python
# Check persistence via Python Azure SDK
from azure.mgmt.redis import RedisManagementClient
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = RedisManagementClient(credential, subscription_id)

cache = client.redis.get('myRG', 'my-persistent-cache')
config = cache.redis_configuration

print(f"RDB enabled: {config.rdb_backup_enabled}")
print(f"RDB frequency: {config.rdb_backup_frequency} minutes")
print(f"AOF enabled: {config.aof_backup_enabled}")
```

## Choosing Between RDB and AOF

```text
Use RDB when:
  - Cache warm-up is acceptable (latency during cold start is okay)
  - You want minimal performance impact during operation
  - Storage cost is a concern
  - Hourly snapshots give sufficient recovery point

Use AOF when:
  - Near-zero data loss is required (max 1 second)
  - Redis stores session data that's expensive to recreate
  - Rate limiting or counter data must survive restarts
  - Compliance requires minimal data loss

Avoid persistence when:
  - Pure cache with reconstructable data (just re-query the source DB)
  - Cost sensitivity is high (persistence adds storage cost)
  - Fastest restart time is critical
```

## Storage Cost Estimation

```text
Example: 10 GB dataset

RDB persistence (60-minute snapshots):
- ~10 GB compressed RDB file (often 40-60% of dataset)
- ~5 GB in storage = ~$0.10/month per snapshot
- With 1 snapshot retained: minimal cost

AOF persistence:
- AOF file size depends on write rate
- Heavy write workload: AOF could be multiple times dataset size
- Azure Blob Storage: ~$0.018/GB-month
- For 50 GB AOF file: ~$0.90/month
```

## Replication and Persistence

```bash
# For clustered Premium caches, verify persistence per shard
# Persistence applies to all shards automatically

# Monitor backup status in Azure Monitor
# Look for: RDBackupStatus, AOFStorageUsedBytes metrics
```

## Summary

Azure Cache for Redis Premium tier supports both RDB (periodic snapshots) and AOF (append-only log) persistence stored in Azure Blob Storage. Use RDB for most caching scenarios where hourly snapshot recovery is sufficient, and AOF when you need near-zero data loss for session stores or critical counters. Configure persistence via Terraform or CLI using an Azure Storage account connection string, and set `maxmemory-policy` to `noeviction` when Redis serves as a primary data store rather than a pure cache.
