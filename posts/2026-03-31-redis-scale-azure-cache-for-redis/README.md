# How to Scale Azure Cache for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Scaling, Azure Cache for Redis, Performance

Description: Learn how to scale Azure Cache for Redis vertically by changing cache size and tier, and plan for minimal downtime during scaling operations.

---

Azure Cache for Redis supports vertical scaling - you can change the cache size (C0-C6, P1-P5) and in some cases upgrade tiers. Understanding what is supported and the downtime implications is critical before scaling production caches.

## Supported Scaling Operations

| Operation | Downtime? |
|---|---|
| Scale up (e.g., C1 to C2) | Brief reconnect |
| Scale down (e.g., C2 to C1) | Brief reconnect |
| Basic to Standard | Yes - data may be lost |
| Standard to Premium | Brief reconnect |
| Premium to lower tier | Not supported |
| Change shard count (Premium) | Online |

## Scaling Cache Size via CLI

```bash
# Scale up from C1 to C2 (Standard tier)
az redis update \
  --name my-redis \
  --resource-group rg-prod \
  --vm-size c2

# Check scaling status
az redis show \
  --name my-redis \
  --resource-group rg-prod \
  --query "{Sku:sku.name,Family:sku.family,Capacity:sku.capacity,State:provisioningState}"
```

## Scaling via Terraform

```hcl
# Scale from capacity 1 (C1) to capacity 2 (C2)
resource "azurerm_redis_cache" "main" {
  name                = "my-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  capacity            = 2  # Changed from 1
  family              = "C"
  sku_name            = "Standard"
  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"
}
```

## Scaling Premium Shard Count

For Premium caches with cluster mode enabled, you can scale the shard count online:

```bash
az redis update \
  --name my-premium-redis \
  --resource-group rg-prod \
  --set shardCount=4
```

## Planning for Minimal Impact

Client-side preparation before scaling:

```python
import redis
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(10),
    wait=wait_exponential(min=1, max=15)
)
def redis_operation(client, key, value):
    client.set(key, value)

# With retry logic, brief reconnects during scaling are handled automatically
```

## Monitoring During Scale

```bash
# Watch provisioning state until complete
watch -n 10 "az redis show --name my-redis --resource-group rg-prod --query provisioningState -o tsv"
```

## Sizing Reference for Standard Tier

| Size | Memory | Price/hour (approx.) |
|---|---|---|
| C0 | 250 MB | $0.022 |
| C1 | 1 GB | $0.046 |
| C2 | 2.5 GB | $0.093 |
| C3 | 6 GB | $0.187 |
| C4 | 13 GB | $0.374 |
| C5 | 26 GB | $0.748 |
| C6 | 53 GB | $1.496 |

## Summary

Azure Cache for Redis vertical scaling involves changing the cache size or tier. Scale-up within the same tier (e.g., C1 to C2) causes only a brief client reconnect. Upgrading from Basic to Standard may involve data loss since Basic has no replication, so plan a maintenance window. Always add client-side retry logic to tolerate the brief disconnection that occurs during any scaling event.
