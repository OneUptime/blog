# How to Set Up Azure Managed Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Azure Managed Redis, Cache, Setup

Description: Learn how to create and configure Azure Managed Redis - Microsoft's newest Redis offering built on Redis 7.4 with enterprise-grade features and simplified management.

---

Azure Managed Redis (AMR) is Microsoft's latest Redis service, launched in 2024. It is built on Redis 7.4+ and offers simplified SKUs, improved performance with flash memory options, and a streamlined experience compared to the older Azure Cache for Redis tiers.

## Azure Managed Redis SKUs

| SKU | Use Case | Max Memory |
|---|---|---|
| Memory Optimized | General caching | 2 TB |
| Balanced | Mixed read/write | 960 GB |
| Compute Optimized | High throughput | 720 GB |
| Flash Optimized | Large datasets | 4.5 TB (NVMe) |

## Creating via Azure CLI

```bash
# Register the resource provider if needed
az provider register --namespace Microsoft.Cache

# Create a Managed Redis instance
az redisenterprise create \
  --name my-managed-redis \
  --resource-group rg-prod \
  --location eastus \
  --sku Balanced_B5 \
  --no-wait
```

## Creating via Azure Portal ARM Template

```json
{
  "type": "Microsoft.Cache/redisEnterprise",
  "apiVersion": "2025-04-01",
  "name": "my-managed-redis",
  "location": "eastus",
  "sku": {
    "name": "Balanced_B5",
    "capacity": 1
  },
  "properties": {
    "minimumTlsVersion": "1.2"
  }
}
```

## Terraform

```hcl
resource "azurerm_redis_enterprise_cluster" "main" {
  name                = "my-managed-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_name            = "Balanced_B5"
  minimum_tls_version = "1.2"
  zones               = ["1", "2", "3"]
}

resource "azurerm_redis_enterprise_database" "default" {
  cluster_id        = azurerm_redis_enterprise_cluster.main.id
  client_protocol   = "Encrypted"
  clustering_policy = "EnterpriseCluster"
  eviction_policy   = "AllKeysLRU"
}
```

## Connecting to Azure Managed Redis

```python
import redis
import ssl

client = redis.Redis(
    host="my-managed-redis.eastus.redis.azure.net",
    port=10000,
    password="<access-key>",
    ssl=True,
    ssl_cert_reqs=ssl.CERT_REQUIRED,
    decode_responses=True,
)

client.set("hello", "world", ex=60)
print(client.get("hello"))  # world
```

## Key Differences from Azure Cache for Redis

- Uses port 10000 instead of 6380
- Active geo-replication available on most SKUs (except Balanced B0, B1, and Flash Optimized)
- Supports Redis modules (Search, Bloom, JSON) natively
- Simplified capacity units (B1, B5, B10, etc.)
- Redis OSS Cluster API available without Premium tier

## Enabling Zone Redundancy

```bash
az redisenterprise create \
  --name my-managed-redis \
  --resource-group rg-prod \
  --location eastus \
  --sku Balanced_B5 \
  --zones "1" "2" "3"
```

## Summary

Azure Managed Redis is the modern replacement for Azure Cache for Redis, offering Redis 7.4+, simplified SKUs, flash storage options, and native module support. Use `BalancedB5` or higher for production, enable zone redundancy for availability, and connect on port 10000 with TLS. It provides superior performance and features compared to older Azure Cache tiers.
