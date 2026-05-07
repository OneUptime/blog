# How to Set Up Azure Private DNS Zones with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Private DNS, DNS Zones, Private Endpoint, VNet, Infrastructure as Code

Description: Learn how to configure Azure Private DNS Zones with OpenTofu for internal name resolution within VNets, including integration with private endpoints and auto-registration.

## Introduction

Azure Private DNS Zones provide DNS resolution within Azure VNets without requiring custom DNS infrastructure. They are essential for Private Endpoint name resolution-when you create a Private Endpoint for a service like Azure Storage or SQL, the service's public DNS name must resolve to the private IP instead of the public IP from within the VNet. Private DNS Zones can also enable automatic VM hostname registration and split-horizon DNS scenarios.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- One or more VNets to associate

## Step 1: Create Private DNS Zone

```hcl
resource "azurerm_private_dns_zone" "main" {
  name                = "${var.project_name}.internal"
  resource_group_name = var.resource_group_name

  tags = {
    Name = "${var.project_name}-private-dns"
  }
}

# Link zone to VNet for resolution

resource "azurerm_private_dns_zone_virtual_network_link" "main" {
  name                  = "${var.project_name}-vnet-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.main.name
  virtual_network_id    = var.vnet_id

  # Auto-register VM hostnames in this DNS zone
  registration_enabled = true

  tags = {
    Name = "${var.project_name}-dns-vnet-link"
  }
}
```

## Step 2: Add DNS Records

```hcl
# A record for internal service
resource "azurerm_private_dns_a_record" "api" {
  name                = "api"
  zone_name           = azurerm_private_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = ["10.0.1.10"]
}

# CNAME for database
resource "azurerm_private_dns_cname_record" "db" {
  name                = "db"
  zone_name           = azurerm_private_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 60
  record              = var.sql_server_fqdn
}

# SRV record for service discovery
resource "azurerm_private_dns_srv_record" "app_service" {
  name                = "_https._tcp.app"
  zone_name           = azurerm_private_dns_zone.main.name
  resource_group_name = var.resource_group_name
  ttl                 = 300

  record {
    priority = 1
    weight   = 10
    port     = 443
    target   = "api.${azurerm_private_dns_zone.main.name}"
  }
}
```

## Step 3: Private DNS for Azure Services (Private Endpoints)

```hcl
# Recommended Private DNS zones for selected Azure services
locals {
  private_dns_zones = {
    "blob"  = "privatelink.blob.core.windows.net"
    "sql"   = "privatelink.database.windows.net"
    "vault" = "privatelink.vaultcore.azure.net"
    "acr"   = "privatelink.azurecr.io"
  }
}

resource "azurerm_private_dns_zone" "services" {
  for_each            = local.private_dns_zones
  name                = each.value
  resource_group_name = var.resource_group_name

  tags = {
    Name    = "${each.key}-private-dns"
    Service = each.key
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "services" {
  for_each = local.private_dns_zones

  name                  = "${each.key}-vnet-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.services[each.key].name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false  # No auto-registration for service zones
}

# Private Endpoint DNS integration
resource "azurerm_private_endpoint" "storage" {
  name                = "${var.project_name}-storage-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "storage-connection"
    private_connection_resource_id = var.storage_account_id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  # Associate the private endpoint with the private DNS zone
  private_dns_zone_group {
    name = "blob-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.services["blob"].id]
  }
}
```

## Step 4: Link to Multiple VNets

```hcl
variable "vnet_ids" {
  description = "Map of VNet name to VNet ID"
  type        = map(string)
}

resource "azurerm_private_dns_zone_virtual_network_link" "multi_vnet" {
  for_each = var.vnet_ids

  name                  = "${each.key}-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.main.name
  virtual_network_id    = each.value
  registration_enabled  = false  # Set to true only if this VNet should auto-register and is not already linked to another registration-enabled private zone
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify DNS resolution from within the VNet
nslookup api.myproject.internal
nslookup <storage-account>.blob.core.windows.net

# List all records in a zone
az network private-dns record-set list \
  --resource-group <rg> \
  --zone-name <zone-name> \
  --output table
```

## Conclusion

A virtual network can be linked to only one Private DNS Zone with `registration_enabled = true`, but a Private DNS Zone can have multiple registration-enabled VNet links. Linked VNets with `registration_enabled = false` can still resolve names but won't auto-register VM records. When you use Private DNS Zones with Azure Private Endpoints, use the recommended zone name for that service and subresource (for example, `privatelink.blob.core.windows.net` for Blob Storage in Azure public cloud). Use `private_dns_zone_group` on Private Endpoints to let Azure manage the private DNS A records when the endpoint is created or deleted, rather than managing records manually.
