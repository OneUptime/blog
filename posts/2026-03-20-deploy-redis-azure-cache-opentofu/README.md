# How to Deploy Redis on Azure Cache with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Redis, Azure Cache for Redis, Infrastructure as Code

Description: Learn how to deploy Azure Cache for Redis with OpenTofu - configuring cache tiers, private endpoints, persistence, geo-replication, and application connection strings.

## Introduction

Azure Cache for Redis provides a managed Redis service with automatic failover, patching, and monitoring. OpenTofu manages the Redis instance, private endpoint for network security, firewall rules, and diagnostic settings - giving you a reproducible, version-controlled cache deployment.

## Basic Azure Cache for Redis

```hcl
resource "azurerm_redis_cache" "app" {
  name                = "${var.environment}-app-redis"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location

  sku_name            = "Standard"  # Basic, Standard, or Premium
  family              = "C"         # C for Basic/Standard, P for Premium
  capacity            = 1           # 0-6 for C family

  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy   = "allkeys-lru"
    authentication_enabled = true
  }

  tags = { Environment = var.environment }
}
```

## Premium Tier with Persistence and Clustering

```hcl
resource "azurerm_redis_cache" "premium" {
  name                = "${var.environment}-premium-redis"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location

  sku_name  = "Premium"
  family    = "P"
  capacity  = 1          # P1 = 6 GB per shard, P2 = 13 GB per shard, P3 = 26 GB per shard, P4 = 53 GB per shard, P5 = 120 GB per shard

  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"

  shard_count = 2  # Redis clustering - Premium only

  redis_configuration {
    maxmemory_policy            = "allkeys-lru"
    authentication_enabled      = true

    # Choose either RDB or AOF persistence, not both.
    # RDB persistence
    rdb_backup_enabled            = true
    rdb_backup_frequency          = 60  # Minutes
    rdb_backup_max_snapshot_count = 1
    rdb_storage_connection_string = azurerm_storage_account.redis_backup.primary_blob_connection_string
  }

  zones = ["1", "2"]  # Zone redundancy

  tags = { Environment = var.environment }
}
```

## Private Endpoint

```hcl
resource "azurerm_private_endpoint" "redis" {
  name                = "${var.environment}-redis-pe"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "redis-connection"
    private_connection_resource_id = azurerm_redis_cache.secure.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "redis-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.redis.id]
  }
}

resource "azurerm_private_dns_zone" "redis" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = azurerm_resource_group.app.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "redis" {
  name                  = "redis-dns-link"
  resource_group_name   = azurerm_resource_group.app.name
  private_dns_zone_name = azurerm_private_dns_zone.redis.name
  virtual_network_id    = azurerm_virtual_network.app.id
}

# Disable public network access when using private endpoint

resource "azurerm_redis_cache" "secure" {
  name                = "${var.environment}-secure-redis"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  sku_name            = "Premium"
  family              = "P"
  capacity            = 1

  public_network_access_enabled = false  # Private endpoint only
}
```

## Geo-Replication (Premium)

```hcl
resource "azurerm_redis_cache" "primary" {
  name                = "${var.environment}-redis-primary"
  resource_group_name = azurerm_resource_group.primary.name
  location            = "East US"
  sku_name            = "Premium"
  family              = "P"
  capacity            = 1
}

resource "azurerm_redis_cache" "secondary" {
  name                = "${var.environment}-redis-secondary"
  resource_group_name = azurerm_resource_group.secondary.name
  location            = "West Europe"
  sku_name            = "Premium"
  family              = "P"
  capacity            = 1
}

resource "azurerm_redis_linked_server" "geo" {
  target_redis_cache_name     = azurerm_redis_cache.primary.name
  resource_group_name         = azurerm_resource_group.primary.name
  linked_redis_cache_id       = azurerm_redis_cache.secondary.id
  linked_redis_cache_location = azurerm_redis_cache.secondary.location
  server_role                 = "Secondary"
}
```

## Store Connection String in Key Vault

```hcl
resource "azurerm_key_vault_secret" "redis_connection" {
  name         = "${var.environment}-redis-connection"
  value        = azurerm_redis_cache.app.primary_connection_string
  key_vault_id = azurerm_key_vault.app.id

  tags = { Environment = var.environment }
}
```

## Outputs

```hcl
output "redis_hostname" {
  value       = azurerm_redis_cache.app.hostname
  description = "Redis cache hostname"
}

output "redis_ssl_port" {
  value       = azurerm_redis_cache.app.ssl_port
  description = "Redis SSL port (6380)"
}

output "redis_connection_string_secret" {
  value       = azurerm_key_vault_secret.redis_connection.id
  description = "Key Vault secret ID for the connection string"
}
```

## Conclusion

Azure Cache for Redis with OpenTofu provides managed Redis with automatic failover. Always use `non_ssl_port_enabled = false` and `minimum_tls_version = "1.2"` for production security. Use private endpoints (`public_network_access_enabled = false`) to keep Redis access within the VNet. Store the primary connection string in Azure Key Vault rather than outputting it directly. For high availability, use the Premium tier with zone redundancy (`zones = ["1", "2"]`) and geo-replication for cross-region disaster recovery. Azure Cache for Redis has an announced retirement timeline, and Basic, Standard, and Premium tiers retire on September 30, 2028, so plan long-term deployments and migrations to Azure Managed Redis accordingly.
