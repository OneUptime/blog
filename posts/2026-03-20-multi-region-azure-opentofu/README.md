# How to Build a Multi-Region Architecture with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Multi-Region, Architecture, OpenTofu, Traffic Manager, Cosmos DB, Active-Active

Description: Learn how to build a multi-region architecture on Azure using OpenTofu with Azure Traffic Manager, Cosmos DB multi-master, and region-pair deployments.

## Overview

Azure multi-region deployments use Traffic Manager for DNS-based routing, Cosmos DB multi-master for globally distributed writes, and Azure paired regions for compliance and data residency. OpenTofu uses provider aliases to manage resources in multiple regions.

## Step 1: Multi-Region Provider Setup

```hcl
# main.tf - Multi-region Azure providers

provider "azurerm" {
  alias           = "primary"
  features {}
  # Defaults to primary region from environment
}

provider "azurerm" {
  alias    = "secondary"
  features {}
  # Use subscription-level configuration for secondary region resources
}

# Resource groups in each region
resource "azurerm_resource_group" "primary" {
  provider = azurerm.primary
  name     = "app-eastus"
  location = "East US"
}

resource "azurerm_resource_group" "secondary" {
  provider = azurerm.secondary
  name     = "app-westeurope"
  location = "West Europe"
}
```

## Step 2: Cosmos DB with Multi-Region Writes

```hcl
# Cosmos DB with active-active replication
resource "azurerm_cosmosdb_account" "global" {
  name                = "app-global-cosmos"
  resource_group_name = azurerm_resource_group.primary.name
  location            = azurerm_resource_group.primary.location
  offer_type          = "Standard"

  multiple_write_locations_enabled = true  # Multi-master writes

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  # Primary region
  geo_location {
    location          = "East US"
    failover_priority = 0
  }

  # Secondary region
  geo_location {
    location          = "West Europe"
    failover_priority = 1
  }

  # Additional read region
  geo_location {
    location          = "Southeast Asia"
    failover_priority = 2
  }

  # Automatic failover
  is_virtual_network_filter_enabled = false
  automatic_failover_enabled        = true
}
```

## Step 3: App Service in Each Region

```hcl
# Deploy App Service in primary region
module "app_primary" {
  source = "./modules/app-service"

  resource_group_name = azurerm_resource_group.primary.name
  location            = azurerm_resource_group.primary.location
  app_name            = "app-eastus"
  cosmos_endpoint     = azurerm_cosmosdb_account.global.endpoint
}

# Deploy same App Service in secondary region
module "app_secondary" {
  source = "./modules/app-service"

  resource_group_name = azurerm_resource_group.secondary.name
  location            = azurerm_resource_group.secondary.location
  app_name            = "app-westeurope"
  cosmos_endpoint     = azurerm_cosmosdb_account.global.endpoint
}
```

## Step 4: Traffic Manager for Global Routing

```hcl
# Traffic Manager profile with performance routing
resource "azurerm_traffic_manager_profile" "app" {
  name                = "app-traffic-manager"
  resource_group_name = azurerm_resource_group.primary.name

  traffic_routing_method = "Performance"  # Routes to lowest-latency region

  dns_config {
    relative_name = "app"
    ttl           = 60
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
}

# Endpoint in primary region
resource "azurerm_traffic_manager_azure_endpoint" "primary" {
  name               = "primary-endpoint"
  profile_id         = azurerm_traffic_manager_profile.app.id
  target_resource_id = module.app_primary.app_service_id
  weight             = 1
  priority           = 1
}

# Endpoint in secondary region
resource "azurerm_traffic_manager_azure_endpoint" "secondary" {
  name               = "secondary-endpoint"
  profile_id         = azurerm_traffic_manager_profile.app.id
  target_resource_id = module.app_secondary.app_service_id
  weight             = 1
  priority           = 2
}
```

## Summary

Azure multi-region architecture built with OpenTofu uses Traffic Manager to route users to the lowest-latency region with automatic failover when health checks fail. Cosmos DB multi-master writes allow both regions to accept writes simultaneously, with built-in conflict resolution. Deploying across multiple Azure regions helps satisfy data residency requirements; choosing Azure paired regions (such as East US / West US, or North Europe / West Europe) additionally benefits from sequential platform maintenance so both regions are not updated simultaneously.
