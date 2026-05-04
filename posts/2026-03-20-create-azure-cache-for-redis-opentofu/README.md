# How to Create Azure Cache for Redis with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Redis, Cache, Infrastructure as Code

Description: Learn how to create Azure Cache for Redis instances with OpenTofu for managed in-memory caching with high availability and geo-replication support.

Azure Cache for Redis is a managed Redis service that provides sub-millisecond latency for caching, session state, and real-time data. Managing it in OpenTofu ensures consistent tier, SKU, and security settings across environments.

## Provider Configuration

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
```

## Basic Redis Cache

```hcl
resource "azurerm_resource_group" "cache" {
  name     = "cache-rg"
  location = "eastus"
}

resource "azurerm_redis_cache" "main" {
  name                = "myapp-redis"
  location            = azurerm_resource_group.cache.location
  resource_group_name = azurerm_resource_group.cache.name

  sku_name = "Premium"  # Basic, Standard, Premium
  family   = "P"        # C for Basic/Standard, P for Premium
  capacity = 1          # 0-6 for C, 1-5 for P

  enable_non_ssl_port = false  # Force TLS
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_reserved  = 2   # Megabytes reserved for non-cache usage
    maxmemory_delta     = 2
    maxmemory_policy    = "allkeys-lru"
    maxfragmentationmemory_reserved = 2
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 3
  }

  tags = {
    Environment = "production"
    Team        = "backend"
  }
}
```

## Premium Redis with Clustering

```hcl
resource "azurerm_redis_cache" "cluster" {
  name                = "myapp-redis-cluster"
  location            = azurerm_resource_group.cache.location
  resource_group_name = azurerm_resource_group.cache.name

  sku_name            = "Premium"
  family              = "P"
  capacity            = 3

  # Enable cluster mode with 4 shards
  shard_count        = 4

  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy = "volatile-lru"
  }
}
```

## Premium Redis in VNet

```hcl
resource "azurerm_redis_cache" "private" {
  name                = "myapp-redis-private"
  location            = azurerm_resource_group.cache.location
  resource_group_name = azurerm_resource_group.cache.name

  sku_name  = "Premium"
  family    = "P"
  capacity  = 1

  # Deploy into VNet subnet
  subnet_id = azurerm_subnet.redis.id

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
}
```

## Firewall Rules (Standard/Premium without VNet)

```hcl
resource "azurerm_redis_firewall_rule" "app_servers" {
  name                = "app-servers"
  redis_cache_name    = azurerm_redis_cache.main.name
  resource_group_name = azurerm_resource_group.cache.name
  start_ip            = "10.0.1.0"
  end_ip              = "10.0.1.255"
}
```

## Geo-Replication (Premium)

```hcl
# Primary in eastus

resource "azurerm_redis_cache" "primary" {
  name                = "myapp-redis-primary"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.cache.name
  sku_name            = "Premium"
  family              = "P"
  capacity            = 1
}

# Secondary in westus2
resource "azurerm_redis_cache" "secondary" {
  name                = "myapp-redis-secondary"
  location            = "westus2"
  resource_group_name = azurerm_resource_group.cache.name
  sku_name            = "Premium"
  family              = "P"
  capacity            = 1
}

resource "azurerm_redis_linked_server" "geo_replication" {
  target_redis_cache_name     = azurerm_redis_cache.primary.name
  resource_group_name         = azurerm_resource_group.cache.name
  linked_redis_cache_id       = azurerm_redis_cache.secondary.id
  linked_redis_cache_location = azurerm_redis_cache.secondary.location
  server_role                 = "Secondary"
}
```

## Outputs

```hcl
output "redis_hostname" {
  value = azurerm_redis_cache.main.hostname
}

output "redis_ssl_port" {
  value = azurerm_redis_cache.main.ssl_port
}

output "redis_primary_key" {
  value     = azurerm_redis_cache.main.primary_access_key
  sensitive = true
}

output "connection_string" {
  value     = azurerm_redis_cache.main.primary_connection_string
  sensitive = true
}
```

## Conclusion

Azure Cache for Redis in OpenTofu provides managed Redis with flexible sizing and high availability. Use the Premium tier for clustering, VNet integration, and geo-replication. Always disable the non-SSL port and enforce TLS 1.2, configure appropriate maxmemory-policy for your eviction requirements, and use private endpoints or VNet injection for security.
