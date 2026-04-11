# How to Choose Azure Cache for Redis Tier

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure Cache for Redis, Azure, Cloud Database, Cache Tiers

Description: Compare Azure Cache for Redis Basic, Standard, Premium, and Enterprise tiers to choose the right tier for your performance, availability, and cost needs.

---

## Overview of Azure Cache for Redis Tiers

Azure Cache for Redis offers four tiers, each targeting different use cases:

- **Basic**: Single node, no SLA, development and testing only
- **Standard**: Two nodes with replication, 99.9% SLA, production caches
- **Premium**: Higher performance with clustering, persistence, VNet injection
- **Enterprise**: Full Redis Stack with modules (RediSearch, RedisJSON, etc.)
- **Enterprise Flash**: Enterprise features with NVMe-backed storage for cost-efficient large datasets

## Tier Comparison

| Feature | Basic | Standard | Premium | Enterprise |
|---|---|---|---|---|
| Replication | No | Yes (2 nodes) | Yes | Yes |
| SLA | None | 99.9% | 99.9% | 99.99% |
| Clustering | No | No | Yes (up to 10 shards) | Yes |
| Geo-replication | No | No | Passive | Active |
| VNet injection | No | No | Yes | No (Private Link) |
| Redis modules | No | No | No | Yes (full stack) |
| Persistence (RDB/AOF) | No | No | Yes | Yes |
| Max memory | 120 GB | 120 GB | 1.2 TB (cluster) | 14 TB (cluster) |
| Cost (1 GB) | ~$17/mo | ~$52/mo | ~$140/mo | Higher |

## When to Use Each Tier

### Basic

For development environments and proof-of-concept only:

```bash
# Create Basic tier cache via Azure CLI
az redis create \
  --name my-dev-cache \
  --resource-group myRG \
  --location eastus \
  --sku Basic \
  --vm-size C0  # 250MB cache
```

Never use Basic in production - there's no SLA and no replica. A node restart means your cache is cold.

### Standard

For production applications that need caching with availability:

```bash
# Create Standard tier cache
az redis create \
  --name my-prod-cache \
  --resource-group myRG \
  --location eastus \
  --sku Standard \
  --vm-size C2  # 6 GB cache

# Enable zone redundancy for Standard tier
az redis create \
  --name my-zone-redundant-cache \
  --resource-group myRG \
  --location eastus \
  --sku Standard \
  --vm-size C2 \
  --zones 1 2 3
```

### Premium

For production applications needing clustering, persistence, or VNet injection:

```bash
# Create Premium tier with clustering
az redis create \
  --name my-premium-cache \
  --resource-group myRG \
  --location eastus \
  --sku Premium \
  --vm-size P3  # 26 GB per shard

# Enable Redis clustering (Premium only)
az redis update \
  --name my-premium-cache \
  --resource-group myRG \
  --shard-count 3  # 3 shards x 26 GB = 78 GB total
```

### Enterprise

For applications needing Redis modules like RediSearch or RedisJSON:

```bash
# Create Enterprise tier cluster
az redisenterprise create \
  --name my-enterprise-cache \
  --resource-group myRG \
  --location eastus \
  --sku Enterprise_E10

# Create a database within the Enterprise cluster
az redisenterprise database create \
  --cluster-name my-enterprise-cache \
  --resource-group myRG \
  --modules name=RediSearch name=RedisJSON
```

## Terraform Configuration by Tier

```hcl
# Standard tier for production caching
resource "azurerm_redis_cache" "standard" {
  name                = "my-standard-cache"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 2      # C2 = 6 GB
  family              = "C"
  sku_name            = "Standard"

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  zones = ["1", "2"]  # Zone redundancy
}

# Premium tier with clustering
resource "azurerm_redis_cache" "premium" {
  name                = "my-premium-cache"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 3      # P3 = 26 GB per shard
  family              = "P"
  sku_name            = "Premium"
  shard_count         = 3      # Premium only

  redis_configuration {
    rdb_backup_enabled            = true
    rdb_backup_frequency          = 60
    rdb_backup_max_snapshot_count = 1
    rdb_storage_connection_string = var.storage_connection_string
    maxmemory_policy              = "allkeys-lru"
  }
}
```

## VM Size Reference

### C-series (Basic and Standard)

```text
C0  - 250 MB cache
C1  - 1 GB cache
C2  - 6 GB cache
C3  - 13 GB cache
C4  - 26 GB cache
C5  - 53 GB cache
C6  - 120 GB cache
```

### P-series (Premium)

```text
P1  - 6 GB per shard
P2  - 13 GB per shard
P3  - 26 GB per shard
P4  - 53 GB per shard
P5  - 120 GB per shard
```

## Geo-Replication: Premium vs Enterprise

Premium supports passive geo-replication (data flows one direction, manual failover). Enterprise supports active geo-replication (write to either region, automatic conflict resolution).

```bash
# Premium: Create passive geo-replication link
az redis create \
  --name primary-cache \
  --resource-group myRG-East \
  --location eastus \
  --sku Premium \
  --vm-size P3

az redis create \
  --name secondary-cache \
  --resource-group myRG-West \
  --location westus \
  --sku Premium \
  --vm-size P3

# Link them for passive geo-replication
az redis server-link create \
  --name primary-cache \
  --resource-group myRG-East \
  --replication-role Secondary \
  --server-to-link /subscriptions/.../resourceGroups/myRG-West/providers/Microsoft.Cache/Redis/secondary-cache
```

## Cost Optimization Tips

```text
Right-sizing strategy:
1. Start with Standard C2 (6 GB) for most applications
2. Monitor "Used Memory" metric in Azure Monitor
3. Upgrade to C3 if consistently above 70% utilization
4. Move to Premium only if you need clustering or persistence

Cost example (East US, 2024):
- C1 Standard: ~$52/month (1 GB, 2 nodes)
- C2 Standard: ~$114/month (6 GB, 2 nodes)
- P1 Premium: ~$141/month (6 GB, 2 nodes, all Premium features)

If you need > 120 GB of cache, Premium with clustering is the only option below Enterprise tier.
```

## Selecting the Right Tier: Decision Guide

```text
Need Redis modules (RediSearch, RedisJSON)?
  YES -> Enterprise

Need > 120 GB cache or horizontal write scaling?
  YES -> Premium with clustering

Need VNet injection for compliance/security?
  YES -> Premium (or Enterprise)

Need persistence (RDB/AOF)?
  YES -> Premium

Production application needing availability SLA?
  YES -> Standard (minimum)

Development/testing only?
  YES -> Basic (never Basic in production)
```

## Summary

Azure Cache for Redis tiers range from Basic (development only, no SLA) through Standard (production caching with 99.9% SLA) to Premium (clustering, persistence, VNet) and Enterprise (full Redis Stack modules). For most production applications, Standard is the starting point, with Premium required when you need clustering beyond 120 GB, data persistence, or private network injection. Enterprise is only needed for Redis module support like RediSearch or RedisJSON.
