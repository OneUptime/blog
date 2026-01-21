# How to Set Up Azure Cache for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Cloud, Caching, DevOps, Infrastructure, Microsoft Azure

Description: A comprehensive guide to deploying and configuring Azure Cache for Redis, covering tier selection, security configuration, clustering, and integration with Azure services.

---

Azure Cache for Redis is Microsoft's fully managed Redis offering that provides a secure, dedicated Redis cache for your Azure applications. This guide covers everything you need to know to set up, configure, and optimize Azure Cache for Redis for production workloads.

## Why Azure Cache for Redis?

Azure Cache for Redis offers several benefits:

- **Fully Managed**: Microsoft handles patching, updates, and infrastructure maintenance
- **High Availability**: Built-in replication and automatic failover
- **Enterprise Features**: Active geo-replication, Redis modules, and enhanced security
- **Azure Integration**: Native integration with Azure services and monitoring
- **Multiple Tiers**: From Basic (development) to Enterprise (mission-critical)

## Understanding Azure Cache for Redis Tiers

| Tier | Use Case | Features |
|------|----------|----------|
| Basic | Development/Testing | Single node, no SLA |
| Standard | Production | Replication, 99.9% SLA |
| Premium | High performance | Clustering, persistence, VNet |
| Enterprise | Mission-critical | Redis modules, active geo-replication |
| Enterprise Flash | Large datasets | NVMe flash storage, cost-effective |

## Prerequisites

Before starting, ensure you have:

- An Azure subscription
- Azure CLI installed and configured
- Resource group created
- Virtual network (for Premium/Enterprise tiers)

## Creating Azure Cache for Redis

### Using Azure CLI

#### Standard Tier (Production)

```bash
# Create a resource group
az group create \
    --name myResourceGroup \
    --location eastus

# Create Standard tier cache
az redis create \
    --name my-redis-cache \
    --resource-group myResourceGroup \
    --location eastus \
    --sku Standard \
    --vm-size c1 \
    --enable-non-ssl-port false \
    --minimum-tls-version 1.2 \
    --redis-version 6
```

#### Premium Tier with Clustering

```bash
# Create Premium tier cache with clustering
az redis create \
    --name my-redis-premium \
    --resource-group myResourceGroup \
    --location eastus \
    --sku Premium \
    --vm-size p1 \
    --shard-count 3 \
    --enable-non-ssl-port false \
    --minimum-tls-version 1.2 \
    --subnet-id /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}
```

### Using Terraform

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "redis" {
  name     = "redis-resources"
  location = "East US"
}

# Standard Tier Cache
resource "azurerm_redis_cache" "standard" {
  name                = "my-redis-standard"
  location            = azurerm_resource_group.redis.location
  resource_group_name = azurerm_resource_group.redis.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"

  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy = "volatile-lru"
  }

  tags = {
    Environment = "Production"
  }
}

# Premium Tier Cache with Clustering
resource "azurerm_redis_cache" "premium" {
  name                = "my-redis-premium"
  location            = azurerm_resource_group.redis.location
  resource_group_name = azurerm_resource_group.redis.name
  capacity            = 1
  family              = "P"
  sku_name            = "Premium"
  shard_count         = 3

  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  subnet_id = azurerm_subnet.redis.id

  redis_configuration {
    maxmemory_policy       = "volatile-lru"
    maxfragmentationmemory_reserved = 50
    maxmemory_reserved     = 50
    rdb_backup_enabled     = true
    rdb_backup_frequency   = 60
    rdb_storage_connection_string = azurerm_storage_account.redis.primary_blob_connection_string
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
  }

  tags = {
    Environment = "Production"
  }
}

# Virtual Network for Premium Tier
resource "azurerm_virtual_network" "redis" {
  name                = "redis-vnet"
  location            = azurerm_resource_group.redis.location
  resource_group_name = azurerm_resource_group.redis.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "redis" {
  name                 = "redis-subnet"
  resource_group_name  = azurerm_resource_group.redis.name
  virtual_network_name = azurerm_virtual_network.redis.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Storage Account for RDB Persistence
resource "azurerm_storage_account" "redis" {
  name                     = "redisbackupstorage"
  resource_group_name      = azurerm_resource_group.redis.name
  location                 = azurerm_resource_group.redis.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Output connection information
output "redis_hostname" {
  value = azurerm_redis_cache.standard.hostname
}

output "redis_ssl_port" {
  value = azurerm_redis_cache.standard.ssl_port
}

output "redis_primary_key" {
  value     = azurerm_redis_cache.standard.primary_access_key
  sensitive = true
}
```

### Using Azure Bicep

```bicep
param location string = resourceGroup().location
param redisCacheName string = 'my-redis-cache'

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisCacheName
  location: location
  properties: {
    sku: {
      name: 'Premium'
      family: 'P'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisVersion: '6'
    shardCount: 3
    redisConfiguration: {
      'maxmemory-policy': 'volatile-lru'
      'maxfragmentationmemory-reserved': '50'
      'maxmemory-reserved': '50'
    }
  }
}

output redisHostname string = redisCache.properties.hostName
output redisSslPort int = redisCache.properties.sslPort
```

## Connecting to Azure Cache for Redis

### Getting Connection Information

```bash
# Get hostname and ports
az redis show \
    --name my-redis-cache \
    --resource-group myResourceGroup \
    --query "{hostname:hostName, sslPort:sslPort}"

# Get access keys
az redis list-keys \
    --name my-redis-cache \
    --resource-group myResourceGroup
```

### Python Connection Example

```python
import redis
import os

def get_azure_redis_connection():
    """Connect to Azure Cache for Redis"""
    return redis.Redis(
        host=os.environ['REDIS_HOST'],
        port=6380,  # SSL port
        password=os.environ['REDIS_PASSWORD'],
        ssl=True,
        ssl_cert_reqs='required',
        decode_responses=True
    )

# With connection pooling
def get_redis_pool():
    """Create a connection pool for better performance"""
    pool = redis.ConnectionPool(
        host=os.environ['REDIS_HOST'],
        port=6380,
        password=os.environ['REDIS_PASSWORD'],
        ssl=True,
        ssl_cert_reqs='required',
        max_connections=50,
        decode_responses=True
    )
    return redis.Redis(connection_pool=pool)

# Usage
redis_client = get_azure_redis_connection()
redis_client.set('greeting', 'Hello from Azure!')
print(redis_client.get('greeting'))
```

### Node.js Connection Example

```javascript
const Redis = require('ioredis');

// Single instance connection
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: {
    servername: process.env.REDIS_HOST
  },
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

// For clustered Premium/Enterprise tier
const cluster = new Redis.Cluster([
  {
    host: process.env.REDIS_HOST,
    port: 6380
  }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    tls: {
      servername: process.env.REDIS_HOST
    }
  },
  scaleReads: 'slave'
});

// Usage with async/await
async function example() {
  await redis.set('key', 'value');
  const value = await redis.get('key');
  console.log(`Value: ${value}`);
}

example();
```

### .NET Connection Example

```csharp
using StackExchange.Redis;

public class RedisService
{
    private static Lazy<ConnectionMultiplexer> lazyConnection =
        new Lazy<ConnectionMultiplexer>(() =>
        {
            string connectionString = Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING");
            // Format: <cache-name>.redis.cache.windows.net:6380,password=<key>,ssl=True,abortConnect=False
            return ConnectionMultiplexer.Connect(connectionString);
        });

    public static ConnectionMultiplexer Connection => lazyConnection.Value;

    public static IDatabase GetDatabase()
    {
        return Connection.GetDatabase();
    }
}

// Usage
var db = RedisService.GetDatabase();
await db.StringSetAsync("greeting", "Hello from Azure!");
var value = await db.StringGetAsync("greeting");
Console.WriteLine($"Value: {value}");
```

### Go Connection Example

```go
package main

import (
    "context"
    "crypto/tls"
    "fmt"
    "os"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    rdb := redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%s:6380", os.Getenv("REDIS_HOST")),
        Password: os.Getenv("REDIS_PASSWORD"),
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
            ServerName: os.Getenv("REDIS_HOST"),
        },
    })

    // Test connection
    pong, err := rdb.Ping(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Ping: %s\n", pong)

    // Set and get value
    err = rdb.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        panic(err)
    }

    val, err := rdb.Get(ctx, "key").Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Value: %s\n", val)
}
```

## Configuring Data Persistence

### RDB Persistence (Premium Tier)

```bash
az redis update \
    --name my-redis-premium \
    --resource-group myResourceGroup \
    --set "redisConfiguration.rdb-backup-enabled=true" \
    --set "redisConfiguration.rdb-backup-frequency=60" \
    --set "redisConfiguration.rdb-storage-connection-string=<storage-connection-string>"
```

### AOF Persistence (Premium Tier)

```hcl
resource "azurerm_redis_cache" "premium_aof" {
  name                = "my-redis-aof"
  location            = azurerm_resource_group.redis.location
  resource_group_name = azurerm_resource_group.redis.name
  capacity            = 1
  family              = "P"
  sku_name            = "Premium"

  redis_configuration {
    aof_backup_enabled              = true
    aof_storage_connection_string_0 = azurerm_storage_account.redis.primary_blob_connection_string
    aof_storage_connection_string_1 = azurerm_storage_account.redis_secondary.primary_blob_connection_string
  }
}
```

## Setting Up Private Endpoint

For enhanced security, use private endpoints:

```hcl
resource "azurerm_private_endpoint" "redis" {
  name                = "redis-private-endpoint"
  location            = azurerm_resource_group.redis.location
  resource_group_name = azurerm_resource_group.redis.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "redis-privateserviceconnection"
    private_connection_resource_id = azurerm_redis_cache.premium.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "redis-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.redis.id]
  }
}

resource "azurerm_private_dns_zone" "redis" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = azurerm_resource_group.redis.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "redis" {
  name                  = "redis-dns-link"
  resource_group_name   = azurerm_resource_group.redis.name
  private_dns_zone_name = azurerm_private_dns_zone.redis.name
  virtual_network_id    = azurerm_virtual_network.main.id
}
```

## Monitoring with Azure Monitor

### Creating Alerts

```hcl
resource "azurerm_monitor_metric_alert" "redis_memory" {
  name                = "redis-memory-alert"
  resource_group_name = azurerm_resource_group.redis.name
  scopes              = [azurerm_redis_cache.premium.id]
  description         = "Alert when Redis memory usage exceeds 80%"
  severity            = 2

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "usedmemorypercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.redis_alerts.id
  }
}

resource "azurerm_monitor_metric_alert" "redis_cpu" {
  name                = "redis-cpu-alert"
  resource_group_name = azurerm_resource_group.redis.name
  scopes              = [azurerm_redis_cache.premium.id]
  description         = "Alert when Redis CPU exceeds 75%"
  severity            = 2

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "percentProcessorTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 75
  }

  action {
    action_group_id = azurerm_monitor_action_group.redis_alerts.id
  }
}

resource "azurerm_monitor_action_group" "redis_alerts" {
  name                = "redis-alerts"
  resource_group_name = azurerm_resource_group.redis.name
  short_name          = "redisalert"

  email_receiver {
    name          = "ops-team"
    email_address = "ops@example.com"
  }
}
```

### Diagnostic Settings

```hcl
resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "redis-diagnostics"
  target_resource_id         = azurerm_redis_cache.premium.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Geo-Replication (Premium/Enterprise)

### Setting Up Geo-Replication

```bash
# Create primary cache
az redis create \
    --name my-redis-primary \
    --resource-group myResourceGroup \
    --location eastus \
    --sku Premium \
    --vm-size p1

# Create secondary cache
az redis create \
    --name my-redis-secondary \
    --resource-group myResourceGroup \
    --location westus \
    --sku Premium \
    --vm-size p1

# Link caches for geo-replication
az redis server-link create \
    --name my-redis-primary \
    --resource-group myResourceGroup \
    --replication-role Secondary \
    --server-to-link /subscriptions/{sub}/resourceGroups/myResourceGroup/providers/Microsoft.Cache/Redis/my-redis-secondary
```

## Scaling Azure Cache for Redis

### Vertical Scaling (Change Tier/Size)

```bash
# Scale up
az redis update \
    --name my-redis-cache \
    --resource-group myResourceGroup \
    --sku Premium \
    --vm-size p2
```

### Horizontal Scaling (Add Shards)

```bash
# Add shards to Premium cluster
az redis update \
    --name my-redis-premium \
    --resource-group myResourceGroup \
    --shard-count 5
```

## Security Best Practices

### 1. Disable Non-SSL Port

```bash
az redis update \
    --name my-redis-cache \
    --resource-group myResourceGroup \
    --set enableNonSslPort=false
```

### 2. Enforce TLS 1.2

```bash
az redis update \
    --name my-redis-cache \
    --resource-group myResourceGroup \
    --set minimumTlsVersion=1.2
```

### 3. Use Managed Identity

```hcl
resource "azurerm_redis_cache" "with_identity" {
  name                = "my-redis-managed-id"
  location            = azurerm_resource_group.redis.location
  resource_group_name = azurerm_resource_group.redis.name
  capacity            = 1
  family              = "P"
  sku_name            = "Premium"

  identity {
    type = "SystemAssigned"
  }
}
```

### 4. Firewall Rules

```hcl
resource "azurerm_redis_firewall_rule" "allow_app_service" {
  name                = "allow-app-service"
  redis_cache_name    = azurerm_redis_cache.premium.name
  resource_group_name = azurerm_resource_group.redis.name
  start_ip            = "10.0.0.1"
  end_ip              = "10.0.0.255"
}
```

## Cost Optimization Tips

1. **Choose the right tier**: Start with Standard for most production workloads
2. **Use reserved capacity**: Save up to 55% with 1 or 3-year reservations
3. **Monitor usage**: Scale down during low-traffic periods
4. **Optimize data structures**: Use efficient Redis data types
5. **Set TTLs**: Prevent unbounded memory growth
6. **Consider Enterprise Flash**: For large datasets where cost matters

## Conclusion

Azure Cache for Redis provides a powerful, fully managed Redis solution that integrates seamlessly with the Azure ecosystem. By following this guide, you can set up a production-ready Redis cache with proper security, monitoring, and high availability configurations.

Key takeaways:

- Choose the appropriate tier based on your workload requirements
- Always use SSL/TLS connections and disable non-SSL ports
- Implement proper monitoring and alerting with Azure Monitor
- Use private endpoints for enhanced security in enterprise scenarios
- Consider geo-replication for mission-critical applications

For advanced configurations and enterprise deployments, consult the Azure documentation and consider working with Azure support for complex architectures.
