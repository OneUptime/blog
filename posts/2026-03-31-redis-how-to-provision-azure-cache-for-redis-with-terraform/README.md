# How to Provision Azure Cache for Redis with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Terraform, Infrastructure as Code, Azure Cache for Redis

Description: Learn how to provision Azure Cache for Redis using Terraform, including tier selection, firewall rules, private endpoints, and VNet integration.

---

## Prerequisites

- Terraform >= 1.3.0
- Azure CLI installed and authenticated: `az login`
- An Azure subscription

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.114"
    }
  }
  required_version = ">= 1.3.0"
}

provider "azurerm" {
  features {}
}
```

## Basic Azure Cache for Redis (Standard Tier)

```hcl
# main.tf

# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "rg-redis-prod"
  location = "East US"
}

# Azure Cache for Redis
resource "azurerm_redis_cache" "redis" {
  name                = "my-app-redis-prod"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  # SKU configuration
  sku_name  = "Standard"  # Basic, Standard, or Premium
  family    = "C"         # C for Basic/Standard, P for Premium
  capacity  = 2           # Size: 0=250MB, 1=1GB, 2=2.5GB, 3=6GB, 4=13GB, 5=26GB, 6=53GB

  # TLS settings
  minimum_tls_version = "1.2"
  non_ssl_port_enabled = false

  # Redis configuration
  redis_configuration {
    maxmemory_reserved     = 125  # MB reserved for non-cache use
    maxmemory_delta        = 125  # MB reserved for fragmentation
    maxmemory_policy       = "allkeys-lru"
    authentication_enabled = true
    notify_keyspace_events = ""
  }

  # Maintenance window
  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Premium Tier with Persistence and Clustering

```hcl
resource "azurerm_redis_cache" "redis_premium" {
  name                = "my-app-redis-premium"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  sku_name  = "Premium"
  family    = "P"
  capacity  = 1           # P1=6GB, P2=13GB, P3=26GB, P4=53GB, P5=120GB

  # Enable clustering
  shard_count = 2

  # Enable zone redundancy
  zones = ["1", "2", "3"]

  minimum_tls_version = "1.2"
  non_ssl_port_enabled = false

  redis_configuration {
    maxmemory_policy    = "allkeys-lru"
    maxmemory_reserved  = 600
    maxmemory_delta     = 600

    # RDB Persistence (Premium only)
    rdb_backup_enabled            = true
    rdb_backup_frequency          = 60  # minutes: 15, 30, 60, 360, 720, 1440
    rdb_backup_max_snapshot_count = 1
    rdb_storage_connection_string = azurerm_storage_account.backup.primary_blob_connection_string
  }

  tags = {
    Environment = "production"
    Tier        = "premium"
  }
}

# Storage account for RDB backups
resource "azurerm_storage_account" "backup" {
  name                     = "redisbackupstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
}
```

## VNet Integration (Premium Tier)

```hcl
# Virtual Network
resource "azurerm_virtual_network" "vnet" {
  name                = "redis-vnet"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "redis_subnet" {
  name                 = "redis-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Premium Redis with VNet injection
resource "azurerm_redis_cache" "redis_vnet" {
  name                = "my-app-redis-vnet"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  sku_name  = "Premium"
  family    = "P"
  capacity  = 1

  subnet_id = azurerm_subnet.redis_subnet.id

  minimum_tls_version  = "1.2"
  non_ssl_port_enabled = false

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
}
```

## Firewall Rules

```hcl
# Allow specific IP ranges (Basic, Standard, or Premium tier)
resource "azurerm_redis_firewall_rule" "office" {
  name                = "allow-office"
  redis_cache_name    = azurerm_redis_cache.redis.name
  resource_group_name = azurerm_resource_group.rg.name
  start_ip            = "203.0.113.0"
  end_ip              = "203.0.113.255"
}

resource "azurerm_redis_firewall_rule" "app_servers" {
  name                = "allow-app-servers"
  redis_cache_name    = azurerm_redis_cache.redis.name
  resource_group_name = azurerm_resource_group.rg.name
  start_ip            = "10.0.2.0"
  end_ip              = "10.0.2.255"
}
```

## Outputs

```hcl
# outputs.tf
output "redis_hostname" {
  value = azurerm_redis_cache.redis.hostname
}

output "redis_ssl_port" {
  value = azurerm_redis_cache.redis.ssl_port
}

output "redis_primary_access_key" {
  value     = azurerm_redis_cache.redis.primary_access_key
  sensitive = true
}

output "redis_connection_string" {
  value     = azurerm_redis_cache.redis.primary_connection_string
  sensitive = true
}
```

## Variables

```hcl
# variables.tf
variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "redis_sku" {
  description = "Redis SKU: Basic, Standard, Premium"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.redis_sku)
    error_message = "Redis SKU must be Basic, Standard, or Premium."
  }
}

variable "redis_capacity" {
  description = "Redis capacity (0-6 for C family, 1-5 for P family)"
  type        = number
  default     = 1
}
```

## Deploying

```bash
# Initialize
terraform init

# Review the plan
terraform plan -var="environment=prod"

# Apply
terraform apply -var="environment=prod"

# Get the connection string
terraform output -raw redis_connection_string
```

## Summary

Provisioning Azure Cache for Redis with Terraform uses the azurerm_redis_cache resource with SKU selection (Basic, Standard, or Premium), configuration for maxmemory policy and TLS, and optional firewall rules for IP allowlisting. Premium tier adds clustering, zone redundancy, VNet injection, and RDB persistence to blob storage. Store the primary_connection_string output as a sensitive value in your secret management system rather than in Terraform state, and always enable minimum_tls_version = "1.2" and disable non_ssl_port_enabled for security.
