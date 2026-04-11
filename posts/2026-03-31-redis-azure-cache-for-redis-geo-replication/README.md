# How to Set Up Azure Cache for Redis Geo-Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Geo-Replication, High Availability, Disaster Recovery

Description: Learn how to configure passive geo-replication for Azure Cache for Redis Premium to replicate data across regions and enable cross-region failover.

---

Azure Cache for Redis Premium supports passive geo-replication, linking a primary and secondary instance in different regions. The secondary is read-only and continuously synced. For active-active geo-replication, use Azure Managed Redis or the Enterprise tier.

## Requirements

- Premium tier on both instances
- Both instances must be the same cache size and SKU
- Both in the same Azure subscription

## Creating Two Premium Instances

```bash
# Primary in East US
az redis create \
  --name redis-primary \
  --resource-group rg-eastus \
  --location eastus \
  --sku Premium \
  --vm-size p2

# Secondary in West US
az redis create \
  --name redis-secondary \
  --resource-group rg-westus \
  --location westus \
  --sku Premium \
  --vm-size p2
```

## Linking for Geo-Replication

```bash
# Link secondary to primary (run against the primary cache)
az redis server-link create \
  --name redis-primary \
  --resource-group rg-eastus \
  --server-to-link /subscriptions/<sub-id>/resourceGroups/rg-westus/providers/Microsoft.Cache/Redis/redis-secondary \
  --replication-role Secondary

# Check link status
az redis server-link show \
  --name redis-primary \
  --resource-group rg-eastus \
  --linked-server-name redis-secondary
```

## Terraform Configuration

```hcl
resource "azurerm_redis_cache" "primary" {
  name                = "redis-primary"
  resource_group_name = azurerm_resource_group.eastus.name
  location            = "East US"
  capacity            = 2
  family              = "P"
  sku_name            = "Premium"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
}

resource "azurerm_redis_cache" "secondary" {
  name                = "redis-secondary"
  resource_group_name = azurerm_resource_group.westus.name
  location            = "West US"
  capacity            = 2
  family              = "P"
  sku_name            = "Premium"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
}

resource "azurerm_redis_linked_server" "geo" {
  target_redis_cache_name     = azurerm_redis_cache.primary.name
  resource_group_name         = azurerm_resource_group.eastus.name
  linked_redis_cache_id       = azurerm_redis_cache.secondary.id
  linked_redis_cache_location = azurerm_redis_cache.secondary.location
  server_role                 = "Secondary"
}
```

## Failover Process

Geo-replication does NOT have automatic failover. During a regional outage:

```bash
# 1. Unlink the secondary (makes it writable)
az redis server-link delete \
  --name redis-secondary \
  --resource-group rg-westus \
  --linked-server-name redis-primary

# 2. Update application connection strings to point to secondary
# 3. When primary recovers, re-link (data flows from new primary to old primary)
```

## Monitoring Replication Health

```bash
az monitor metrics list \
  --resource /subscriptions/<sub>/resourceGroups/rg-westus/providers/Microsoft.Cache/Redis/redis-secondary \
  --metric "connectedclients,usedmemory,cacheRead" \
  --interval PT1M
```

## Summary

Azure Cache for Redis Premium geo-replication links a primary and secondary instance across regions with continuous passive replication. The secondary is read-only and serves as a warm standby. Failover requires manual unlinking - automate this with Azure Functions or a runbook triggered by an Azure Monitor alert when the primary region becomes unhealthy.
