# How to Deploy Azure Cache for Redis with Private Link Using Terraform Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, Redis, Private Link, Caching, Infrastructure as Code, Networking

Description: Deploy Azure Cache for Redis with Private Link connectivity using reusable Terraform modules for secure, high-performance caching infrastructure.

---

Azure Cache for Redis is the go-to caching solution on Azure. It handles session storage, API response caching, real-time analytics, and message brokering. By default, Redis instances get a public endpoint, which works for development but is not acceptable for production workloads handling sensitive data. Private Link gives you a private IP address within your VNet, keeping all traffic off the public internet.

This post shows how to build a reusable Terraform module that deploys Azure Cache for Redis with Private Link, DNS integration, and proper access controls.

## Module Structure

A well-structured Terraform module keeps things organized and reusable.

```
modules/
  redis-private/
    main.tf           # Core Redis resource
    private-link.tf   # Private endpoint and DNS
    variables.tf      # Input variables
    outputs.tf        # Output values
    versions.tf       # Provider requirements
```

## Provider Requirements

```hcl
# modules/redis-private/versions.tf
# Pin provider versions for consistency

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.80.0"
    }
  }
}
```

## Input Variables

Define all the configurable parameters.

```hcl
# modules/redis-private/variables.tf
# Input variables for the Redis Private Link module

variable "name" {
  description = "Name of the Redis cache instance"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the Redis instance"
  type        = string
}

variable "sku_name" {
  description = "Redis SKU - Basic, Standard, or Premium"
  type        = string
  default     = "Premium"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku_name)
    error_message = "SKU must be Basic, Standard, or Premium."
  }
}

variable "capacity" {
  description = "Size of the Redis cache (0-6 for Basic/Standard, 1-5 for Premium)"
  type        = number
  default     = 1
}

variable "family" {
  description = "Redis family - C for Basic/Standard, P for Premium"
  type        = string
  default     = "P"
}

variable "enable_non_ssl_port" {
  description = "Enable the non-SSL port (6379). Should be false for production."
  type        = bool
  default     = false
}

variable "minimum_tls_version" {
  description = "Minimum TLS version for connections"
  type        = string
  default     = "1.2"
}

variable "subnet_id" {
  description = "Subnet ID where the private endpoint will be created"
  type        = string
}

variable "private_dns_zone_id" {
  description = "ID of the private DNS zone for Redis. If empty, one will be created."
  type        = string
  default     = ""
}

variable "virtual_network_id" {
  description = "VNet ID for DNS zone linking (only used if creating DNS zone)"
  type        = string
  default     = ""
}

variable "redis_configuration" {
  description = "Additional Redis configuration settings"
  type = object({
    maxmemory_policy       = optional(string, "allkeys-lru")
    maxmemory_reserved     = optional(number, 125)
    maxfragmentationmemory_reserved = optional(number, 125)
    notify_keyspace_events = optional(string, "")
    rdb_backup_enabled     = optional(bool, false)
    rdb_backup_frequency   = optional(number, 60)
  })
  default = {}
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

## Core Redis Resource

```hcl
# modules/redis-private/main.tf
# Azure Cache for Redis with security hardening

resource "azurerm_redis_cache" "main" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name

  # SKU configuration
  capacity = var.capacity
  family   = var.family
  sku_name = var.sku_name

  # Security settings
  enable_non_ssl_port = var.enable_non_ssl_port
  minimum_tls_version = var.minimum_tls_version

  # Disable public network access since we are using Private Link
  public_network_access_enabled = false

  # Redis configuration
  redis_configuration {
    maxmemory_policy                    = var.redis_configuration.maxmemory_policy
    maxmemory_reserved                  = var.redis_configuration.maxmemory_reserved
    maxfragmentationmemory_reserved     = var.redis_configuration.maxfragmentationmemory_reserved
    notify_keyspace_events              = var.redis_configuration.notify_keyspace_events

    # RDB persistence (Premium only)
    rdb_backup_enabled    = var.sku_name == "Premium" ? var.redis_configuration.rdb_backup_enabled : null
    rdb_backup_frequency  = var.sku_name == "Premium" && var.redis_configuration.rdb_backup_enabled ? var.redis_configuration.rdb_backup_frequency : null
  }

  # Patch schedule for maintenance windows (Premium only)
  dynamic "patch_schedule" {
    for_each = var.sku_name == "Premium" ? [1] : []
    content {
      day_of_week    = "Sunday"
      start_hour_utc = 2
    }
  }

  tags = var.tags

  lifecycle {
    # Prevent accidental deletion of the cache
    prevent_destroy = false
  }
}
```

## Private Link Configuration

```hcl
# modules/redis-private/private-link.tf
# Private endpoint and DNS configuration for Redis

# Determine if we need to create the private DNS zone
locals {
  create_dns_zone = var.private_dns_zone_id == ""
  dns_zone_id     = local.create_dns_zone ? azurerm_private_dns_zone.redis[0].id : var.private_dns_zone_id
}

# Private DNS zone for Redis (if not provided externally)
resource "azurerm_private_dns_zone" "redis" {
  count               = local.create_dns_zone ? 1 : 0
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

# Link DNS zone to VNet (if creating the zone)
resource "azurerm_private_dns_zone_virtual_network_link" "redis" {
  count                 = local.create_dns_zone && var.virtual_network_id != "" ? 1 : 0
  name                  = "redis-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.redis[0].name
  virtual_network_id    = var.virtual_network_id
  registration_enabled  = false
}

# Private endpoint for the Redis cache
resource "azurerm_private_endpoint" "redis" {
  name                = "${var.name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${var.name}-psc"
    private_connection_resource_id = azurerm_redis_cache.main.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }

  private_dns_zone_group {
    name                 = "redis-dns-group"
    private_dns_zone_ids = [local.dns_zone_id]
  }

  tags = var.tags
}
```

## Module Outputs

```hcl
# modules/redis-private/outputs.tf
# Values that consumers of this module will need

output "redis_id" {
  description = "Resource ID of the Redis cache"
  value       = azurerm_redis_cache.main.id
}

output "redis_hostname" {
  description = "Hostname of the Redis cache"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_ssl_port" {
  description = "SSL port for Redis connections"
  value       = azurerm_redis_cache.main.ssl_port
}

output "redis_primary_access_key" {
  description = "Primary access key for Redis"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "redis_primary_connection_string" {
  description = "Primary connection string for Redis"
  value       = azurerm_redis_cache.main.primary_connection_string
  sensitive   = true
}

output "private_endpoint_ip" {
  description = "Private IP address of the Redis endpoint"
  value       = azurerm_private_endpoint.redis.private_service_connection[0].private_ip_address
}

output "private_dns_zone_id" {
  description = "ID of the private DNS zone (for sharing with other modules)"
  value       = local.dns_zone_id
}
```

## Using the Module

Now use the module from your root Terraform configuration.

```hcl
# main.tf
# Deploys Redis with Private Link using the module

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-app-production"
  location = "eastus"
}

# VNet for the application
resource "azurerm_virtual_network" "main" {
  name                = "vnet-app-production"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]
}

# Subnet for private endpoints
resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-private-endpoints"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.10.0/24"]
}

# Deploy Redis with Private Link
module "redis_cache" {
  source = "./modules/redis-private"

  name                = "redis-app-prod"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  # Premium tier for production
  sku_name = "Premium"
  capacity = 1
  family   = "P"

  # Private Link settings
  subnet_id          = azurerm_subnet.private_endpoints.id
  virtual_network_id = azurerm_virtual_network.main.id

  # Redis settings
  redis_configuration = {
    maxmemory_policy   = "allkeys-lru"
    rdb_backup_enabled = true
    rdb_backup_frequency = 60
  }

  tags = {
    environment = "production"
    service     = "web-app"
  }
}

# Store the connection string in Key Vault
resource "azurerm_key_vault_secret" "redis_connection" {
  name         = "redis-connection-string"
  value        = module.redis_cache.redis_primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

output "redis_private_ip" {
  value = module.redis_cache.private_endpoint_ip
}
```

## Testing Connectivity

After deployment, verify that the private endpoint works correctly.

```bash
# Get the private IP of the Redis endpoint
terraform output redis_private_ip

# From a VM in the same VNet, test connectivity
# The Redis hostname should resolve to the private IP
nslookup redis-app-prod.redis.cache.windows.net

# Test Redis connection using redis-cli
redis-cli -h redis-app-prod.redis.cache.windows.net -p 6380 --tls -a <access-key>
```

## Summary

A Terraform module for Azure Cache for Redis with Private Link gives you a reusable building block for secure caching infrastructure. The module handles the Redis instance, private endpoint, DNS zone integration, and security hardening in one coherent package. Consumers just provide a subnet and get a fully private Redis instance back. Using this module-based approach means every Redis deployment in your organization follows the same security standards, and changes to the module propagate to all future deployments.
