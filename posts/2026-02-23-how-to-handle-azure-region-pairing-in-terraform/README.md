# How to Handle Azure Region Pairing in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Region Pairing, Disaster Recovery, Infrastructure as Code, High Availability

Description: Learn how to handle Azure region pairing in Terraform to build disaster recovery architectures that leverage Azure's built-in regional redundancy.

---

Azure regions come in pairs. East US is paired with West US, North Europe with West Europe, and so on. This pairing is not arbitrary - Azure uses it for platform replication of services like geo-redundant storage, sequential region updates during maintenance, and prioritized recovery during widespread outages. Understanding and leveraging region pairing in your Terraform configurations makes your disaster recovery architecture align with how Azure actually works.

This guide covers how to work with Azure region pairs in Terraform, from looking up paired regions to building multi-region infrastructure that takes advantage of the pairing relationship.

## Why Region Pairing Matters

Azure's region pairing provides several guarantees:

- **Sequential updates**: During planned maintenance, only one region in a pair is updated at a time. This prevents both regions from being unavailable simultaneously.
- **Prioritized recovery**: During a multi-region outage, Azure prioritizes recovering one region from each pair first.
- **Data residency**: Paired regions are in the same geography (with one exception - Brazil South is paired with South Central US), keeping your data within the same geopolitical boundary.
- **GRS replication**: Geo-redundant storage replicates data to the paired region automatically.

When you build disaster recovery, putting your primary and secondary workloads in paired regions gives you these benefits for free.

## Looking Up Paired Regions

Azure does not expose region pairing through a Terraform data source directly, but you can build a lookup map:

```hcl
# locals.tf - Azure region pairs lookup
locals {
  # Complete map of Azure region pairs
  region_pairs = {
    "eastus"             = "westus"
    "westus"             = "eastus"
    "eastus2"            = "centralus"
    "centralus"          = "eastus2"
    "westus2"            = "westcentralus"
    "westcentralus"      = "westus2"
    "westus3"            = "eastus"
    "northcentralus"     = "southcentralus"
    "southcentralus"     = "northcentralus"
    "canadacentral"      = "canadaeast"
    "canadaeast"         = "canadacentral"
    "northeurope"        = "westeurope"
    "westeurope"         = "northeurope"
    "uksouth"            = "ukwest"
    "ukwest"             = "uksouth"
    "francecentral"      = "francesouth"
    "francesouth"        = "francecentral"
    "germanywestcentral" = "germanynorth"
    "germanynorth"       = "germanywestcentral"
    "switzerlandnorth"   = "switzerlandwest"
    "switzerlandwest"    = "switzerlandnorth"
    "norwayeast"         = "norwaywest"
    "norwaywest"         = "norwayeast"
    "southeastasia"      = "eastasia"
    "eastasia"           = "southeastasia"
    "japaneast"          = "japanwest"
    "japanwest"          = "japaneast"
    "australiaeast"      = "australiasoutheast"
    "australiasoutheast" = "australiaeast"
    "centralindia"       = "southindia"
    "southindia"         = "centralindia"
    "koreacentral"       = "koreasouth"
    "koreasouth"         = "koreacentral"
    "brazilsouth"        = "southcentralus"
    "southafricanorth"   = "southafricawest"
    "southafricawest"    = "southafricanorth"
    "uaenorth"           = "uaecentral"
    "uaecentral"         = "uaenorth"
  }

  # Look up the paired region for the primary location
  primary_region   = var.primary_location
  secondary_region = lookup(local.region_pairs, var.primary_location, "")
}
```

## Using Region Pairs for Multi-Region Deployment

With the lookup in place, you can build multi-region infrastructure automatically:

```hcl
# variables.tf
variable "primary_location" {
  description = "Primary Azure region"
  type        = string
  default     = "eastus"
}

variable "workload" {
  description = "Workload name"
  type        = string
  default     = "webapp"
}
```

```hcl
# Primary region resources
resource "azurerm_resource_group" "primary" {
  name     = "rg-${var.workload}-prod-${local.primary_region}"
  location = local.primary_region

  tags = {
    role        = "primary"
    paired_with = local.secondary_region
  }
}

# Secondary (DR) region resources - automatically uses the paired region
resource "azurerm_resource_group" "secondary" {
  name     = "rg-${var.workload}-prod-${local.secondary_region}"
  location = local.secondary_region

  tags = {
    role        = "secondary"
    paired_with = local.primary_region
  }
}
```

## Geo-Redundant Storage Using Region Pairs

GRS storage automatically replicates to the paired region:

```hcl
# Geo-redundant storage account
resource "azurerm_storage_account" "data" {
  name                     = "st${var.workload}prod"
  resource_group_name      = azurerm_resource_group.primary.name
  location                 = azurerm_resource_group.primary.location
  account_tier             = "Standard"

  # GRS replicates to the paired region automatically
  account_replication_type = "GRS"

  tags = {
    replication_target = local.secondary_region
  }
}

# Read-Access GRS for read access in the secondary region
resource "azurerm_storage_account" "data_ra" {
  name                     = "st${var.workload}prodra"
  resource_group_name      = azurerm_resource_group.primary.name
  location                 = azurerm_resource_group.primary.location
  account_tier             = "Standard"

  # RA-GRS allows read access from the secondary region endpoint
  account_replication_type = "RAGRS"
}
```

With RA-GRS, your secondary region endpoint is available at `{account-name}-secondary.blob.core.windows.net`. Your application can read from this endpoint during a primary region outage.

## Multi-Region Networking with Region Pairs

Build hub-and-spoke networking across paired regions:

```hcl
# Hub VNet in the primary region
resource "azurerm_virtual_network" "hub_primary" {
  name                = "vnet-hub-${local.primary_region}"
  location            = local.primary_region
  resource_group_name = azurerm_resource_group.primary.name
  address_space       = ["10.0.0.0/16"]
}

# Hub VNet in the paired secondary region
resource "azurerm_virtual_network" "hub_secondary" {
  name                = "vnet-hub-${local.secondary_region}"
  location            = local.secondary_region
  resource_group_name = azurerm_resource_group.secondary.name
  address_space       = ["10.1.0.0/16"]
}

# Global VNet peering between the paired region hubs
resource "azurerm_virtual_network_peering" "primary_to_secondary" {
  name                      = "peer-${local.primary_region}-to-${local.secondary_region}"
  resource_group_name       = azurerm_resource_group.primary.name
  virtual_network_name      = azurerm_virtual_network.hub_primary.name
  remote_virtual_network_id = azurerm_virtual_network.hub_secondary.id
  allow_forwarded_traffic   = true
  allow_gateway_transit     = true
}

resource "azurerm_virtual_network_peering" "secondary_to_primary" {
  name                      = "peer-${local.secondary_region}-to-${local.primary_region}"
  resource_group_name       = azurerm_resource_group.secondary.name
  virtual_network_name      = azurerm_virtual_network.hub_secondary.name
  remote_virtual_network_id = azurerm_virtual_network.hub_primary.id
  allow_forwarded_traffic   = true
  use_remote_gateways       = false
}
```

## Database Geo-Replication with Region Pairs

Azure SQL Database supports active geo-replication to the paired region:

```hcl
# Primary SQL Server
resource "azurerm_mssql_server" "primary" {
  name                         = "sql-${var.workload}-${local.primary_region}"
  resource_group_name          = azurerm_resource_group.primary.name
  location                     = local.primary_region
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
}

# Secondary SQL Server in the paired region
resource "azurerm_mssql_server" "secondary" {
  name                         = "sql-${var.workload}-${local.secondary_region}"
  resource_group_name          = azurerm_resource_group.secondary.name
  location                     = local.secondary_region
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
}

# Primary database
resource "azurerm_mssql_database" "primary" {
  name      = "db-${var.workload}"
  server_id = azurerm_mssql_server.primary.id
  sku_name  = "S1"
}

# Failover group across the paired regions
resource "azurerm_mssql_failover_group" "main" {
  name      = "fog-${var.workload}"
  server_id = azurerm_mssql_server.primary.id

  databases = [azurerm_mssql_database.primary.id]

  partner_server {
    id = azurerm_mssql_server.secondary.id
  }

  read_write_endpoint_failover_policy {
    mode          = "Automatic"
    grace_minutes = 60
  }

  readonly_endpoint_failover_policy_enabled = true
}
```

## Traffic Manager Across Paired Regions

Use Traffic Manager to route users to the closest healthy region:

```hcl
# Traffic Manager profile
resource "azurerm_traffic_manager_profile" "main" {
  name                   = "tm-${var.workload}-prod"
  resource_group_name    = azurerm_resource_group.primary.name
  traffic_routing_method = "Priority"

  dns_config {
    relative_name = var.workload
    ttl           = 60
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/healthz"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
}

# Primary endpoint
resource "azurerm_traffic_manager_azure_endpoint" "primary" {
  name               = "endpoint-${local.primary_region}"
  profile_id         = azurerm_traffic_manager_profile.main.id
  target_resource_id = azurerm_linux_web_app.primary.id
  priority           = 1
}

# Secondary endpoint in the paired region
resource "azurerm_traffic_manager_azure_endpoint" "secondary" {
  name               = "endpoint-${local.secondary_region}"
  profile_id         = azurerm_traffic_manager_profile.main.id
  target_resource_id = azurerm_linux_web_app.secondary.id
  priority           = 2
}
```

## A Reusable Module for Region-Paired Deployments

Wrap the pattern in a module:

```hcl
# modules/region-pair/variables.tf
variable "primary_location" {
  description = "Primary Azure region"
  type        = string
}

variable "workload" {
  description = "Workload name"
  type        = string
}

# modules/region-pair/main.tf
locals {
  region_pairs = {
    # ... (same map as above)
  }
  secondary_location = lookup(local.region_pairs, var.primary_location, "")
}

# modules/region-pair/outputs.tf
output "primary_location" {
  value = var.primary_location
}

output "secondary_location" {
  value = local.secondary_location
}

output "primary_rg_name" {
  value = "rg-${var.workload}-${var.primary_location}"
}

output "secondary_rg_name" {
  value = "rg-${var.workload}-${local.secondary_location}"
}
```

## Best Practices

**Always use paired regions for DR.** You get sequential updates and prioritized recovery at no extra cost. Using non-paired regions for DR means you lose these platform-level benefits.

**Maintain the region pair map.** Azure occasionally adds new regions and pairs. Keep your Terraform lookup map updated.

**Test failover regularly.** Having infrastructure in a paired region is useless if you have not tested that your application actually works there.

**Consider latency.** Some paired regions are geographically close (UK South and UK West) while others are far apart (Brazil South and South Central US). Factor this into your architecture.

**Use geo-redundant services where available.** GRS storage, Azure SQL failover groups, and Cosmos DB multi-region writes all leverage region pairing. Use them instead of building custom replication.

## Wrapping Up

Azure region pairing is a platform feature that your disaster recovery architecture should align with. By maintaining a region pair lookup map in Terraform, you can automatically deploy resources to the correct paired region, set up geo-redundant storage, configure database failover groups, and build Traffic Manager profiles - all driven by a single `primary_location` variable. The infrastructure follows the region pair automatically, so changing your primary region cascades the correct secondary region throughout your configuration.
